import { createHash } from 'crypto';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export interface HikvisionConfig {
  host: string;
  porta: number;
  usuario: string;
  senha: string;
}

/**
 * Cliente para a ISAPI da Hikvision (terminais K1T342MWX).
 *
 * Implementa Digest Auth manualmente: a maioria das bibliotecas Node não faz
 * Digest out-of-the-box com multipart, então gerenciamos o ciclo 401→reenvio.
 *
 * employeeNo: identificador único do morador no terminal (max 32 chars).
 * Usamos os primeiros 32 chars do cuid do morador (já são alfanuméricos).
 */
export class HikvisionIsapiClient {
  private readonly base: string;
  private readonly usuario: string;
  private readonly senha: string;
  private readonly http: AxiosInstance;

  constructor(cfg: HikvisionConfig) {
    this.base = `http://${cfg.host}:${cfg.porta}`;
    this.usuario = cfg.usuario;
    this.senha = cfg.senha;
    this.http = axios.create({ baseURL: this.base, timeout: 10_000 });
  }

  // ──────────────────────────────────────────────────────────
  // API pública
  // ──────────────────────────────────────────────────────────

  async ping(): Promise<void> {
    await this.digestRequest('GET', '/ISAPI/System/deviceInfo');
  }

  async upsertUsuario(employeeNo: string, nome: string): Promise<void> {
    // Tenta criar; se já existe (statusCode 1 = duplicado) atualiza.
    const body = buildUserPayload(employeeNo, nome);
    const res = await this.digestRequest('POST', '/ISAPI/AccessControl/UserInfo/Record?format=json', {
      data: body,
      headers: { 'Content-Type': 'application/json' },
    });

    if (isHikvisionError(res, 1)) {
      // Duplicado → atualiza
      await this.digestRequest('PUT', '/ISAPI/AccessControl/UserInfo/Modify?format=json', {
        data: body,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  async enviarFoto(employeeNo: string, jpgBuffer: Buffer): Promise<void> {
    const url = `/ISAPI/Intelligent/FDLib/FDSetUp?format=json&FDID=1&FPID=${employeeNo}`;
    const faceData = JSON.stringify({
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: employeeNo,
    });

    const form = new FormData();
    form.append('FaceDataRecord', faceData, { contentType: 'application/json' });
    form.append('img', jpgBuffer, { filename: `${employeeNo}.jpg`, contentType: 'image/jpeg' });

    await this.digestRequest('POST', url, {
      data: form.getBuffer(),
      headers: form.getHeaders(),
    });
  }

  async removerUsuario(employeeNo: string): Promise<void> {
    const body = JSON.stringify({
      UserInfoDelCond: { EmployeeNoList: [{ employeeNo }] },
    });
    await this.digestRequest('POST', '/ISAPI/AccessControl/UserInfo/Delete?format=json', {
      data: body,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ──────────────────────────────────────────────────────────
  // Digest Auth
  // ──────────────────────────────────────────────────────────

  /**
   * Executa um request com Digest Auth.
   * Ciclo: primeira requisição sem auth → 401 com WWW-Authenticate →
   * segunda requisição com header Authorization calculado.
   */
  private async digestRequest(
    method: string,
    path: string,
    options: { data?: any; headers?: Record<string, string> } = {},
  ): Promise<any> {
    // 1ª tentativa — sem auth (espera 401)
    let wwwAuth: string | undefined;
    try {
      const res = await this.http.request({
        method,
        url: path,
        data: options.data,
        headers: options.headers,
        validateStatus: (s) => s < 500,
      });
      if (res.status !== 401) return res.data;
      wwwAuth = res.headers['www-authenticate'] as string | undefined;
    } catch (e: any) {
      if (e?.response?.status === 401) {
        wwwAuth = e.response.headers['www-authenticate'];
      } else {
        throw new HikvisionError(`Falha de rede: ${e?.message}`, e?.response?.status);
      }
    }

    if (!wwwAuth) throw new HikvisionError('Terminal não retornou WWW-Authenticate', 401);

    const authHeader = buildDigestHeader(method, path, this.usuario, this.senha, wwwAuth);

    // 2ª tentativa — com Digest
    const res2 = await this.http.request({
      method,
      url: path,
      data: options.data,
      headers: { ...options.headers, Authorization: authHeader },
      validateStatus: (s) => s < 500,
    });

    if (res2.status >= 400) {
      throw new HikvisionError(
        `ISAPI ${method} ${path} → ${res2.status}: ${JSON.stringify(res2.data)}`,
        res2.status,
      );
    }
    return res2.data;
  }
}

// ──────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────

function buildUserPayload(employeeNo: string, nome: string) {
  return JSON.stringify({
    UserInfo: {
      employeeNo,
      name: nome.slice(0, 32),
      userType: 'normal',
      Valid: { enable: true, beginTime: '2000-01-01T00:00:00', endTime: '2037-12-31T23:59:59' },
      doorRight: '1',
      RightPlan: [{ doorNo: 1, planTemplateNo: '1' }],
    },
  });
}

function md5(s: string): string {
  return createHash('md5').update(s).digest('hex');
}

function buildDigestHeader(
  method: string,
  uri: string,
  user: string,
  pass: string,
  wwwAuth: string,
): string {
  const realm = extract(wwwAuth, 'realm');
  const nonce = extract(wwwAuth, 'nonce');
  const qop   = extract(wwwAuth, 'qop');
  const opaque = extract(wwwAuth, 'opaque');
  const nc     = '00000001';
  const cnonce = Math.random().toString(36).slice(2, 10);

  const ha1 = md5(`${user}:${realm}:${pass}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  let header = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop)    header += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  if (opaque) header += `, opaque="${opaque}"`;
  return header;
}

function extract(header: string, key: string): string {
  const m = header.match(new RegExp(`${key}="?([^",]+)"?`));
  return m?.[1] ?? '';
}

function isHikvisionError(body: any, statusCode: number): boolean {
  return body?.statusCode === statusCode || body?.StatusCode === statusCode;
}

export class HikvisionError extends Error {
  constructor(msg: string, public readonly httpStatus?: number) {
    super(msg);
    this.name = 'HikvisionError';
  }
}

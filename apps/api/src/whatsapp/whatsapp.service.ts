import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';

export type WhatsAppSendResult =
  | { ok: true }
  | { ok: false; error: string };

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]; // 5s, 30s, 2min

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('EVOLUTION_API_URL');
    this.apiKey = this.config.getOrThrow<string>('EVOLUTION_API_KEY');
    this.instance = this.config.getOrThrow<string>('EVOLUTION_INSTANCE');
  }

  /**
   * Envia mensagem de texto em background (fire-and-forget).
   * Chama o callback onSuccess / onFailure após até 3 tentativas.
   */
  sendAsync(
    to: string,
    text: string,
    callbacks?: {
      onSuccess?: () => Promise<void>;
      onFailure?: (error: string) => Promise<void>;
    },
  ): void {
    // dispara sem bloquear a resposta HTTP
    this.sendWithRetry(to, text, 0, callbacks).catch((err) => {
      this.logger.error(`sendWithRetry não tratado: ${(err as Error).message}`);
    });
  }

  get instanceName() { return this.instance; }

  /** Verifica se a instância do WhatsApp está conectada. */
  async status(): Promise<{ connected: boolean; state?: string; instance: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl}/instance/connectionState/${this.instance}`,
        { headers: { apikey: this.apiKey } },
      );
      if (!res.ok) {
        this.logger.warn(`status: HTTP ${res.status}`);
        return { connected: false, state: `http_${res.status}`, instance: this.instance };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;
      // v2: { instance: { instanceName, state } }
      // v1: { instance: { state } }
      const state: string = data?.instance?.state ?? data?.state ?? 'unknown';
      this.logger.debug(`status: state=${state}`);
      return { connected: state === 'open', state, instance: this.instance };
    } catch (e) {
      return { connected: false, state: String(e), instance: this.instance };
    }
  }

  /** Verifica se a instância já existe no Evolution. */
  private async instanceExists(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/instance/fetchInstances`, {
        headers: { apikey: this.apiKey },
      });
      if (!res.ok) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (await res.json()) as any;
      // v2 retorna array de instâncias
      const list: any[] = Array.isArray(data) ? data : (data?.instances ?? []);
      return list.some(
        (i: any) =>
          i?.instance?.instanceName === this.instance ||
          i?.instanceName === this.instance ||
          i?.name === this.instance,
      );
    } catch {
      return false;
    }
  }

  /** Cria a instância se não existir e retorna o QR code da criação (se disponível). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async createInstanceIfNeeded(): Promise<any | null> {
    const exists = await this.instanceExists();
    if (exists) return null; // já existe, não precisa criar

    this.logger.log(`Instância "${this.instance}" não existe — criando no Evolution...`);
    try {
      const res = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          instanceName: this.instance,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });
      const rawBody = await res.text();
      this.logger.debug(`createInstance HTTP ${res.status}: ${rawBody.slice(0, 300)}`);
      if (!res.ok) {
        this.logger.warn(`createInstance falhou: ${rawBody.slice(0, 200)}`);
        return null;
      }
      return JSON.parse(rawBody);
    } catch (e) {
      this.logger.error(`createInstance erro: ${String(e)}`);
      return null;
    }
  }

  /** Extrai QR code (base64 ou code string) de uma resposta da Evolution. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async extractQr(data: any): Promise<string | null> {
    const base64: string | undefined = data?.qrcode?.base64 ?? data?.base64;
    const code: string | undefined = data?.qrcode?.code ?? data?.code;
    if (base64) {
      return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    }
    if (code) {
      return QRCode.toDataURL(code, { width: 300, margin: 2 });
    }
    return null;
  }

  /** Retorna QR code como data URL PNG para conexão da instância. */
  async getQrCode(): Promise<{ qrDataUrl: string } | null> {
    try {
      // 1. Garante que a instância existe (cria se necessário)
      const createResponse = await this.createInstanceIfNeeded();
      if (createResponse) {
        // A criação pode já retornar o QR code
        const qrFromCreate = await this.extractQr(createResponse);
        if (qrFromCreate) {
          this.logger.log('QR code obtido na criação da instância');
          return { qrDataUrl: qrFromCreate };
        }
      }

      // 2. Tenta obter o QR code via connect
      const url = `${this.baseUrl}/instance/connect/${this.instance}`;
      const res = await fetch(url, { headers: { apikey: this.apiKey } });

      let rawBody = '';
      try { rawBody = await res.text(); } catch { rawBody = '<unreadable>'; }
      this.logger.debug(`getQrCode HTTP ${res.status}: ${rawBody.slice(0, 300)}`);

      if (!res.ok) {
        this.logger.warn(`getQrCode connect falhou: HTTP ${res.status} → ${rawBody.slice(0, 200)}`);
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try { data = JSON.parse(rawBody); } catch { return null; }

      const qrDataUrl = await this.extractQr(data);
      if (!qrDataUrl) {
        this.logger.warn(`getQrCode: resposta sem base64 ou code: ${rawBody.slice(0, 200)}`);
      }
      return qrDataUrl ? { qrDataUrl } : null;

    } catch (e) {
      this.logger.error(`getQrCode erro inesperado: ${String(e)}`);
      return null;
    }
  }

  /** Desconecta a instância do WhatsApp. */
  async disconnect(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/instance/logout/${this.instance}`, {
        method: 'DELETE',
        headers: { apikey: this.apiKey },
      });
    } catch (e) {
      this.logger.warn(`disconnect: ${(e as Error).message}`);
    }
  }

  // ===== Internos =====

  private async sendWithRetry(
    to: string,
    text: string,
    attempt: number,
    callbacks?: {
      onSuccess?: () => Promise<void>;
      onFailure?: (error: string) => Promise<void>;
    },
  ): Promise<void> {
    const result = await this.trySend(to, text);

    if (result.ok) {
      this.logger.log(`WhatsApp enviado para ${to}`);
      if (callbacks?.onSuccess) {
        await callbacks.onSuccess().catch((e) =>
          this.logger.error(`onSuccess falhou: ${(e as Error).message}`),
        );
      }
      return;
    }

    const nextAttempt = attempt + 1;
    if (nextAttempt < RETRY_DELAYS_MS.length + 1) {
      const delay = RETRY_DELAYS_MS[attempt] ?? 120_000;
      this.logger.warn(
        `WhatsApp falhou (tentativa ${nextAttempt}/${RETRY_DELAYS_MS.length + 1}) ` +
        `para ${to}: ${result.error}. Retry em ${delay / 1000}s`,
      );
      setTimeout(() => {
        this.sendWithRetry(to, text, nextAttempt, callbacks).catch(() => null);
      }, delay);
      return;
    }

    // Esgotou as tentativas
    this.logger.error(`WhatsApp falhou definitivamente para ${to}: ${result.error}`);
    if (callbacks?.onFailure) {
      await callbacks.onFailure(result.error).catch((e) =>
        this.logger.error(`onFailure falhou: ${(e as Error).message}`),
      );
    }
  }

  private async trySend(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({ number: to, text }),
        },
      );

      if (res.ok) return { ok: true };

      let errMsg = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        errMsg += `: ${body?.message ?? JSON.stringify(body)}`;
      } catch {
        // corpo não é JSON
      }
      return { ok: false, error: errMsg };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}

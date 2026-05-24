import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface DriveUploadResult {
  driveId: string;
  webContentLink: string | null;
  webViewLink: string | null;
}

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);
  private drive!: drive_v3.Drive;
  private rootFolderId!: string;
  private folderCache = new Map<string, string>(); // path -> folderId

  constructor(private readonly config: ConfigService) {
    this.rootFolderId = this.config.getOrThrow<string>('GDRIVE_ROOT_FOLDER_ID');

    // Suporte a OAuth2 (conta pessoal) OU Service Account (Google Workspace)
    // Prioridade: OAuth2 > Service Account
    const clientId = this.config.get<string>('GDRIVE_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('GDRIVE_OAUTH_CLIENT_SECRET');
    const refreshToken = this.config.get<string>('GDRIVE_OAUTH_REFRESH_TOKEN');

    if (clientId && clientSecret && refreshToken) {
      // OAuth2 — usa a cota do Drive do usuário real (conta pessoal Gmail)
      this.logger.log('DriveService: detectadas variáveis GDRIVE_OAUTH_*, usando OAuth2');
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      this.drive = google.drive({ version: 'v3', auth: oauth2 });
      this.logger.log('DriveService: autenticação OAuth2 configurada com sucesso');
    } else {
      // Service Account — requer Google Workspace (Shared Drive)
      this.logger.log('DriveService: variáveis OAuth2 não encontradas, tentando Service Account');
      const saFile = this.config.getOrThrow<string>('GDRIVE_SA_FILE');
      const auth = new google.auth.GoogleAuth({
        keyFile: saFile,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      this.drive = google.drive({ version: 'v3', auth });
      this.logger.log('DriveService: usando Service Account');
    }
  }

  // ===== API pública =====

  async uploadOrUpdate(args: {
    relativePath: string; // ex: "Fotos/101"
    filename: string;     // ex: "AP101_Joao.jpg"
    mimeType: string;
    buffer: Buffer;
    existingDriveId?: string | null;
  }): Promise<DriveUploadResult> {
    try {
      const parentId = await this.ensureFolder(args.relativePath);
      const media = {
        mimeType: args.mimeType,
        body: Readable.from(args.buffer),
      };

      if (args.existingDriveId) {
        const res = await this.drive.files.update({
          fileId: args.existingDriveId,
          media,
          requestBody: { name: args.filename },
          fields: 'id, webContentLink, webViewLink',
        });
        return this.toResult(res.data);
      }

      // Procura por nome no destino (caso já exista mas sem id armazenado)
      const existing = await this.drive.files.list({
        q: `'${parentId}' in parents and name='${escapeQ(args.filename)}' and trashed=false`,
        fields: 'files(id)',
        pageSize: 1,
      });
      if (existing.data.files && existing.data.files.length > 0) {
        const fileId = existing.data.files[0].id!;
        const res = await this.drive.files.update({
          fileId,
          media,
          fields: 'id, webContentLink, webViewLink',
        });
        return this.toResult(res.data);
      }

      const created = await this.drive.files.create({
        requestBody: {
          name: args.filename,
          parents: [parentId],
        },
        media,
        fields: 'id, webContentLink, webViewLink',
      });
      return this.toResult(created.data);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: number; errors?: unknown[]; response?: { data?: unknown } };
      this.logger.error(
        `upload Drive falhou: ${err?.message ?? String(e)} | code=${err?.code ?? '-'} | ` +
        `responseData=${JSON.stringify(err?.response?.data ?? err?.errors ?? null)}`,
      );
      throw new InternalServerErrorException('Falha ao enviar arquivo ao Drive');
    }
  }

  async download(driveId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const meta = await this.drive.files.get({
      fileId: driveId,
      fields: 'mimeType',
    });
    const res = await this.drive.files.get(
      { fileId: driveId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );
    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: meta.data.mimeType ?? 'application/octet-stream',
    };
  }

  /** Verifica conectividade: lista 1 arquivo na pasta raiz. */
  async ping(): Promise<void> {
    await this.drive.files.list({
      q: `'${this.rootFolderId}' in parents and trashed=false`,
      pageSize: 1,
      fields: 'files(id)',
    });
  }

  async trash(driveId: string): Promise<void> {
    try {
      await this.drive.files.update({
        fileId: driveId,
        requestBody: { trashed: true },
      });
    } catch (e) {
      this.logger.warn(`falha ao mover para lixeira ${driveId}: ${(e as Error).message}`);
    }
  }

  // ===== Internos =====

  private async ensureFolder(relativePath: string): Promise<string> {
    const segments = relativePath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    let parentId = this.rootFolderId;
    let pathAcc = '';
    for (const seg of segments) {
      pathAcc = pathAcc ? `${pathAcc}/${seg}` : seg;
      const cached = this.folderCache.get(pathAcc);
      if (cached) {
        parentId = cached;
        continue;
      }
      const found = await this.drive.files.list({
        q: `'${parentId}' in parents and name='${escapeQ(seg)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        pageSize: 1,
      });
      if (found.data.files && found.data.files.length > 0) {
        parentId = found.data.files[0].id!;
      } else {
        const created = await this.drive.files.create({
          requestBody: {
            name: seg,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          },
          fields: 'id',
        });
        parentId = created.data.id!;
      }
      this.folderCache.set(pathAcc, parentId);
    }
    return parentId;
  }

  private toResult(data: drive_v3.Schema$File): DriveUploadResult {
    return {
      driveId: data.id!,
      webContentLink: data.webContentLink ?? null,
      webViewLink: data.webViewLink ?? null,
    };
  }
}

function escapeQ(s: string): string {
  return s.replace(/'/g, "\\'");
}

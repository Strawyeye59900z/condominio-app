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
    const saFile = this.config.getOrThrow<string>('GDRIVE_SA_FILE');
    this.rootFolderId = this.config.getOrThrow<string>('GDRIVE_ROOT_FOLDER_ID');
    const auth = new google.auth.GoogleAuth({
      keyFile: saFile,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
  }

  // ===== API pública =====

  async uploadOrUpdate(args: {
    relativePath: string; // ex: "Fotos/101"
    filename: string; // ex: "AP101_Joao.jpg"
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
        // update mantém o id
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
    } catch (e) {
      this.logger.error(`upload Drive falhou: ${(e as Error).message}`);
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

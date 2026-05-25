import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as mime from 'mime-types';

const BASE_DIR = process.env.UPLOADS_DIR ?? '/app/uploads';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  // ===== API pública (mantém nomes para compatibilidade com módulos existentes) =====

  async saveFile(relativePath: string, buffer: Buffer): Promise<void> {
    const fullPath = path.join(BASE_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    this.logger.debug(`Arquivo salvo: ${fullPath}`);
  }

  async readFile(relativePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const fullPath = path.join(BASE_DIR, relativePath);
    try {
      const buffer = await fs.readFile(fullPath);
      const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
      return { buffer, mimeType };
    } catch {
      throw new NotFoundException(`Arquivo não encontrado: ${relativePath}`);
    }
  }

  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(BASE_DIR, relativePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      this.logger.warn(`Arquivo não encontrado ao tentar apagar: ${fullPath}`);
    }
  }

  async ping(): Promise<void> {
    try {
      await fs.mkdir(BASE_DIR, { recursive: true });
      const testFile = path.join(BASE_DIR, '.ping');
      await fs.writeFile(testFile, 'ok');
      await fs.unlink(testFile);
    } catch (e) {
      throw new InternalServerErrorException(`Storage inacessível: ${(e as Error).message}`);
    }
  }
}

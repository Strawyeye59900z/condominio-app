import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { StatusFacial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { REGRAS } from '../common/regras';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class FotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drive: DriveService,
  ) {}

  // ===== Upload de foto do morador =====
  async uploadMorador(args: {
    apartamentoId: string;
    moradorId: string;
    fileBuffer: Buffer;
    mimeType: string;
  }) {
    this.validateFile(args.fileBuffer, args.mimeType);

    const morador = await this.prisma.morador.findUnique({
      where: { id: args.moradorId },
      include: { apartamento: { select: { numero: true } } },
    });
    if (!morador || morador.apartamentoId !== args.apartamentoId) {
      throw new NotFoundException('Morador não encontrado neste AP');
    }
    if (morador.statusFacial === StatusFacial.REGISTRADO) {
      throw new ForbiddenException(
        'Foto já registrada na leitora física. Solicite ao síndico para liberar nova foto.',
      );
    }
    if (!morador.consentLgpdAt) {
      throw new ForbiddenException(
        'Termo LGPD não aceito. Aceite em /me/consent-lgpd antes de enviar a foto.',
      );
    }

    const ext = mimeToExt(args.mimeType);
    const nome = normalizeName(morador.nome);
    const filename = `AP${morador.apartamento.numero}_${nome}.${ext}`;
    const relativePath = `Fotos/${morador.apartamento.numero}`;

    const uploaded = await this.drive.uploadOrUpdate({
      relativePath,
      filename,
      mimeType: args.mimeType,
      buffer: args.fileBuffer,
      existingDriveId: morador.fotoDriveId,
    });

    const updated = await this.prisma.morador.update({
      where: { id: morador.id },
      data: {
        fotoUrl: uploaded.webViewLink ?? uploaded.webContentLink ?? null,
        fotoDriveId: uploaded.driveId,
        // statusFacial permanece PENDENTE; vira REGISTRADO só pelo síndico
      },
      select: {
        id: true,
        fotoUrl: true,
        statusFacial: true,
      },
    });

    return { ...updated, driveId: uploaded.driveId };
  }

  // ===== Upload de foto do funcionário (no 1º login) =====
  async uploadFuncionario(args: {
    funcionarioId: string;
    fileBuffer: Buffer;
    mimeType: string;
  }) {
    this.validateFile(args.fileBuffer, args.mimeType);

    const f = await this.prisma.funcionario.findUnique({
      where: { id: args.funcionarioId },
    });
    if (!f) throw new NotFoundException('Funcionário não encontrado');

    const ext = mimeToExt(args.mimeType);
    const nome = normalizeName(f.nome);
    const filename = `FUNC_${f.loginId}_${nome}.${ext}`;
    const relativePath = `Fotos/_funcionarios`;

    const uploaded = await this.drive.uploadOrUpdate({
      relativePath,
      filename,
      mimeType: args.mimeType,
      buffer: args.fileBuffer,
      existingDriveId: f.fotoUrl ? null : null, // sem driveId armazenado p/ funcionário; sempre re-upload
    });

    await this.prisma.funcionario.update({
      where: { id: f.id },
      data: { fotoUrl: uploaded.webViewLink ?? uploaded.webContentLink ?? null },
    });

    return { id: f.id, fotoUrl: uploaded.webViewLink ?? uploaded.webContentLink ?? null };
  }

  // ===== Validação =====
  private validateFile(buffer: Buffer, mimeType: string) {
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new UnsupportedMediaTypeException(
        `Tipo de imagem não suportado: ${mimeType}. Use jpeg, png ou webp.`,
      );
    }
    if (buffer.length === 0) {
      throw new BadRequestException('Arquivo vazio');
    }
    if (buffer.length > REGRAS.fotoMaxBytes) {
      throw new PayloadTooLargeException(
        `Arquivo acima de ${REGRAS.fotoMaxBytes} bytes (${(REGRAS.fotoMaxBytes / 1024).toFixed(0)} KB)`,
      );
    }
  }
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function normalizeName(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'sem-nome';
}

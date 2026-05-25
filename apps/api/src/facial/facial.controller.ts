import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { StatusFacial } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';

@Roles('admin')
@Controller('admin/facial-queue')
export class FacialController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DriveService,
  ) {}

  // Próximo da fila (PENDENTE + tem foto)
  @Get('next')
  async next(@Res({ passthrough: true }) res: Response) {
    const m = await this.prisma.morador.findFirst({
      where: {
        statusFacial: StatusFacial.PENDENTE,
        fotoUrl: { not: null },
        ativo: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nome: true,
        telefone: true,
        fotoUrl: true,
        createdAt: true,
        apartamento: { select: { id: true, numero: true } },
      },
    });
    if (!m) {
      res.status(HttpStatus.NO_CONTENT);
      return;
    }
    return {
      morador: {
        id: m.id,
        nome: m.nome,
        telefone: m.telefone,
        createdAt: m.createdAt,
      },
      apartamento: m.apartamento,
      fotoProxyUrl: `/api/v1/admin/facial-queue/${m.id}/foto`,
      fotoDownloadUrl: `/api/v1/admin/facial-queue/${m.id}/foto-download`,
    };
  }

  // Stream da imagem (proxy autenticado)
  @Get(':id/foto')
  async foto(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const m = await this.prisma.morador.findUnique({
      where: { id },
      select: { fotoUrl: true },
    });
    if (!m?.fotoUrl) throw new NotFoundException('Foto não encontrada');

    const { buffer, mimeType } = await this.storage.readFile(m.fotoUrl);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  }

  // Download forçado com filename padronizado
  @Get(':id/foto-download')
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const m = await this.prisma.morador.findUnique({
      where: { id },
      include: { apartamento: { select: { numero: true } } },
    });
    if (!m?.fotoUrl) throw new NotFoundException('Foto não encontrada');

    const { buffer, mimeType } = await this.storage.readFile(m.fotoUrl);
    const ext = mimeType.split('/')[1] || 'jpg';
    const safe = m.nome.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
    const filename = `AP${m.apartamento.numero}_${safe}.${ext}`;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // Marca como REGISTRADO
  @Post(':id/registrado')
  @HttpCode(HttpStatus.NO_CONTENT)
  async marcar(@Param('id') id: string): Promise<void> {
    const m = await this.prisma.morador.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    await this.prisma.morador.update({
      where: { id },
      data: { statusFacial: StatusFacial.REGISTRADO },
    });
  }
}

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
import { FacialSyncService } from './facial-sync.service';

@Roles('admin')
@Controller('admin/facial-queue')
export class FacialController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DriveService,
    private readonly facialSync: FacialSyncService,
  ) {}

  // Próximo da fila (PENDENTE ou REGISTRADO_PARCIAL + tem foto)
  @Get('next')
  async next(@Res({ passthrough: true }) res: Response) {
    const m = await this.prisma.morador.findFirst({
      where: {
        statusFacial: { in: [StatusFacial.PENDENTE, StatusFacial.REGISTRADO_PARCIAL] },
        fotoUrl: { not: null },
        ativo: true,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nome: true,
        telefone: true,
        fotoUrl: true,
        statusFacial: true,
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
        statusFacial: m.statusFacial,
        createdAt: m.createdAt,
      },
      apartamento: m.apartamento,
      fotoProxyUrl: `/api/v1/admin/facial-queue/${m.id}/foto`,
      fotoDownloadUrl: `/api/v1/admin/facial-queue/${m.id}/foto-download`,
    };
  }

  // Status de sincronização por terminal de um morador
  @Get(':id/sync-status')
  async syncStatus(@Param('id') id: string) {
    const m = await this.prisma.morador.findUnique({
      where: { id },
      select: { id: true, nome: true, statusFacial: true },
    });
    if (!m) throw new NotFoundException('Morador não encontrado');

    const syncs = await this.prisma.facialSync.findMany({
      where: { moradorId: id },
      include: { terminal: { select: { id: true, nome: true, host: true } } },
      orderBy: { terminal: { nome: 'asc' } },
    });

    return {
      moradorId: m.id,
      nome: m.nome,
      statusFacial: m.statusFacial,
      terminais: syncs.map((s) => ({
        terminalId: s.terminalId,
        terminalNome: s.terminal.nome,
        terminalHost: s.terminal.host,
        status: s.status,
        tentativas: s.tentativas,
        ultimoErro: s.ultimoErro,
        atualizadoEm: s.atualizadoEm,
      })),
    };
  }

  // Reenviar manualmente para todos os terminais (ou reprocessar falhas)
  @Post(':id/reenviar')
  @HttpCode(HttpStatus.ACCEPTED)
  async reenviar(@Param('id') id: string) {
    const m = await this.prisma.morador.findUnique({
      where: { id },
      select: { id: true, fotoUrl: true },
    });
    if (!m) throw new NotFoundException('Morador não encontrado');
    if (!m.fotoUrl) throw new NotFoundException('Morador não possui foto');

    await this.facialSync.enfileirar(id);
    return { message: 'Reenvio enfileirado' };
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

  // Override manual: marca como REGISTRADO (emergência/bypass)
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

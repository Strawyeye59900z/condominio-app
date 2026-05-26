import { Injectable, Logger } from '@nestjs/common';
import { FacialSyncStatus, StatusFacial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { TerminaisService } from '../terminais/terminais.service';
import { HikvisionError } from '../hikvision/hikvision-isapi.client';

@Injectable()
export class FacialSyncService {
  private readonly logger = new Logger(FacialSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DriveService,
    private readonly terminais: TerminaisService,
  ) {}

  /**
   * Enfileira sincronização de um morador em todos os terminais ativos.
   * Cria ou reativa linhas em FacialSync (upsert).
   * Chamado quando a foto do morador é salva.
   */
  async enfileirar(moradorId: string): Promise<void> {
    const terminaisAtivos = await this.prisma.terminalFacial.findMany({
      where: { ativo: true },
      select: { id: true },
    });

    if (terminaisAtivos.length === 0) return;

    for (const t of terminaisAtivos) {
      await this.prisma.facialSync.upsert({
        where: { moradorId_terminalId: { moradorId, terminalId: t.id } },
        create: { moradorId, terminalId: t.id, status: FacialSyncStatus.PENDENTE, tentativas: 0 },
        update: { status: FacialSyncStatus.PENDENTE, tentativas: 0, ultimoErro: null },
      });
    }
  }

  /**
   * Enfileira remoção de um morador (foto resetada ou morador desativado).
   */
  async enfileirarRemocao(moradorId: string): Promise<void> {
    await this.prisma.facialSync.updateMany({
      where: { moradorId, status: { not: FacialSyncStatus.REMOVENDO } },
      data: { status: FacialSyncStatus.REMOVENDO, tentativas: 0, ultimoErro: null },
    });
  }

  /**
   * Quando um novo terminal é adicionado, sincroniza todos os moradores ativos com foto.
   */
  async sincronizarTerminalNovo(terminalId: string): Promise<void> {
    const moradores = await this.prisma.morador.findMany({
      where: { ativo: true, fotoUrl: { not: null } },
      select: { id: true },
    });

    for (const m of moradores) {
      await this.prisma.facialSync.upsert({
        where: { moradorId_terminalId: { moradorId: m.id, terminalId } },
        create: { moradorId: m.id, terminalId, status: FacialSyncStatus.PENDENTE, tentativas: 0 },
        update: { status: FacialSyncStatus.PENDENTE, tentativas: 0, ultimoErro: null },
      });
    }
  }

  /**
   * Processa um lote de syncs PENDENTE/FALHOU com até maxTentativas.
   * Chamado pelo processor a cada tick.
   */
  async processarPendentes(maxTentativas = 5): Promise<void> {
    const syncs = await this.prisma.facialSync.findMany({
      where: {
        status: { in: [FacialSyncStatus.PENDENTE, FacialSyncStatus.FALHOU] },
        tentativas: { lt: maxTentativas },
      },
      include: {
        morador: { select: { id: true, nome: true, fotoUrl: true, ativo: true } },
        terminal: { select: { id: true, ativo: true } },
      },
      take: 20,
    });

    for (const sync of syncs) {
      if (!sync.terminal.ativo || !sync.morador.ativo || !sync.morador.fotoUrl) {
        await this.prisma.facialSync.update({
          where: { id: sync.id },
          data: { status: FacialSyncStatus.FALHOU, ultimoErro: 'Terminal/morador inativo ou sem foto' },
        });
        continue;
      }

      await this.processarSync(sync);
    }
  }

  /**
   * Processa syncs em estado REMOVENDO.
   */
  async processarRemocoes(): Promise<void> {
    const syncs = await this.prisma.facialSync.findMany({
      where: { status: FacialSyncStatus.REMOVENDO, tentativas: { lt: 5 } },
      include: {
        morador: { select: { id: true } },
        terminal: { select: { id: true, ativo: true } },
      },
      take: 20,
    });

    for (const sync of syncs) {
      try {
        if (sync.terminal.ativo) {
          const client = await this.terminais.clientePara(sync.terminalId);
          const empNo = toEmployeeNo(sync.moradorId);
          await client.removerUsuario(empNo);
        }
        await this.prisma.facialSync.delete({ where: { id: sync.id } });
        this.logger.log(`Morador ${sync.moradorId} removido do terminal ${sync.terminalId}`);
      } catch (e: any) {
        await this.prisma.facialSync.update({
          where: { id: sync.id },
          data: { tentativas: { increment: 1 }, ultimoErro: e?.message },
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // Privado
  // ──────────────────────────────────────────────────────────

  private async processarSync(sync: any): Promise<void> {
    const empNo = toEmployeeNo(sync.moradorId);
    try {
      const client = await this.terminais.clientePara(sync.terminalId);

      // 1. Cadastrar / atualizar usuário
      await client.upsertUsuario(empNo, sync.morador.nome);

      // 2. Enviar foto
      const { buffer } = await this.storage.readFile(sync.morador.fotoUrl);
      const jpg = await toJpegBuffer(buffer);
      await client.enviarFoto(empNo, jpg);

      // 3. Marcar ENVIADO
      await this.prisma.facialSync.update({
        where: { id: sync.id },
        data: { status: FacialSyncStatus.ENVIADO, ultimoErro: null, tentativas: { increment: 1 } },
      });

      // Atualiza ultimoOk do terminal
      await this.prisma.terminalFacial.update({
        where: { id: sync.terminalId },
        data: { ultimoOk: new Date(), ultimoErr: null },
      });

      this.logger.log(`Morador ${sync.moradorId} sincronizado com terminal ${sync.terminalId}`);
    } catch (e: any) {
      const erro = e instanceof HikvisionError ? e.message : String(e?.message ?? e);
      await this.prisma.facialSync.update({
        where: { id: sync.id },
        data: {
          status: FacialSyncStatus.FALHOU,
          tentativas: { increment: 1 },
          ultimoErro: erro,
        },
      });
      await this.prisma.terminalFacial.update({
        where: { id: sync.terminalId },
        data: { ultimoErr: erro },
      }).catch(() => {});
      this.logger.warn(`Falha ao sincronizar morador ${sync.moradorId} → terminal ${sync.terminalId}: ${erro}`);
    }

    // Recalcula statusFacial do morador após cada sync
    await this.recalcularStatus(sync.moradorId);
  }

  /**
   * Recalcula Morador.statusFacial com base nos FacialSync ativos.
   * REGISTRADO: todos terminais ativos com ENVIADO
   * REGISTRADO_PARCIAL: pelo menos 1 ENVIADO, mas há outros pendentes/falhou
   * PENDENTE: nenhum enviado
   */
  async recalcularStatus(moradorId: string): Promise<void> {
    const terminaisAtivos = await this.prisma.terminalFacial.findMany({
      where: { ativo: true },
      select: { id: true },
    });
    if (terminaisAtivos.length === 0) return;

    const syncAtivos = await this.prisma.facialSync.findMany({
      where: { moradorId, terminalId: { in: terminaisAtivos.map((t) => t.id) } },
      select: { status: true },
    });

    const enviados = syncAtivos.filter((s) => s.status === FacialSyncStatus.ENVIADO).length;
    const total = terminaisAtivos.length;

    let novoStatus: StatusFacial;
    if (enviados === 0)       novoStatus = StatusFacial.PENDENTE;
    else if (enviados < total) novoStatus = StatusFacial.REGISTRADO_PARCIAL;
    else                       novoStatus = StatusFacial.REGISTRADO;

    await this.prisma.morador.update({
      where: { id: moradorId },
      data: { statusFacial: novoStatus },
    });
  }
}

// ──────────────────────────────────────────────────────────
// Utilidades
// ──────────────────────────────────────────────────────────

/** Converte morador.id (cuid) para employeeNo de até 32 chars alfanuméricos. */
export function toEmployeeNo(moradorId: string): string {
  return moradorId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

/**
 * Garante que o buffer é JPEG válido para o terminal Hikvision.
 * Se já for JPEG devolve como está; senão tenta usar sharp se disponível,
 * caso contrário lança erro informativo.
 */
async function toJpegBuffer(input: Buffer): Promise<Buffer> {
  // Detecta JPEG pelo magic number
  if (input[0] === 0xff && input[1] === 0xd8) return input;

  try {
    const sharp = await import('sharp');
    return sharp.default(input).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new Error(
      'Foto não é JPEG e o pacote "sharp" não está instalado. ' +
      'Instale com: npm install sharp  (em apps/api)',
    );
  }
}

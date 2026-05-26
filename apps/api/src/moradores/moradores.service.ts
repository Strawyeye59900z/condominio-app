import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, StatusFacial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FacialSyncService } from '../facial/facial-sync.service';
import {
  AdminUpdateMoradorDto,
  CreateMoradorDto,
  UpdateMoradorDto,
} from './dto/moradores.dto';

@Injectable()
export class MoradoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facialSync: FacialSyncService,
  ) {}

  // ===== Helpers =====
  async getAdminDoAp(apartamentoId: string) {
    return this.prisma.morador.findFirst({
      where: { apartamentoId, isAdminAp: true, ativo: true },
      select: { id: true, nome: true, telefone: true, fotoUrl: true, statusFacial: true },
    });
  }

  async listDoAp(apartamentoId: string) {
    return this.prisma.morador.findMany({
      where: { apartamentoId, ativo: true },
      orderBy: [{ isAdminAp: 'desc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        telefone: true,
        fotoUrl: true,
        statusFacial: true,
        isAdminAp: true,
        createdAt: true,
      },
    });
  }

  // ===== /me — operações dentro do próprio AP =====

  // Cria novo morador no AP. Se for o PRIMEIRO ativo, vira isAdminAp.
  async createNoAp(apartamentoId: string, dto: CreateMoradorDto) {
    return this.prisma.$transaction(async (tx) => {
      const ativos = await tx.morador.count({
        where: { apartamentoId, ativo: true },
      });
      return tx.morador.create({
        data: {
          apartamentoId,
          nome: dto.nome,
          telefone: dto.telefone,
          isAdminAp: ativos === 0,
        },
        select: {
          id: true,
          nome: true,
          telefone: true,
          isAdminAp: true,
        },
      });
    });
  }

  async updateNoAp(
    apartamentoId: string,
    moradorId: string,
    dto: UpdateMoradorDto,
    actorIsAdmin: boolean,
  ) {
    const m = await this.prisma.morador.findUnique({ where: { id: moradorId } });
    if (!m || m.apartamentoId !== apartamentoId) {
      throw new NotFoundException('Morador não encontrado neste AP');
    }
    // Apenas o admin do AP pode editar outros; cada morador pode editar seus próprios dados
    // — mas como não há login por morador individual (login é por AP), o controle é simplificado:
    // somente o admin do AP edita. O `actorIsAdmin` aqui é sempre true (validado no controller).
    if (!actorIsAdmin) throw new ForbiddenException();

    const data: Prisma.MoradorUpdateInput = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.telefone !== undefined) data.telefone = dto.telefone;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;

    // Não permite desativar o admin do AP se ele for o último ativo
    if (dto.ativo === false && m.isAdminAp) {
      const outrosAtivos = await this.prisma.morador.count({
        where: { apartamentoId, ativo: true, id: { not: moradorId } },
      });
      if (outrosAtivos === 0) {
        throw new ForbiddenException(
          'Não é possível desativar o último morador admin do AP. Cadastre outro morador antes.',
        );
      }
      // promove o próximo morador a admin
      const sucessor = await this.prisma.morador.findFirst({
        where: { apartamentoId, ativo: true, id: { not: moradorId } },
        orderBy: { createdAt: 'asc' },
      });
      if (sucessor) {
        await this.prisma.morador.update({
          where: { id: sucessor.id },
          data: { isAdminAp: true },
        });
        data.isAdminAp = false;
      }
    }

    return this.prisma.morador.update({
      where: { id: moradorId },
      data,
      select: { id: true, nome: true, telefone: true, ativo: true, isAdminAp: true },
    });
  }

  // ===== Admin (síndico) — visão global =====

  listAll(filters: { apartamentoId?: string; statusFacial?: StatusFacial } = {}) {
    return this.prisma.morador.findMany({
      where: {
        ...(filters.apartamentoId ? { apartamentoId: filters.apartamentoId } : {}),
        ...(filters.statusFacial ? { statusFacial: filters.statusFacial } : {}),
      },
      orderBy: [{ apartamento: { numero: 'asc' } }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        telefone: true,
        fotoUrl: true,
        statusFacial: true,
        isAdminAp: true,
        ativo: true,
        apartamento: { select: { id: true, numero: true } },
      },
    });
  }

  async resetSenhaAp(moradorId: string): Promise<{ novaSenha: string }> {
    const morador = await this.prisma.morador.findUnique({
      where: { id: moradorId },
      select: { apartamentoId: true },
    });
    if (!morador) throw new NotFoundException('Morador não encontrado');

    const novaSenha = Math.random().toString(36).slice(-8).toUpperCase();
    const hash = await bcrypt.hash(novaSenha, 10);
    await this.prisma.apartamento.update({
      where: { id: morador.apartamentoId },
      data: { passwordHash: hash, isProvisional: true },
    });
    return { novaSenha };
  }

  async adminUpdate(moradorId: string, dto: AdminUpdateMoradorDto) {
    const m = await this.prisma.morador.findUnique({ where: { id: moradorId } });
    if (!m) throw new NotFoundException('Morador não encontrado');

    const data: Prisma.MoradorUpdateInput = {};
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.resetFoto) {
      data.fotoUrl = null;
      data.statusFacial = StatusFacial.PENDENTE;
    }
    const updated = await this.prisma.morador.update({
      where: { id: moradorId },
      data,
      select: { id: true, ativo: true, statusFacial: true, fotoUrl: true },
    });

    // Enfileira remoção do terminal se morador desativado ou foto resetada
    if (dto.ativo === false || dto.resetFoto) {
      this.facialSync.enfileirarRemocao(moradorId).catch(() => {});
    }

    return updated;
  }
}

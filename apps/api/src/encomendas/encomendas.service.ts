import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StatusEncomenda, WhatsappStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { REGRAS } from '../common/regras';
import { CreateEncomendaDto, UpdateEncomendaDto } from './dto/encomendas.dto';

const TIPO_LABEL: Record<string, string> = {
  CAIXA: 'Caixa',
  ENVELOPE: 'Envelope',
  SACOLA: 'Sacola',
};

@Injectable()
export class EncomendasService {
  private readonly logger = new Logger(EncomendasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // ===== Porteiro: registrar encomenda =====
  async create(dto: CreateEncomendaDto, funcionarioId: string) {
    const morador = await this.prisma.morador.findUnique({
      where: { id: dto.moradorId },
      select: { id: true, apartamentoId: true, ativo: true, telefone: true, nome: true },
    });
    if (!morador || morador.apartamentoId !== dto.apartamentoId) {
      throw new NotFoundException('Morador não encontrado neste apartamento');
    }
    if (!morador.ativo) {
      throw new ForbiddenException('Morador está inativo');
    }

    const agora = new Date();
    const editavelAte = new Date(agora.getTime() + REGRAS.encomendaJanelaEditMin * 60 * 1000);

    const encomenda = await this.prisma.encomenda.create({
      data: {
        apartamentoId: dto.apartamentoId,
        moradorId: dto.moradorId,
        tipo: dto.tipo,
        recebidaPor: funcionarioId,
        editavelAte,
        whatsappStatus: WhatsappStatus.PENDENTE,
      },
      include: {
        morador: { select: { nome: true, telefone: true } },
        apartamento: { select: { numero: true } },
      },
    });

    // Dispara WhatsApp em background (fire-and-forget)
    const hora = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
    const tipoLabel = TIPO_LABEL[dto.tipo] ?? dto.tipo;
    const texto =
      `Olá, ${morador.nome}! 📦\n` +
      `Uma encomenda do tipo *${tipoLabel}* foi recebida na portaria às ${hora}.\n` +
      `Dirija-se à portaria para retirar. ✅`;

    const numero = morador.telefone.replace(/\D/g, ''); // remove o +

    this.whatsapp.sendAsync(numero, texto, {
      onSuccess: async () => {
        await this.prisma.encomenda.update({
          where: { id: encomenda.id },
          data: { whatsappStatus: WhatsappStatus.ENVIADA },
        });
      },
      onFailure: async (error) => {
        await this.prisma.encomenda.update({
          where: { id: encomenda.id },
          data: { whatsappStatus: WhatsappStatus.FALHOU, whatsappError: error },
        });
      },
    });

    return encomenda;
  }

  // ===== Porteiro: editar encomenda (dentro da janela) =====
  async update(id: string, dto: UpdateEncomendaDto, funcionarioId: string, isAdmin: boolean) {
    const encomenda = await this.prisma.encomenda.findUnique({
      where: { id },
      include: { morador: { select: { apartamentoId: true } } },
    });
    if (!encomenda) throw new NotFoundException('Encomenda não encontrada');
    if (encomenda.status !== StatusEncomenda.PENDENTE) {
      throw new ForbiddenException('Encomenda já foi retirada ou cancelada');
    }

    const agora = new Date();
    const dentroJanela = agora < encomenda.editavelAte;

    if (!dentroJanela && !isAdmin) {
      throw new ForbiddenException(
        `Janela de edição encerrada às ${encomenda.editavelAte.toISOString()}. Apenas o síndico pode editar após este prazo.`,
      );
    }

    if (dto.moradorId && dto.moradorId !== encomenda.moradorId) {
      const novoMorador = await this.prisma.morador.findUnique({
        where: { id: dto.moradorId },
        select: { apartamentoId: true, ativo: true },
      });
      if (!novoMorador || novoMorador.apartamentoId !== encomenda.apartamentoId) {
        throw new NotFoundException('Novo morador não pertence a este apartamento');
      }
      if (!novoMorador.ativo) {
        throw new ForbiddenException('Novo morador está inativo');
      }
    }

    return this.prisma.encomenda.update({
      where: { id },
      data: {
        ...(dto.moradorId ? { moradorId: dto.moradorId } : {}),
        ...(dto.tipo ? { tipo: dto.tipo } : {}),
      },
      include: {
        morador: { select: { nome: true, telefone: true } },
        apartamento: { select: { numero: true } },
      },
    });
  }

  // ===== Porteiro: listar encomendas =====
  listPorteiro(status?: string) {
    const where =
      status === 'todas' || !status
        ? {}
        : status === 'pendente'
        ? { status: StatusEncomenda.PENDENTE }
        : status === 'retirada'
        ? { status: StatusEncomenda.RETIRADA }
        : { status: StatusEncomenda.CANCELADA };

    return this.prisma.encomenda.findMany({
      where,
      orderBy: { recebidaEm: 'desc' },
      take: 100,
      include: {
        morador: { select: { nome: true, telefone: true } },
        apartamento: { select: { numero: true } },
      },
    });
  }

  // ===== Porteiro: lookup de apartamentos =====
  listApartamentos() {
    return this.prisma.apartamento.findMany({
      orderBy: { numero: 'asc' },
      select: {
        id: true,
        numero: true,
        moradores: {
          where: { ativo: true },
          select: { id: true, nome: true, telefone: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  // ===== Morador: listar suas encomendas =====
  listMorador(apartamentoId: string, status?: string) {
    const where: Record<string, unknown> = { apartamentoId };
    if (status === 'pendente') where.status = StatusEncomenda.PENDENTE;
    else if (status === 'retirada') where.status = StatusEncomenda.RETIRADA;

    return this.prisma.encomenda.findMany({
      where,
      orderBy: { recebidaEm: 'desc' },
      take: 50,
      select: {
        id: true,
        tipo: true,
        status: true,
        recebidaEm: true,
        retiradaEm: true,
        editavelAte: true,
        whatsappStatus: true,
        morador: { select: { id: true, nome: true } },
      },
    });
  }

  // ===== Morador: dar baixa (retirada) =====
  async baixa(id: string, apartamentoId: string, moradorId: string) {
    const encomenda = await this.prisma.encomenda.findUnique({ where: { id } });
    if (!encomenda) throw new NotFoundException('Encomenda não encontrada');
    if (encomenda.apartamentoId !== apartamentoId) {
      throw new ForbiddenException('Esta encomenda não pertence ao seu apartamento');
    }
    if (encomenda.status !== StatusEncomenda.PENDENTE) {
      throw new ForbiddenException('Encomenda já foi retirada ou cancelada');
    }

    // moradorId pode ser o ap.id quando não há moradorAdmin cadastrado;
    // nesse caso não gravamos retiradaPor para evitar FK inválida.
    const retiradaPor = moradorId !== apartamentoId ? moradorId : null;

    return this.prisma.encomenda.update({
      where: { id },
      data: {
        status: StatusEncomenda.RETIRADA,
        retiradaEm: new Date(),
        retiradaPor,
      },
      select: {
        id: true,
        status: true,
        retiradaEm: true,
      },
    });
  }
}

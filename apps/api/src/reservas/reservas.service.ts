import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Espaco, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { REGRAS } from '../common/regras';
import { CreateReservaDto } from './dto/reservas.dto';

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Criar reserva =====
  async create(dto: CreateReservaDto, apartamentoId: string, moradorId: string) {
    const data = parseDate(dto.data);
    validateFuture(data, dto.data);
    validateAnterioridade(data);

    if (dto.espaco === Espaco.QUADRA) {
      return this.criarQuadra(dto, data, apartamentoId, moradorId);
    }
    return this.criarDiario(dto, data, apartamentoId, moradorId);
  }

  private async criarQuadra(
    dto: CreateReservaDto,
    data: Date,
    apartamentoId: string,
    moradorId: string,
  ) {
    if (dto.horaInicio === undefined || dto.horaInicio === null) {
      throw new BadRequestException('horaInicio é obrigatório para QUADRA');
    }
    if (!dto.duracaoHoras) {
      throw new BadRequestException('duracaoHoras é obrigatório para QUADRA');
    }
    const horaFim = dto.horaInicio + dto.duracaoHoras;
    if (horaFim > REGRAS.quadraHoraMax + 1) {
      throw new BadRequestException(
        `Reserva ultrapassa o horário máximo (${REGRAS.quadraHoraMax}:00)`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Busca reservas ativas do dia na quadra (transação serializable garante lock)
        const reservasDia = await tx.reserva.findMany({
          where: {
            espaco: Espaco.QUADRA,
            data,
            canceladaEm: null,
          },
          select: {
            horaInicio: true,
            duracaoHoras: true,
            apartamentoId: true,
          },
        });

        // Verifica sobreposição
        for (const r of reservasDia) {
          const rFim = (r.horaInicio ?? 0) + (r.duracaoHoras ?? 0);
          const novoFim = dto.horaInicio! + dto.duracaoHoras!;
          const sobreposicao =
            dto.horaInicio! < rFim && novoFim > (r.horaInicio ?? 0);
          if (sobreposicao) {
            throw new ConflictException(
              `Horário ${dto.horaInicio}h–${novoFim}h já está reservado`,
            );
          }
        }

        // Verifica cota do AP (máx 4h/dia)
        const horasAp = reservasDia
          .filter((r) => r.apartamentoId === apartamentoId)
          .reduce((acc, r) => acc + (r.duracaoHoras ?? 0), 0);

        if (horasAp + dto.duracaoHoras! > REGRAS.quadraHorasMaxPorAp) {
          throw new ConflictException(
            `Cota de ${REGRAS.quadraHorasMaxPorAp}h/AP/dia atingida (${horasAp}h já reservadas)`,
          );
        }

        return tx.reserva.create({
          data: {
            apartamentoId,
            moradorId,
            espaco: Espaco.QUADRA,
            data,
            horaInicio: dto.horaInicio,
            duracaoHoras: dto.duracaoHoras,
          },
          include: {
            morador: { select: { nome: true } },
            apartamento: { select: { numero: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async criarDiario(
    dto: CreateReservaDto,
    data: Date,
    apartamentoId: string,
    moradorId: string,
  ) {
    if (dto.horaInicio !== undefined || dto.duracaoHoras !== undefined) {
      throw new BadRequestException(
        'horaInicio e duracaoHoras não se aplicam a CHURRASQUEIRA ou SALAO_FESTAS',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const existente = await tx.reserva.findFirst({
          where: { espaco: dto.espaco, data, canceladaEm: null },
          select: { id: true, apartamento: { select: { numero: true } } },
        });

        if (existente) {
          throw new ConflictException(
            `${dto.espaco} já reservado neste dia (AP ${existente.apartamento.numero})`,
          );
        }

        return tx.reserva.create({
          data: { apartamentoId, moradorId, espaco: dto.espaco, data },
          include: {
            morador: { select: { nome: true } },
            apartamento: { select: { numero: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // ===== Cancelar reserva =====
  async cancelar(id: string, canceladoPor: string, isAdmin: boolean) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id } });
    if (!reserva) throw new NotFoundException('Reserva não encontrada');
    if (reserva.canceladaEm) throw new ConflictException('Reserva já cancelada');

    const agora = new Date();

    if (!isAdmin) {
      if (reserva.espaco === Espaco.QUADRA) {
        // quadra: pode cancelar até o início do horário
        const inicioReserva = new Date(reserva.data);
        inicioReserva.setUTCHours(reserva.horaInicio ?? 0, 0, 0, 0);
        if (agora >= inicioReserva) {
          throw new ForbiddenException('Prazo de cancelamento da quadra encerrado (após início)');
        }
      } else {
        // churrasqueira/salão: até 24h antes (véspera)
        const limite = new Date(reserva.data);
        limite.setUTCHours(0, 0, 0, 0); // meia-noite do dia da reserva
        const horas = REGRAS.cancelamentoChurrasqueiraSalaoHorasAntes;
        const limiteReal = new Date(limite.getTime() - horas * 60 * 60 * 1000);
        if (agora >= limiteReal) {
          throw new ForbiddenException(
            `Cancelamento permitido até ${horas}h antes. Prazo encerrado.`,
          );
        }
      }
    }

    return this.prisma.reserva.update({
      where: { id },
      data: { canceladaEm: agora, canceladoPor },
      select: { id: true, canceladaEm: true, espaco: true },
    });
  }

  // ===== Listar reservas do morador =====
  listMorador(apartamentoId: string) {
    return this.prisma.reserva.findMany({
      where: { apartamentoId },
      orderBy: { data: 'desc' },
      take: 50,
      select: {
        id: true,
        espaco: true,
        data: true,
        horaInicio: true,
        duracaoHoras: true,
        criadaEm: true,
        canceladaEm: true,
        morador: { select: { nome: true } },
      },
    });
  }

  // ===== Disponibilidade =====
  async disponibilidade(espaco: Espaco, dataStr: string) {
    const data = parseDate(dataStr);

    if (espaco === Espaco.QUADRA) {
      const reservas = await this.prisma.reserva.findMany({
        where: { espaco: Espaco.QUADRA, data, canceladaEm: null },
        select: { horaInicio: true, duracaoHoras: true, apartamento: { select: { numero: true } } },
      });
      // Retorna os slots ocupados
      return {
        espaco,
        data: dataStr,
        slotsOcupados: reservas.map((r) => ({
          horaInicio: r.horaInicio,
          horaFim: (r.horaInicio ?? 0) + (r.duracaoHoras ?? 0),
          ap: r.apartamento.numero,
        })),
      };
    }

    // Churrasqueira / Salão
    const existente = await this.prisma.reserva.findFirst({
      where: { espaco, data, canceladaEm: null },
      select: { apartamento: { select: { numero: true } } },
    });
    return {
      espaco,
      data: dataStr,
      disponivel: !existente,
      reservadoPorAp: existente?.apartamento.numero ?? null,
    };
  }

  // ===== Admin: calendário =====
  listAdmin(inicio?: string, fim?: string) {
    const where: Prisma.ReservaWhereInput = { canceladaEm: null };
    if (inicio) where.data = { gte: parseDate(inicio) };
    if (fim) {
      const dataFim = parseDate(fim);
      where.data = {
        ...(where.data as object | undefined),
        lte: dataFim,
      };
    }
    return this.prisma.reserva.findMany({
      where,
      orderBy: [{ data: 'asc' }, { espaco: 'asc' }],
      include: {
        morador: { select: { nome: true, telefone: true } },
        apartamento: { select: { numero: true } },
      },
    });
  }
}

// ===== Helpers =====

function parseDate(dataStr: string): Date {
  const d = new Date(`${dataStr}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new BadRequestException(`Data inválida: ${dataStr}`);
  return d;
}

function validateFuture(data: Date, dataStr: string) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  if (data < hoje) {
    throw new BadRequestException(`Data ${dataStr} está no passado`);
  }
}

function validateAnterioridade(data: Date) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const limite = new Date(hoje.getTime() + REGRAS.reservaAntecedenciaDias * 24 * 60 * 60 * 1000);
  if (data > limite) {
    throw new BadRequestException(
      `Reserva máxima com ${REGRAS.reservaAntecedenciaDias} dias de antecedência`,
    );
  }
}

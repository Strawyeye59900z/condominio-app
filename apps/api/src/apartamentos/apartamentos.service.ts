import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { randomPassword } from '../common/random-password';
import {
  BulkApartamentosDto,
  CreateApartamentoDto,
} from './dto/apartamentos.dto';

interface BulkRow {
  numero: string;
  senha: string;
}

interface BulkResult {
  criados: { numero: string; senhaProvisoria: string }[];
  ignoradosExistentes: string[];
  erros: { linha: number; motivo: string }[];
}

@Injectable()
export class ApartamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApartamentoDto) {
    const senha = dto.senhaProvisoria ?? randomPassword(10);
    const passwordHash = await AuthService.hashPassword(senha);
    try {
      const ap = await this.prisma.apartamento.create({
        data: { numero: dto.numero, passwordHash, isProvisional: true },
        select: { id: true, numero: true, isProvisional: true, createdAt: true },
      });
      return { ...ap, senhaProvisoria: senha };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`Apartamento ${dto.numero} já existe`);
      }
      throw e;
    }
  }

  list() {
    return this.prisma.apartamento.findMany({
      orderBy: { numero: 'asc' },
      select: {
        id: true,
        numero: true,
        isProvisional: true,
        createdAt: true,
        _count: { select: { moradores: true } },
      },
    });
  }

  async resetarSenha(id: string): Promise<{ id: string; numero: string; senhaProvisoria: string }> {
    const ap = await this.prisma.apartamento.findUnique({ where: { id } });
    if (!ap) throw new NotFoundException('Apartamento não encontrado');
    const senha = randomPassword(10);
    const passwordHash = await AuthService.hashPassword(senha);
    await this.prisma.apartamento.update({
      where: { id },
      data: { passwordHash, isProvisional: true },
    });
    return { id, numero: ap.numero, senhaProvisoria: senha };
  }

  async bulk(dto: BulkApartamentosDto): Promise<BulkResult> {
    const { rows, erros } = parseCsv(dto.csv);
    if (rows.length === 0 && erros.length === 0) {
      throw new BadRequestException('CSV vazio ou inválido (esperado: numero,senha por linha).');
    }

    // checa duplicados dentro do próprio CSV
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const r of rows) {
      if (seen.has(r.numero)) dupes.push(r.numero);
      seen.add(r.numero);
    }
    if (dupes.length > 0) {
      throw new BadRequestException(
        `Números duplicados no CSV: ${Array.from(new Set(dupes)).join(', ')}`,
      );
    }

    // Quais já existem no DB
    const existentes = await this.prisma.apartamento.findMany({
      where: { numero: { in: rows.map((r) => r.numero) } },
      select: { numero: true },
    });
    const existentesSet = new Set(existentes.map((e) => e.numero));

    // Insere apenas os novos, em transação
    const novos = rows.filter((r) => !existentesSet.has(r.numero));
    const criados: { numero: string; senhaProvisoria: string }[] = [];

    if (novos.length > 0) {
      const data = await Promise.all(
        novos.map(async (r) => ({
          numero: r.numero,
          passwordHash: await AuthService.hashPassword(r.senha),
          isProvisional: true,
        })),
      );
      await this.prisma.apartamento.createMany({ data });
      criados.push(
        ...novos.map((r) => ({ numero: r.numero, senhaProvisoria: r.senha })),
      );
    }

    return {
      criados,
      ignoradosExistentes: Array.from(existentesSet),
      erros,
    };
  }
}

// CSV parser bem simples: aceita "numero,senha" por linha; opcionalmente
// uma linha de header começando com "numero". Linhas em branco são puladas.
function parseCsv(csv: string): { rows: BulkRow[]; erros: { linha: number; motivo: string }[] } {
  const lines = csv.split(/\r?\n/);
  const rows: BulkRow[] = [];
  const erros: { linha: number; motivo: string }[] = [];

  let started = false;
  lines.forEach((raw, idx) => {
    const linha = idx + 1;
    const line = raw.trim();
    if (!line) return;
    // detecta header
    if (!started && /^numero\s*,/i.test(line)) {
      started = true;
      return;
    }
    started = true;

    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 2) {
      erros.push({ linha, motivo: 'esperado: numero,senha' });
      return;
    }
    const [numero, senha] = parts;
    if (!/^[A-Za-z0-9-]{1,16}$/.test(numero)) {
      erros.push({ linha, motivo: `número inválido: "${numero}"` });
      return;
    }
    if (!senha || senha.length < 6 || senha.length > 64) {
      erros.push({ linha, motivo: 'senha deve ter 6-64 caracteres' });
      return;
    }
    rows.push({ numero, senha });
  });

  return { rows, erros };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HikvisionIsapiClient } from '../hikvision/hikvision-isapi.client';
import { encrypt, decrypt } from '../common/cripto';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminais.dto';

@Injectable()
export class TerminaisService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    const rows = await this.prisma.terminalFacial.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, nome: true, host: true, porta: true,
        usuario: true, ativo: true, ultimoOk: true, ultimoErr: true, createdAt: true,
      },
    });
    return rows;
  }

  async criar(dto: CreateTerminalDto) {
    const senhaEnc = encrypt(dto.senha);
    const terminal = await this.prisma.terminalFacial.create({
      data: {
        nome: dto.nome,
        host: dto.host,
        porta: dto.porta ?? 80,
        usuario: dto.usuario,
        senhaEnc,
        ativo: true,
      },
      select: { id: true, nome: true, host: true, porta: true, usuario: true, ativo: true, createdAt: true },
    });
    return terminal;
  }

  async atualizar(id: string, dto: UpdateTerminalDto) {
    const t = await this.prisma.terminalFacial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Terminal não encontrado');

    const data: any = {};
    if (dto.nome    !== undefined) data.nome    = dto.nome;
    if (dto.host    !== undefined) data.host    = dto.host;
    if (dto.porta   !== undefined) data.porta   = dto.porta;
    if (dto.usuario !== undefined) data.usuario = dto.usuario;
    if (dto.senha   !== undefined) data.senhaEnc = encrypt(dto.senha);
    if (dto.ativo   !== undefined) data.ativo   = dto.ativo;

    return this.prisma.terminalFacial.update({
      where: { id },
      data,
      select: { id: true, nome: true, host: true, porta: true, usuario: true, ativo: true },
    });
  }

  async testarConexao(id: string): Promise<{ ok: boolean; erro?: string }> {
    const t = await this.prisma.terminalFacial.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Terminal não encontrado');

    const client = new HikvisionIsapiClient({
      host: t.host,
      porta: t.porta,
      usuario: t.usuario,
      senha: decrypt(t.senhaEnc),
    });

    try {
      await client.ping();
      await this.prisma.terminalFacial.update({
        where: { id },
        data: { ultimoOk: new Date(), ultimoErr: null },
      });
      return { ok: true };
    } catch (e: any) {
      const erro = e?.message ?? 'Erro desconhecido';
      await this.prisma.terminalFacial.update({
        where: { id },
        data: { ultimoErr: erro },
      });
      return { ok: false, erro };
    }
  }

  /** Retorna cliente ISAPI autenticado para um terminal. */
  async clientePara(id: string): Promise<HikvisionIsapiClient> {
    const t = await this.prisma.terminalFacial.findUniqueOrThrow({ where: { id } });
    return new HikvisionIsapiClient({
      host: t.host,
      porta: t.porta,
      usuario: t.usuario,
      senha: decrypt(t.senhaEnc),
    });
  }
}

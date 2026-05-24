import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateFuncionarioDto,
  UpdateFuncionarioDto,
} from './dto/funcionarios.dto';
import { randomPassword } from '../common/random-password';

@Injectable()
export class FuncionariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFuncionarioDto): Promise<{
    id: string;
    loginId: string;
    nome: string;
    senhaProvisoria: string;
  }> {
    const senhaProvisoria = dto.senhaProvisoria ?? randomPassword(12);
    const passwordHash = await AuthService.hashPassword(senhaProvisoria);

    try {
      const f = await this.prisma.funcionario.create({
        data: {
          loginId: dto.loginId,
          nome: dto.nome,
          passwordHash,
          mustChangePassword: true,
          ativo: true,
        },
        select: { id: true, loginId: true, nome: true },
      });
      return { ...f, senhaProvisoria };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`loginId já existe: ${dto.loginId}`);
      }
      throw e;
    }
  }

  list() {
    return this.prisma.funcionario.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        loginId: true,
        nome: true,
        fotoUrl: true,
        mustChangePassword: true,
        ativo: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateFuncionarioDto,
  ): Promise<{ id: string; senhaProvisoria?: string }> {
    const f = await this.prisma.funcionario.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Funcionário não encontrado');

    const data: Prisma.FuncionarioUpdateInput = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;

    let senhaProvisoria: string | undefined;
    if (dto.resetarSenha) {
      senhaProvisoria = randomPassword(12);
      data.passwordHash = await AuthService.hashPassword(senhaProvisoria);
      data.mustChangePassword = true;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nada para atualizar');
    }

    await this.prisma.funcionario.update({ where: { id }, data });
    return { id, ...(senhaProvisoria ? { senhaProvisoria } : {}) };
  }
}

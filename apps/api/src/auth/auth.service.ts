import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
  RequestUser,
  UserRole,
} from './types/auth.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession extends AuthTokens {
  user: {
    id: string;
    role: UserRole;
    nome?: string;
    email?: string;
    numero?: string;
    apartamentoId?: string;
    fotoUrl?: string;
    mustChangePassword: boolean;
  };
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ===== Hash helpers =====
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  static async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  // ===== Login: Admin =====
  async loginAdmin(email: string, senha: string): Promise<AuthSession> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin || !(await AuthService.compare(senha, admin.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    return this.buildSession({
      id: admin.id,
      role: 'admin',
      mustChangePassword: false,
      extra: { email: admin.email },
    });
  }

  // ===== Login: Funcionário =====
  async loginFuncionario(loginId: string, senha: string): Promise<AuthSession> {
    const f = await this.prisma.funcionario.findUnique({ where: { loginId } });
    if (!f || !f.ativo || !(await AuthService.compare(senha, f.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    return this.buildSession({
      id: f.id,
      role: 'funcionario',
      mustChangePassword: f.mustChangePassword,
      extra: { nome: f.nome, fotoUrl: f.fotoUrl ?? undefined },
    });
  }

  // ===== Login: Morador =====
  async loginMorador(numeroAp: string, senha: string): Promise<AuthSession> {
    const ap = await this.prisma.apartamento.findUnique({
      where: { numero: numeroAp },
      include: { moradores: { where: { ativo: true } } },
    });
    if (!ap || !(await AuthService.compare(senha, ap.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // O "user logado" do AP é o morador admin (se existir) ou null antes do 1º acesso.
    // Para o primeiro login (isProvisional=true), criamos um "morador placeholder" só
    // no payload do JWT — o usuário precisa completar cadastro após change-password.
    const moradorAdmin = ap.moradores.find((m) => m.isAdminAp);

    return this.buildSession({
      id: moradorAdmin?.id ?? ap.id,
      role: 'morador',
      mustChangePassword: ap.isProvisional,
      apartamentoId: ap.id,
      extra: { numero: ap.numero, nome: moradorAdmin?.nome },
    });
  }

  // ===== Refresh =====
  async refresh(payload: JwtRefreshPayload): Promise<AuthTokens> {
    // Re-monta access token; refresh continua o mesmo (sliding desabilitado por simplicidade).
    const access = await this.signAccess({
      sub: payload.sub,
      role: payload.role,
      // mustChangePassword e apartamentoId são re-buscados em rotas que precisam;
      // não os colocamos no refresh para não vazar.
    });
    const refresh = await this.signRefresh(payload);
    return { accessToken: access, refreshToken: refresh };
  }

  // ===== Change password =====
  async changePassword(user: RequestUser, senhaAtual: string, novaSenha: string): Promise<void> {
    if (senhaAtual === novaSenha) {
      throw new BadRequestException('A nova senha deve ser diferente da atual.');
    }

    if (user.role === 'admin') {
      const a = await this.prisma.admin.findUnique({ where: { id: user.id } });
      if (!a || !(await AuthService.compare(senhaAtual, a.passwordHash))) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }
      await this.prisma.admin.update({
        where: { id: user.id },
        data: { passwordHash: await AuthService.hashPassword(novaSenha) },
      });
      return;
    }

    if (user.role === 'funcionario') {
      const f = await this.prisma.funcionario.findUnique({ where: { id: user.id } });
      if (!f || !(await AuthService.compare(senhaAtual, f.passwordHash))) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }
      await this.prisma.funcionario.update({
        where: { id: user.id },
        data: {
          passwordHash: await AuthService.hashPassword(novaSenha),
          mustChangePassword: false,
        },
      });
      return;
    }

    // morador: senha é do APARTAMENTO
    if (user.role === 'morador' && user.apartamentoId) {
      const ap = await this.prisma.apartamento.findUnique({
        where: { id: user.apartamentoId },
      });
      if (!ap || !(await AuthService.compare(senhaAtual, ap.passwordHash))) {
        throw new UnauthorizedException('Senha atual incorreta.');
      }
      await this.prisma.apartamento.update({
        where: { id: user.apartamentoId },
        data: {
          passwordHash: await AuthService.hashPassword(novaSenha),
          isProvisional: false,
        },
      });
      return;
    }

    throw new BadRequestException('Perfil de usuário inválido.');
  }

  // ===== Internals =====
  private async buildSession(input: {
    id: string;
    role: UserRole;
    mustChangePassword: boolean;
    apartamentoId?: string;
    extra?: Record<string, string | undefined>;
  }): Promise<AuthSession> {
    const accessPayload: JwtAccessPayload = {
      sub: input.id,
      role: input.role,
      apartamentoId: input.apartamentoId,
      mustChangePassword: input.mustChangePassword || undefined,
    };
    const refreshPayload: JwtRefreshPayload = { sub: input.id, role: input.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccess(accessPayload),
      this.signRefresh(refreshPayload),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: input.id,
        role: input.role,
        apartamentoId: input.apartamentoId,
        mustChangePassword: input.mustChangePassword,
        ...input.extra,
      },
    };
  }

  private signAccess(payload: JwtAccessPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    });
  }

  private signRefresh(payload: JwtRefreshPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '30d'),
    });
  }

  // ===== Admin management =====
  async listAdmins() {
    return this.prisma.admin.findMany({
      select: { id: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAdmin(email: string, senha: string) {
    const exists = await this.prisma.admin.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email já cadastrado.');
    const hash = await AuthService.hashPassword(senha);
    return this.prisma.admin.create({
      data: { email, passwordHash: hash },
      select: { id: true, email: true, createdAt: true },
    });
  }

  async deleteAdmin(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new BadRequestException('Você não pode remover sua própria conta.');
    }
    const admin = await this.prisma.admin.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Administrador não encontrado.');
    const count = await this.prisma.admin.count();
    if (count <= 1) {
      throw new BadRequestException('Deve haver pelo menos um administrador.');
    }
    await this.prisma.admin.delete({ where: { id } });
  }

  // ===== Lista pública de porteiros (sem dados sensíveis) =====
  // Usado na tela de login para o porteiro selecionar seu card.
  async listFuncionariosPublic() {
    const funcs = await this.prisma.funcionario.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        loginId: true,
        nome: true,
        fotoUrl: true,
      },
    });
    return funcs;
  }
}

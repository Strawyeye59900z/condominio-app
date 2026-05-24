import { Controller, ForbiddenException, Get, NotFoundException } from '@nestjs/common';
import { AllowMustChangePassword } from '../auth/decorators/allow-must-change-password.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/types/auth.types';

@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @AllowMustChangePassword()
  @Get()
  async me(@CurrentUser() user: RequestUser) {
    if (user.role === 'admin') {
      const a = await this.prisma.admin.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, createdAt: true },
      });
      if (!a) throw new NotFoundException();
      return { role: 'admin', mustChangePassword: false, admin: a };
    }

    if (user.role === 'funcionario') {
      const f = await this.prisma.funcionario.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          loginId: true,
          nome: true,
          fotoUrl: true,
          mustChangePassword: true,
          ativo: true,
        },
      });
      if (!f) throw new NotFoundException();
      return { role: 'funcionario', mustChangePassword: f.mustChangePassword, funcionario: f };
    }

    if (user.role === 'morador') {
      if (!user.apartamentoId) throw new ForbiddenException();
      const ap = await this.prisma.apartamento.findUnique({
        where: { id: user.apartamentoId },
        select: {
          id: true,
          numero: true,
          isProvisional: true,
          moradores: {
            where: { ativo: true },
            select: {
              id: true,
              nome: true,
              telefone: true,
              fotoUrl: true,
              statusFacial: true,
              isAdminAp: true,
            },
          },
        },
      });
      if (!ap) throw new NotFoundException();
      return {
        role: 'morador',
        mustChangePassword: ap.isProvisional,
        apartamento: { id: ap.id, numero: ap.numero },
        moradores: ap.moradores,
      };
    }

    throw new ForbiddenException();
  }
}

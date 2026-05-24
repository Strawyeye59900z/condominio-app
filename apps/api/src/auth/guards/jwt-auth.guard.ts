import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_MCP_KEY } from '../decorators/allow-must-change-password.decorator';
import type { RequestUser } from '../types/auth.types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const ok = (await super.canActivate(ctx)) as boolean;
    if (!ok) return false;

    const user = ctx.switchToHttp().getRequest().user as RequestUser;
    if (user?.mustChangePassword) {
      const allowMcp = this.reflector.getAllAndOverride<boolean>(ALLOW_MCP_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
      if (!allowMcp) {
        throw new ForbiddenException(
          'Senha provisória ainda não foi alterada. Acesse /api/v1/auth/change-password.',
        );
      }
    }
    return true;
  }
}

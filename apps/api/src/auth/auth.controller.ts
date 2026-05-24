import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from './decorators/public.decorator';
import { AllowMustChangePassword } from './decorators/allow-must-change-password.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { REFRESH_COOKIE_NAME } from './strategies/jwt-refresh.strategy';
import {
  ChangePasswordDto,
  LoginAdminDto,
  LoginFuncionarioDto,
  LoginMoradorDto,
} from './dto/login.dto';
import { AuthService, type AuthSession, type AuthTokens } from './auth.service';
import type {
  JwtRefreshPayload,
  RequestUser,
} from './types/auth.types';

// 10 tentativas de login por minuto por IP
@Throttle({ global: { ttl: 60_000, limit: 10 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async loginAdmin(@Body() dto: LoginAdminDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.loginAdmin(dto.email, dto.senha);
    this.setRefreshCookie(res, session.refreshToken);
    return this.publicSession(session);
  }

  @Public()
  @Post('funcionario/login')
  @HttpCode(HttpStatus.OK)
  async loginFuncionario(@Body() dto: LoginFuncionarioDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.loginFuncionario(dto.loginId, dto.senha);
    this.setRefreshCookie(res, session.refreshToken);
    return this.publicSession(session);
  }

  // Lista pública de porteiros para a tela de login (cards com foto + nome)
  @Public()
  @Get('funcionarios/list')
  async listFuncionariosPublic() {
    return this.auth.listFuncionariosPublic();
  }

  @Public()
  @Post('morador/login')
  @HttpCode(HttpStatus.OK)
  async loginMorador(@Body() dto: LoginMoradorDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.loginMorador(dto.numeroAp, dto.senha);
    this.setRefreshCookie(res, session.refreshToken);
    return this.publicSession(session);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as JwtRefreshPayload;
    const tokens: AuthTokens = await this.auth.refresh(payload);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @AllowMustChangePassword()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.clearRefreshCookie(res);
  }

  @AllowMustChangePassword()
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user, dto.senhaAtual, dto.novaSenha);
  }

  // ===== helpers =====
  private setRefreshCookie(res: Response, token: string): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
  }

  private publicSession(s: AuthSession) {
    return { accessToken: s.accessToken, user: s.user };
  }
}

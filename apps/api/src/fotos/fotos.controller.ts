import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AllowMustChangePassword } from '../auth/decorators/allow-must-change-password.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { FotosService } from './fotos.service';
import { REGRAS } from '../common/regras';

@Controller()
export class FotosController {
  constructor(
    private readonly fotos: FotosService,
    private readonly prisma: PrismaService,
    private readonly storage: DriveService,
  ) {}

  // ===== Termo LGPD =====
  @Roles('morador')
  @Post('me/consent-lgpd')
  @HttpCode(HttpStatus.NO_CONTENT)
  async consentLgpd(
    @CurrentUser() user: RequestUser,
    @Body() body: { moradorId: string; aceito: boolean },
    @Req() req: Request,
  ): Promise<void> {
    if (!user.apartamentoId) throw new ForbiddenException();
    if (!body?.moradorId || body.aceito !== true) {
      throw new BadRequestException('moradorId e aceito=true são obrigatórios');
    }
    const m = await this.prisma.morador.findUnique({ where: { id: body.moradorId } });
    if (!m || m.apartamentoId !== user.apartamentoId) {
      throw new ForbiddenException('Morador não pertence a este AP');
    }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || null;
    await this.prisma.morador.update({
      where: { id: body.moradorId },
      data: { consentLgpdAt: new Date(), consentLgpdIp: ip },
    });
  }

  // ===== Visualizar foto de morador do próprio AP (morador autenticado) =====
  @Roles('morador')
  @Get('me/foto/:moradorId')
  async verFotoMorador(
    @CurrentUser() user: RequestUser,
    @Param('moradorId') moradorId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!user.apartamentoId) throw new ForbiddenException();
    const m = await this.prisma.morador.findUnique({
      where: { id: moradorId },
      select: { fotoUrl: true, apartamentoId: true },
    });
    if (!m || m.apartamentoId !== user.apartamentoId) {
      throw new ForbiddenException('Foto não pertence ao seu apartamento');
    }
    if (!m.fotoUrl) throw new NotFoundException('Foto não encontrada');

    const { buffer, mimeType } = await this.storage.readFile(m.fotoUrl);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  }

  // ===== Upload da foto do morador =====
  @Roles('morador')
  @Post('me/foto/:moradorId')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: REGRAS.fotoMaxBytes } }))
  async uploadMorador(
    @CurrentUser() user: RequestUser,
    @Param('moradorId') moradorId: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
  ) {
    if (!user.apartamentoId) throw new ForbiddenException();
    return this.fotos.uploadMorador({
      apartamentoId: user.apartamentoId,
      moradorId,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
    });
  }

  // ===== Upload da foto do funcionário =====
  @Roles('funcionario')
  @AllowMustChangePassword()
  @Post('porteiro/me/foto')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: REGRAS.fotoMaxBytes } }))
  async uploadFuncionario(
    @CurrentUser() user: RequestUser,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
  ) {
    return this.fotos.uploadFuncionario({
      funcionarioId: user.id,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
    });
  }
}

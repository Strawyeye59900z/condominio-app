import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';

const TEMPLATE_KEY = 'WHATSAPP_TEMPLATE_ENCOMENDA';

export const DEFAULT_WHATSAPP_TEMPLATE =
  `Olá, {nome}! 📦\n` +
  `Uma encomenda do tipo *{tipo}* foi recebida na portaria às {hora} por {porteiro}.\n` +
  `Dirija-se à portaria para retirar. ✅`;

class PatchTemplateDto {
  @IsString()
  @MinLength(10)
  template!: string;
}

@Roles('admin')
@Controller('admin/whatsapp')
export class WhatsAppAdminController {
  constructor(
    private readonly svc: WhatsAppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  status() {
    return this.svc.status();
  }

  @Get('qrcode')
  async qrcode() {
    const result = await this.svc.getQrCode();
    if (!result) {
      throw new ServiceUnavailableException(
        'Não foi possível obter o QR code da instância. Verifique se o container está rodando.',
      );
    }
    return result;
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect() {
    await this.svc.disconnect();
  }

  @Get('template')
  async getTemplate() {
    const row = await this.prisma.configuracao.findUnique({
      where: { chave: TEMPLATE_KEY },
    });
    return {
      template: row?.valor ?? DEFAULT_WHATSAPP_TEMPLATE,
      default: DEFAULT_WHATSAPP_TEMPLATE,
    };
  }

  @Patch('template')
  async patchTemplate(@Body() dto: PatchTemplateDto) {
    const row = await this.prisma.configuracao.upsert({
      where: { chave: TEMPLATE_KEY },
      create: { chave: TEMPLATE_KEY, valor: dto.template },
      update: { valor: dto.template },
    });
    return { template: row.valor };
  }
}

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
import { WHATSAPP_TEMPLATE_KEY, DEFAULT_WHATSAPP_TEMPLATE } from './whatsapp.constants';

export { DEFAULT_WHATSAPP_TEMPLATE };

class PatchTemplateDto {
  @IsString()
  @MinLength(10)
  template!: string;
}

class TestMessageDto {
  @IsString()
  @MinLength(8)
  numero!: string; // E.164 sem +, ex: 5511999999999
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
      where: { chave: WHATSAPP_TEMPLATE_KEY },
    });
    return {
      template: row?.valor ?? DEFAULT_WHATSAPP_TEMPLATE,
      default: DEFAULT_WHATSAPP_TEMPLATE,
    };
  }

  @Patch('template')
  async patchTemplate(@Body() dto: PatchTemplateDto) {
    const row = await this.prisma.configuracao.upsert({
      where: { chave: WHATSAPP_TEMPLATE_KEY },
      create: { chave: WHATSAPP_TEMPLATE_KEY, valor: dto.template },
      update: { valor: dto.template },
    });
    return { template: row.valor };
  }

  @Post('test')
  @HttpCode(200)
  async testMessage(@Body() dto: TestMessageDto) {
    const status = await this.svc.status();
    if (!status.connected) {
      throw new ServiceUnavailableException('WhatsApp não está conectado. Escaneie o QR code primeiro.');
    }
    const numero = dto.numero.replace(/\D/g, '');
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      this.svc.sendAsync(numero, '✅ Teste de conexão — Condomínio App funcionando!', {
        onSuccess: async () => resolve({ ok: true }),
        onFailure: async (error) => resolve({ ok: false, error }),
      });
      // timeout de segurança (10s)
      setTimeout(() => resolve({ ok: false, error: 'Timeout: sem resposta em 10s' }), 10_000);
    });
  }
}

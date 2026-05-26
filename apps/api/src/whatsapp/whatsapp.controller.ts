import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhatsAppService } from './whatsapp.service';

@Roles('admin')
@Controller('admin/whatsapp')
export class WhatsAppAdminController {
  constructor(private readonly svc: WhatsAppService) {}

  @Get('status')
  status() {
    return this.svc.status();
  }

  @Get('qrcode')
  async qrcode() {
    const result = await this.svc.getQrCode();
    if (!result) {
      throw new ServiceUnavailableException(
        'Não foi possível obter o QR code da instância Evolution. Verifique se o container está rodando e se a instância existe.',
      );
    }
    return result;
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect() {
    await this.svc.disconnect();
  }
}

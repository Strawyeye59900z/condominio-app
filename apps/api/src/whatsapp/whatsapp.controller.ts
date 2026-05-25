import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
  qrcode() {
    return this.svc.getQrCode();
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect() {
    await this.svc.disconnect();
  }
}

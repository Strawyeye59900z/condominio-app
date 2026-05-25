import { Global, Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppAdminController } from './whatsapp.controller';

@Global()
@Module({
  controllers: [WhatsAppAdminController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}

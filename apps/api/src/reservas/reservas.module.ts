import { Module } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { PdfService } from './pdf.service';
import { ReservasMeController, ReservasAdminController } from './reservas.controller';

@Module({
  controllers: [ReservasMeController, ReservasAdminController],
  providers: [ReservasService, PdfService],
  exports: [ReservasService],
})
export class ReservasModule {}

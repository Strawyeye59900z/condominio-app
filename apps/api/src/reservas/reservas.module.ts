import { Module } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { ReservasMeController, ReservasAdminController } from './reservas.controller';

@Module({
  controllers: [ReservasMeController, ReservasAdminController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}

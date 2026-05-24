import { Module } from '@nestjs/common';
import { MoradoresService } from './moradores.service';
import { MoradoresAdminController } from './moradores.admin.controller';
import { MoradoresMeController } from './moradores.me.controller';

@Module({
  controllers: [MoradoresAdminController, MoradoresMeController],
  providers: [MoradoresService],
  exports: [MoradoresService],
})
export class MoradoresModule {}

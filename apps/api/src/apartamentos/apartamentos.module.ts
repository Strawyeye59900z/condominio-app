import { Module } from '@nestjs/common';
import { ApartamentosService } from './apartamentos.service';
import { ApartamentosAdminController } from './apartamentos.controller';

@Module({
  controllers: [ApartamentosAdminController],
  providers: [ApartamentosService],
  exports: [ApartamentosService],
})
export class ApartamentosModule {}

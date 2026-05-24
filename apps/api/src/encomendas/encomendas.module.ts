import { Module } from '@nestjs/common';
import { EncomendasService } from './encomendas.service';
import {
  EncomendasAdminController,
  EncomendasMeController,
  EncomendasPorteiroController,
} from './encomendas.controller';

@Module({
  controllers: [
    EncomendasPorteiroController,
    EncomendasAdminController,
    EncomendasMeController,
  ],
  providers: [EncomendasService],
  exports: [EncomendasService],
})
export class EncomendasModule {}

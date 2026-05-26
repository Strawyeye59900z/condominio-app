import { Module } from '@nestjs/common';
import { FotosController } from './fotos.controller';
import { FotosService } from './fotos.service';
import { FacialModule } from '../facial/facial.module';

@Module({
  imports: [FacialModule],
  controllers: [FotosController],
  providers: [FotosService],
  exports: [FotosService],
})
export class FotosModule {}

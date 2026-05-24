import { Module } from '@nestjs/common';
import { FacialController } from './facial.controller';

@Module({
  controllers: [FacialController],
})
export class FacialModule {}

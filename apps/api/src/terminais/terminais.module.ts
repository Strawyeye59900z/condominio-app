import { Module } from '@nestjs/common';
import { TerminaisService } from './terminais.service';
import { TerminaisAdminController } from './terminais.admin.controller';

@Module({
  controllers: [TerminaisAdminController],
  providers: [TerminaisService],
  exports: [TerminaisService],
})
export class TerminaisModule {}

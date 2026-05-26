import { Module } from '@nestjs/common';
import { FacialController } from './facial.controller';
import { FacialSyncService } from './facial-sync.service';
import { FacialSyncProcessor } from './facial-sync.processor';
import { TerminaisModule } from '../terminais/terminais.module';
import { DriveModule } from '../drive/drive.module';

@Module({
  imports: [TerminaisModule, DriveModule],
  controllers: [FacialController],
  providers: [FacialSyncService, FacialSyncProcessor],
  exports: [FacialSyncService],
})
export class FacialModule {}

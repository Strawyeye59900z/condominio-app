import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { FacialSyncService } from './facial-sync.service';

const TICK_MS = 30_000; // 30 s

/**
 * Processador de fila facial — timer simples (sem Redis/Bull).
 * Similar ao retry do WhatsApp (OnModuleInit + setTimeout).
 * Processa PENDENTE/FALHOU e REMOVENDO a cada tick.
 */
@Injectable()
export class FacialSyncProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FacialSyncProcessor.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(private readonly sync: FacialSyncService) {}

  onModuleInit() {
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext() {
    this.timer = setTimeout(() => this.tick(), TICK_MS);
  }

  private async tick() {
    if (this.running) {
      this.scheduleNext();
      return;
    }
    this.running = true;
    try {
      await this.sync.processarPendentes();
      await this.sync.processarRemocoes();
    } catch (e: any) {
      this.logger.error(`Erro no tick do facial-sync: ${e?.message}`);
    } finally {
      this.running = false;
      this.scheduleNext();
    }
  }
}

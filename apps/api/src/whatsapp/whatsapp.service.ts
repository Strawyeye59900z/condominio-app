import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WhatsAppSendResult =
  | { ok: true }
  | { ok: false; error: string };

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]; // 5s, 30s, 2min

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('EVOLUTION_API_URL');
    this.apiKey = this.config.getOrThrow<string>('EVOLUTION_API_KEY');
    this.instance = this.config.getOrThrow<string>('EVOLUTION_INSTANCE');
  }

  /**
   * Envia mensagem de texto em background (fire-and-forget).
   * Chama o callback onSuccess / onFailure após até 3 tentativas.
   */
  sendAsync(
    to: string,
    text: string,
    callbacks?: {
      onSuccess?: () => Promise<void>;
      onFailure?: (error: string) => Promise<void>;
    },
  ): void {
    // dispara sem bloquear a resposta HTTP
    this.sendWithRetry(to, text, 0, callbacks).catch((err) => {
      this.logger.error(`sendWithRetry não tratado: ${(err as Error).message}`);
    });
  }

  /** Verifica se a instância do WhatsApp está conectada. */
  async status(): Promise<{ connected: boolean; state?: string }> {
    try {
      const res = await fetch(
        `${this.baseUrl}/instance/connectionState/${this.instance}`,
        { headers: { apikey: this.apiKey } },
      );
      if (!res.ok) return { connected: false, state: 'http_error' };
      const data = (await res.json()) as { instance?: { state?: string } };
      const state = data?.instance?.state ?? 'unknown';
      return { connected: state === 'open', state };
    } catch (e) {
      return { connected: false, state: (e as Error).message };
    }
  }

  // ===== Internos =====

  private async sendWithRetry(
    to: string,
    text: string,
    attempt: number,
    callbacks?: {
      onSuccess?: () => Promise<void>;
      onFailure?: (error: string) => Promise<void>;
    },
  ): Promise<void> {
    const result = await this.trySend(to, text);

    if (result.ok) {
      this.logger.log(`WhatsApp enviado para ${to}`);
      if (callbacks?.onSuccess) {
        await callbacks.onSuccess().catch((e) =>
          this.logger.error(`onSuccess falhou: ${(e as Error).message}`),
        );
      }
      return;
    }

    const nextAttempt = attempt + 1;
    if (nextAttempt < RETRY_DELAYS_MS.length + 1) {
      const delay = RETRY_DELAYS_MS[attempt] ?? 120_000;
      this.logger.warn(
        `WhatsApp falhou (tentativa ${nextAttempt}/${RETRY_DELAYS_MS.length + 1}) ` +
        `para ${to}: ${result.error}. Retry em ${delay / 1000}s`,
      );
      setTimeout(() => {
        this.sendWithRetry(to, text, nextAttempt, callbacks).catch(() => null);
      }, delay);
      return;
    }

    // Esgotou as tentativas
    this.logger.error(`WhatsApp falhou definitivamente para ${to}: ${result.error}`);
    if (callbacks?.onFailure) {
      await callbacks.onFailure(result.error).catch((e) =>
        this.logger.error(`onFailure falhou: ${(e as Error).message}`),
      );
    }
  }

  private async trySend(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          body: JSON.stringify({ number: to, text }),
        },
      );

      if (res.ok) return { ok: true };

      let errMsg = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        errMsg += `: ${body?.message ?? JSON.stringify(body)}`;
      } catch {
        // corpo não é JSON
      }
      return { ok: false, error: errMsg };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}

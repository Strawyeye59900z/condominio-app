import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { join } from 'path';

export type WhatsAppSendResult =
  | { ok: true }
  | { ok: false; error: string };

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]; // 5s, 30s, 2min

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly instance = 'condominio';
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private qrCode: string | null = null;
  private connected = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.initializeSocket();
  }

  private async initializeSocket() {
    try {
      const authPath = join(process.cwd(), `auth_info_${this.instance}`);
      const { state, saveCreds } = await useMultiFileAuthState(authPath);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
      });

      // QR Code event
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          this.logger.log('QR code gerado para escanear');
        }

        if (connection === 'open') {
          this.connected = true;
          this.qrCode = null;
          this.logger.log('Conectado ao WhatsApp ✅');
        } else if (connection === 'close') {
          this.connected = false;
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;

          if (shouldReconnect) {
            this.logger.warn('Reconectando...');
            setTimeout(() => this.initializeSocket(), 3_000);
          } else {
            this.logger.error('Desconectado permanentemente');
          }
        }
      });

      // Salvar credenciais quando atualizarem
      this.sock.ev.on('creds.update', saveCreds);

      this.logger.log(`Socket ${this.instance} inicializado`);
    } catch (e) {
      this.logger.error(
        `Erro ao inicializar socket: ${(e as Error).message}`,
      );
      setTimeout(() => this.initializeSocket(), 5_000);
    }
  }

  get instanceName() {
    return this.instance;
  }

  /** Retorna QR code como data URL PNG. */
  async getQrCode(): Promise<{ qrDataUrl: string } | null> {
    if (!this.qrCode) {
      this.logger.warn('QR code ainda não disponível');
      return null;
    }
    return { qrDataUrl: this.qrCode };
  }

  /** Verifica status da conexão. */
  async status(): Promise<{
    connected: boolean;
    state?: string;
    instance: string;
  }> {
    return {
      connected: this.connected,
      state: this.connected ? 'open' : 'close',
      instance: this.instance,
    };
  }

  /** Desconecta do WhatsApp. */
  async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
    }
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
    this.sendWithRetry(to, text, 0, callbacks).catch((err) => {
      this.logger.error(`sendWithRetry não tratado: ${(err as Error).message}`);
    });
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

  /** Usado pelo endpoint de teste — sem retry, resultado imediato. */
  async testSend(to: string, text: string): Promise<WhatsAppSendResult> {
    return this.trySend(to, text);
  }

  private async trySend(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      if (!this.sock) {
        return { ok: false, error: 'Socket não inicializado' };
      }
      if (!this.connected) {
        return { ok: false, error: 'Não conectado ao WhatsApp' };
      }

      // Verifica se o número existe no WhatsApp e obtém o JID correto
      let jid = `${to}@s.whatsapp.net`;
      try {
        const checks = await this.sock.onWhatsApp(to);
        const check = Array.isArray(checks) ? checks[0] : undefined;
        if (check !== undefined && !check?.exists) {
          return { ok: false, error: `Número ${to} não está registrado no WhatsApp` };
        }
        if (check?.jid) jid = check.jid;
      } catch (e) {
        // onWhatsApp indisponível nesta versão — tenta enviar mesmo assim
        this.logger.warn(`onWhatsApp check falhou: ${(e as Error).message}`);
      }

      const result = await this.sock.sendMessage(jid, { text });
      this.logger.log(`Mensagem enviada para ${jid} — status: ${result?.status}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}

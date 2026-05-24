import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

type HealthStatus = 'ok' | 'fail';
type OverallStatus = 'ok' | 'degraded';

type HealthResponse = {
  status: OverallStatus;
  db: HealthStatus;
  drive: HealthStatus;
  whatsapp: HealthStatus | 'disconnected';
  uptime: number;
  timestamp: string;
};

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly drive: DriveService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    let db: HealthStatus = 'ok';
    let drive: HealthStatus = 'ok';
    let whatsapp: HealthStatus | 'disconnected' = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'fail';
    }

    try {
      await this.drive.ping();
    } catch {
      drive = 'fail';
    }

    try {
      const { connected } = await this.whatsapp.status();
      whatsapp = connected ? 'ok' : 'disconnected';
    } catch {
      whatsapp = 'fail';
    }

    const status: OverallStatus = db === 'ok' && drive !== 'fail' ? 'ok' : 'degraded';

    return {
      status,
      db,
      drive,
      whatsapp,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

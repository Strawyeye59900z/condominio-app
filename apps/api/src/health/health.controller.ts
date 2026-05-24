import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type HealthResponse = {
  status: 'ok' | 'degraded';
  db: 'ok' | 'fail';
  uptime: number;
  timestamp: string;
};

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    let db: 'ok' | 'fail' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'fail';
    }

    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}

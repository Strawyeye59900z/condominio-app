import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdmin();
  }

  private async seedAdmin(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL/ADMIN_PASSWORD não configurados — pulando seed do admin.');
      return;
    }

    const existing = await this.prisma.admin.findUnique({ where: { email } });
    if (existing) {
      this.logger.log(`Admin já existe: ${email}`);
      return;
    }

    const passwordHash = await AuthService.hashPassword(password);
    await this.prisma.admin.create({ data: { email, passwordHash } });
    this.logger.log(`Admin criado: ${email}`);
  }
}

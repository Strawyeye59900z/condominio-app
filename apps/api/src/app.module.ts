import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { MeModule } from './me/me.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { ApartamentosModule } from './apartamentos/apartamentos.module';
import { MoradoresModule } from './moradores/moradores.module';
import { DriveModule } from './drive/drive.module';
import { FotosModule } from './fotos/fotos.module';
import { FacialModule } from './facial/facial.module';
import { TerminaisModule } from './terminais/terminais.module';
import { EncomendasModule } from './encomendas/encomendas.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ReservasModule } from './reservas/reservas.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Logs estruturados JSON com pino
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
          req: (req) => ({ method: req.method, url: req.url, ip: req.remoteAddress }),
          res: (res) => ({ statusCode: res.statusCode }),
        },
      },
    }),

    // Rate limiting: 60 req/min global; rotas de auth têm throttler próprio
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 60 },
    ]),

    PrismaModule,
    DriveModule,
    AuthModule,
    SeedModule,
    HealthModule,
    MeModule,
    FuncionariosModule,
    ApartamentosModule,
    MoradoresModule,
    FotosModule,
    FacialModule,
    TerminaisModule,
    WhatsAppModule,
    EncomendasModule,
    ReservasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}

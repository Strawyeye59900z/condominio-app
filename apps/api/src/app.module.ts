import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { EncomendasModule } from './encomendas/encomendas.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    WhatsAppModule,
    EncomendasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

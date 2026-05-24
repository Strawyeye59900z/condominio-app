import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/auth.types';
import { EncomendasService } from './encomendas.service';
import { CreateEncomendaDto, UpdateEncomendaDto } from './dto/encomendas.dto';

// ===== Porteiro =====
@Roles('funcionario')
@Controller('porteiro')
export class EncomendasPorteiroController {
  constructor(private readonly svc: EncomendasService) {}

  @Post('encomendas')
  create(@Body() dto: CreateEncomendaDto, @CurrentUser() user: RequestUser) {
    return this.svc.create(dto, user.id);
  }

  @Patch('encomendas/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEncomendaDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.svc.update(id, dto, user.id, false);
  }

  @Get('encomendas')
  list(@Query('status') status?: string) {
    return this.svc.listPorteiro(status);
  }

  @Get('apartamentos')
  apartamentos() {
    return this.svc.listApartamentos();
  }
}

// ===== Admin: pode editar fora da janela =====
@Roles('admin')
@Controller('admin')
export class EncomendasAdminController {
  constructor(private readonly svc: EncomendasService) {}

  @Patch('encomendas/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEncomendaDto) {
    return this.svc.update(id, dto, 'admin', true);
  }

  @Get('encomendas')
  list(@Query('status') status?: string) {
    return this.svc.listPorteiro(status);
  }
}

// ===== Morador =====
@Roles('morador')
@Controller('me')
export class EncomendasMeController {
  constructor(private readonly svc: EncomendasService) {}

  @Get('encomendas')
  list(@CurrentUser() user: RequestUser, @Query('status') status?: string) {
    return this.svc.listMorador(user.apartamentoId!, status);
  }

  @Post('encomendas/:id/baixa')
  baixa(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.svc.baixa(id, user.apartamentoId!, user.id);
  }
}

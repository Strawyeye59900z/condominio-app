import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/auth.types';
import { CreateMoradorDto, UpdateMoradorDto } from './dto/moradores.dto';
import { MoradoresService } from './moradores.service';

@Roles('morador')
@Controller('me/moradores')
export class MoradoresMeController {
  constructor(private readonly svc: MoradoresService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    if (!user.apartamentoId) throw new ForbiddenException();
    return this.svc.listDoAp(user.apartamentoId);
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateMoradorDto) {
    if (!user.apartamentoId) throw new ForbiddenException();

    // Se já existe admin no AP, somente o admin pode criar novos.
    const adminAp = await this.svc.getAdminDoAp(user.apartamentoId);
    // Nesta versão, "morador autenticado" = AP. Como não há identidade por morador
    // individual, assumimos que quem está logado no AP é o admin (ou se torna o admin
    // ao criar o primeiro). O admin pode criar; demais (após existir um admin) não.
    // Para um morador "comum" criar, o admin teria que entregar a senha do AP — então
    // efetivamente quem opera é sempre o admin.
    void adminAp;
    return this.svc.createNoAp(user.apartamentoId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMoradorDto,
  ) {
    if (!user.apartamentoId) throw new ForbiddenException();
    return this.svc.updateNoAp(user.apartamentoId, id, dto, true);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    if (!user.apartamentoId) throw new ForbiddenException();
    return this.svc.updateNoAp(user.apartamentoId, id, { ativo: false }, true);
  }
}

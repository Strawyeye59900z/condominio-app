import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { StatusFacial } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminUpdateMoradorDto } from './dto/moradores.dto';
import { MoradoresService } from './moradores.service';

@Roles('admin')
@Controller('admin/moradores')
export class MoradoresAdminController {
  constructor(private readonly svc: MoradoresService) {}

  @Get()
  list(
    @Query('apartamentoId') apartamentoId?: string,
    @Query('statusFacial') statusFacial?: StatusFacial,
  ) {
    return this.svc.listAll({ apartamentoId, statusFacial });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AdminUpdateMoradorDto) {
    return this.svc.adminUpdate(id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  BulkApartamentosDto,
  CreateApartamentoDto,
  UpdateApartamentoDto,
} from './dto/apartamentos.dto';
import { ApartamentosService } from './apartamentos.service';

@Roles('admin')
@Controller('admin/apartamentos')
export class ApartamentosAdminController {
  constructor(private readonly svc: ApartamentosService) {}

  @Post()
  create(@Body() dto: CreateApartamentoDto) {
    return this.svc.create(dto);
  }

  @Post('bulk')
  bulk(@Body() dto: BulkApartamentosDto) {
    return this.svc.bulk(dto);
  }

  @Get()
  list() {
    return this.svc.list();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateApartamentoDto) {
    if (dto.resetarSenha) return this.svc.resetarSenha(id);
    return { id };
  }
}

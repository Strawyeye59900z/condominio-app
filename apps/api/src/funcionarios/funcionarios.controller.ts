import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateFuncionarioDto,
  UpdateFuncionarioDto,
} from './dto/funcionarios.dto';
import { FuncionariosService } from './funcionarios.service';

@Roles('admin')
@Controller('admin/funcionarios')
export class FuncionariosAdminController {
  constructor(private readonly svc: FuncionariosService) {}

  @Post()
  create(@Body() dto: CreateFuncionarioDto) {
    return this.svc.create(dto);
  }

  @Get()
  list() {
    return this.svc.list();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFuncionarioDto) {
    return this.svc.update(id, dto);
  }
}

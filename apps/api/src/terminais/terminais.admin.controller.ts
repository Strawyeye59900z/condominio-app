import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { TerminaisService } from './terminais.service';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminais.dto';

@Roles('admin')
@Controller('admin/terminais')
export class TerminaisAdminController {
  constructor(private readonly terminais: TerminaisService) {}

  @Get()
  listar() {
    return this.terminais.listar();
  }

  @Post()
  criar(@Body() dto: CreateTerminalDto) {
    return this.terminais.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: UpdateTerminalDto) {
    return this.terminais.atualizar(id, dto);
  }

  @Post(':id/testar')
  @HttpCode(HttpStatus.OK)
  testar(@Param('id') id: string) {
    return this.terminais.testarConexao(id);
  }
}

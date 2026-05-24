import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Response,
} from '@nestjs/common';
import { Espaco } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/auth.types';
import { ReservasService } from './reservas.service';
import { PdfService } from './pdf.service';
import { CreateReservaDto } from './dto/reservas.dto';

// ===== Morador =====
@Roles('morador')
@Controller('me/reservas')
export class ReservasMeController {
  constructor(private readonly svc: ReservasService) {}

  @Post()
  create(@Body() dto: CreateReservaDto, @CurrentUser() user: RequestUser) {
    return this.svc.create(dto, user.apartamentoId!, user.id);
  }

  @Delete(':id')
  deletarReserva(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.svc.cancelar(id, user.id, false);
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.svc.listMorador(user.apartamentoId!);
  }

  @Get('disponibilidade')
  disponibilidade(
    @Query('espaco') espaco: string,
    @Query('data') data: string,
  ) {
    if (!Object.values(Espaco).includes(espaco as Espaco)) {
      return { error: `espaco deve ser um de: ${Object.values(Espaco).join(', ')}` };
    }
    return this.svc.disponibilidade(espaco as Espaco, data);
  }
}

// ===== Admin =====
@Roles('admin')
@Controller('admin/reservas')
export class ReservasAdminController {
  constructor(
    private readonly svc: ReservasService,
    private readonly pdfSvc: PdfService,
  ) {}

  @Get('calendario')
  calendario(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.svc.listAdmin(inicio, fim);
  }

  @Get('relatorio.pdf')
  async relatorio(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Response() res: any,
  ) {
    const reservas = await this.svc.listAdminSync(inicio, fim);
    const pdf = this.pdfSvc.generateReservasReport(reservas);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-reservas-${new Date().toISOString().split('T')[0]}.pdf"`,
    );

    pdf.pipe(res);
  }

  @Delete(':id')
  cancelar(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.svc.cancelar(id, user.id, true);
  }
}

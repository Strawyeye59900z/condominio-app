import {
  IsEnum,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';
import { TipoEncomenda } from '@prisma/client';

export class CreateEncomendaDto {
  @IsString()
  apartamentoId!: string;

  @IsString()
  moradorId!: string;

  @IsEnum(TipoEncomenda)
  tipo!: TipoEncomenda;
}

export class UpdateEncomendaDto {
  @IsOptional()
  @IsString()
  moradorId?: string;

  @IsOptional()
  @IsEnum(TipoEncomenda)
  tipo?: TipoEncomenda;
}

export class ListEncomendasPorteiroDto {
  @IsOptional()
  @IsIn(['pendente', 'retirada', 'cancelada', 'todas'])
  status?: 'pendente' | 'retirada' | 'cancelada' | 'todas';
}

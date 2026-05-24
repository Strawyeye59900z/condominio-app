import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Espaco } from '@prisma/client';

export class CreateReservaDto {
  @IsEnum(Espaco)
  espaco!: Espaco;

  /** YYYY-MM-DD */
  @IsDateString()
  data!: string;

  /** Apenas para QUADRA: hora de início 0–23 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  horaInicio?: number;

  /** Apenas para QUADRA: duração 1–4 horas */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  duracaoHoras?: number;
}

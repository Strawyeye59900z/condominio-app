import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateApartamentoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'número aceita letras, números e hífen' })
  numero!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  senhaProvisoria?: string;
}

export class UpdateApartamentoDto {
  @IsOptional() @IsBoolean() resetarSenha?: boolean;
}

export class BulkApartamentosDto {
  @IsString()
  @MinLength(3)
  csv!: string;
}

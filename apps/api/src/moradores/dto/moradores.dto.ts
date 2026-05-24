import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// E.164: +5511999999999. Aceita 11 a 15 dígitos após o +.
const E164 = /^\+\d{11,15}$/;

export class CreateMoradorDto {
  @IsString() @MinLength(2) @MaxLength(120) nome!: string;

  @IsString()
  @Matches(E164, {
    message: 'telefone deve estar em formato E.164 (ex: +5511999999999)',
  })
  telefone!: string;
}

export class UpdateMoradorDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) nome?: string;
  @IsOptional() @IsString() @Matches(E164) telefone?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class AdminUpdateMoradorDto {
  @IsOptional() @IsBoolean() ativo?: boolean;
  // libera nova foto: zera fotoUrl/driveId/statusFacial → PENDENTE
  @IsOptional() @IsBoolean() resetFoto?: boolean;
}

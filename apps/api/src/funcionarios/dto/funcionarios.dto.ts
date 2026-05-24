import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateFuncionarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'loginId só aceita letras, números, ponto, hífen e underscore.',
  })
  loginId!: string;

  @IsString() @MinLength(2) @MaxLength(120) nome!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  senhaProvisoria?: string; // se omitido, sistema gera
}

export class UpdateFuncionarioDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) nome?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsBoolean() resetarSenha?: boolean; // gera nova senha provisória
}

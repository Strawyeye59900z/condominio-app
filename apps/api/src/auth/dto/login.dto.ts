import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginAdminDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(128) senha!: string;
}

export class LoginFuncionarioDto {
  @IsString() @MinLength(1) @MaxLength(64) loginId!: string;
  @IsString() @MinLength(4) @MaxLength(128) senha!: string;
}

export class LoginMoradorDto {
  @IsString() @MinLength(1) @MaxLength(16) numeroAp!: string;
  @IsString() @MinLength(4) @MaxLength(128) senha!: string;
}

export class ChangePasswordDto {
  @IsString() @MinLength(4) @MaxLength(128) senhaAtual!: string;
  @IsString() @MinLength(8) @MaxLength(128) novaSenha!: string;
}

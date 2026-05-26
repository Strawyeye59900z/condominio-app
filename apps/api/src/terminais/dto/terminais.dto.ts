import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateTerminalDto {
  @IsString() @MinLength(2) @MaxLength(80) nome!: string;
  @IsString() @MinLength(7) @MaxLength(64) host!: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) porta?: number;
  @IsString() @MinLength(1) @MaxLength(64) usuario!: string;
  @IsString() @MinLength(1) @MaxLength(128) senha!: string;
}

export class UpdateTerminalDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) nome?: string;
  @IsOptional() @IsString() @MinLength(7) @MaxLength(64) host?: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) porta?: number;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(64) usuario?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(128) senha?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

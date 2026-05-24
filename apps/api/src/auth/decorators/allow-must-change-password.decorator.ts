import { SetMetadata } from '@nestjs/common';

// Marca rotas que podem ser acessadas mesmo quando o usuário ainda precisa
// trocar a senha provisória (ex.: change-password, logout, /me).
export const ALLOW_MCP_KEY = 'allowMustChangePassword';
export const AllowMustChangePassword = () => SetMetadata(ALLOW_MCP_KEY, true);

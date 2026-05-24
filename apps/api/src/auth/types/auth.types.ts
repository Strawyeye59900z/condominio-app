export type UserRole = 'admin' | 'funcionario' | 'morador';

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  apartamentoId?: string;
  mustChangePassword?: boolean;
}

export interface JwtRefreshPayload {
  sub: string;
  role: UserRole;
}

export interface RequestUser {
  id: string;
  role: UserRole;
  apartamentoId?: string;
  mustChangePassword?: boolean;
}

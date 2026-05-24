/**
 * Sessão do usuário no client. Token guardado em sessionStorage
 * (refresh token fica em cookie httpOnly setado pelo backend).
 */

import type { LoginResponse } from './api';

const TOKEN_KEY = 'mhvl_token';
const USER_KEY = 'mhvl_user';

export type SessionUser = LoginResponse['user'];

export const session = {
  save(data: LoginResponse) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  },

  getUser(): SessionUser | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  },

  clear() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  /** Retorna a rota inicial baseado no perfil do usuário */
  getHomePath(user?: SessionUser): string {
    const u = user ?? this.getUser();
    if (!u) return '/';
    switch (u.role) {
      case 'admin': return '/admin';
      case 'funcionario': return '/porteiro';
      case 'morador': return '/me';
    }
    return '/';
  },
};

/**
 * API client centralizado para o backend NestJS.
 * - Em SSR/route handlers usa API_INTERNAL_URL (rede Docker).
 * - No browser usa rota relativa /api/v1 (proxy do Next.js).
 */

const API_BASE = typeof window === 'undefined'
  ? (process.env.API_INTERNAL_URL ?? 'http://api:3001') + '/api/v1'
  : '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, public body: any, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  token?: string;
  raw?: boolean; // se true, retorna a Response sem parse
}

export async function api<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, token, raw, headers, ...rest } = opts;

  const finalHeaders: Record<string, string> = {
    ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (raw) return res as any;

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'message' in data)
      ? (Array.isArray(data.message) ? data.message.join(', ') : String(data.message))
      : `Erro ${res.status}`;
    throw new ApiError(res.status, data, msg);
  }

  return data as T;
}

// ===== Endpoints tipados =====

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    role: 'admin' | 'funcionario' | 'morador';
    email?: string;
    nome?: string;
    numero?: string;
    apartamentoId?: string;
    mustChangePassword?: boolean;
  };
}

export const authApi = {
  loginAdmin: (email: string, senha: string) =>
    api<LoginResponse>('/auth/admin/login', { method: 'POST', body: { email, senha } }),

  loginFuncionario: (loginId: string, senha: string) =>
    api<LoginResponse>('/auth/funcionario/login', { method: 'POST', body: { loginId, senha } }),

  loginMorador: (numeroAp: string, senha: string) =>
    api<LoginResponse>('/auth/morador/login', { method: 'POST', body: { numeroAp, senha } }),

  changePassword: (token: string, senhaAtual: string, novaSenha: string) =>
    api('/auth/change-password', {
      method: 'POST',
      token,
      body: { senhaAtual, novaSenha },
    }),

  logout: (token?: string) =>
    api('/auth/logout', { method: 'POST', token }),

  refresh: () =>
    api<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),
};

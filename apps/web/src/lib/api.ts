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

// Helper interno: monta query string
function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ===== Tipos de domínio =====

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

export interface FuncionarioPublic {
  id: string;
  loginId: string;
  nome: string;
  fotoUrl: string | null;
}

export interface Encomenda {
  id: string;
  tipo: 'CAIXA' | 'ENVELOPE' | 'SACOLA';
  status: 'PENDENTE' | 'RETIRADA' | 'CANCELADA';
  recebidaEm: string;
  retiradaEm: string | null;
  editavelAte: string;
  whatsappStatus: 'PENDENTE' | 'ENVIADA' | 'FALHOU';
  apartamento: { id: string; numero: string };
  morador: { id: string; nome: string };
}

export interface Reserva {
  id: string;
  espaco: 'QUADRA' | 'CHURRASQUEIRA' | 'SALAO_FESTAS';
  data: string;           // ISO date "YYYY-MM-DD"
  horaInicio: number | null;
  duracaoHoras: number | null;
  canceladaEm: string | null;
  morador: { id: string; nome: string };
  apartamento: { id: string; numero: string };
}

export interface MoradorAdmin {
  id: string;
  nome: string;
  telefone: string;
  fotoUrl: string | null;
  statusFacial: 'PENDENTE' | 'REGISTRADO';
  isAdminAp: boolean;
  ativo: boolean;
  apartamento: { id: string; numero: string };
}

export interface FuncionarioAdmin {
  id: string;
  loginId: string;
  nome: string;
  fotoUrl: string | null;
  ativo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface ApartamentoLookup {
  id: string;
  numero: string;
  moradores: { id: string; nome: string; telefone: string }[];
}

// ===== Auth API =====

export const authApi = {
  loginAdmin: (email: string, senha: string) =>
    api<LoginResponse>('/auth/admin/login', { method: 'POST', body: { email, senha } }),

  loginFuncionario: (loginId: string, senha: string) =>
    api<LoginResponse>('/auth/funcionario/login', { method: 'POST', body: { loginId, senha } }),

  loginMorador: (numeroAp: string, senha: string) =>
    api<LoginResponse>('/auth/morador/login', { method: 'POST', body: { numeroAp, senha } }),

  listFuncionarios: () =>
    api<FuncionarioPublic[]>('/auth/funcionarios/list'),

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

// ===== Admin API =====

export const adminApi = {
  getMoradores: (token: string, params?: { statusFacial?: string; apartamentoId?: string }) =>
    api<MoradorAdmin[]>(`/admin/moradores${qs(params ?? {})}`, { token }),

  patchMorador: (token: string, id: string, body: { ativo?: boolean; resetFoto?: boolean }) =>
    api<MoradorAdmin>(`/admin/moradores/${id}`, { method: 'PATCH', token, body }),

  getFuncionarios: (token: string) =>
    api<FuncionarioAdmin[]>('/admin/funcionarios', { token }),

  createFuncionario: (token: string, body: { loginId: string; nome: string; senhaProvisoria: string }) =>
    api<FuncionarioAdmin>('/admin/funcionarios', { method: 'POST', token, body }),

  patchFuncionario: (token: string, id: string, body: { nome?: string; ativo?: boolean; resetarSenha?: boolean }) =>
    api<{ id: string; senhaProvisoria?: string }>(`/admin/funcionarios/${id}`, { method: 'PATCH', token, body }),

  getEncomendas: (token: string, status?: string) =>
    api<Encomenda[]>(`/admin/encomendas${qs({ status })}`, { token }),

  patchEncomenda: (token: string, id: string, body: { moradorId?: string; tipo?: string }) =>
    api<Encomenda>(`/admin/encomendas/${id}`, { method: 'PATCH', token, body }),

  getReservas: (token: string, params?: { inicio?: string; fim?: string }) =>
    api<Reserva[]>(`/admin/reservas/calendario${qs(params ?? {})}`, { token }),

  cancelarReserva: (token: string, id: string) =>
    api<void>(`/admin/reservas/${id}`, { method: 'DELETE', token }),

  getFacialNext: (token: string) =>
    api<MoradorAdmin | null>('/admin/facial-queue/next', { token, raw: false }),

  postFacialRegistrado: (token: string, moradorId: string) =>
    api<void>(`/admin/facial-queue/${moradorId}/registrado`, { method: 'POST', token }),

  getWhatsAppStatus: (token: string) =>
    api<{ connected: boolean; state: string; instance: string }>('/admin/whatsapp/status', { token }),

  getWhatsAppQrCode: (token: string) =>
    api<{ qrDataUrl: string } | null>('/admin/whatsapp/qrcode', { token }),

  disconnectWhatsApp: (token: string) =>
    api<void>('/admin/whatsapp/disconnect', { method: 'POST', token }),

  getRelatorio: (token: string, inicio: string, fim: string) =>
    api<Response>(`/admin/reservas/relatorio.pdf${qs({ inicio, fim })}`, { token, raw: true }),

  patchEncomendaAdmin: (token: string, id: string, body: { tipo?: string }) =>
    api<Encomenda>(`/admin/encomendas/${id}`, { method: 'PATCH', token, body }),
};

// ===== Porteiro API =====

export const porteiroApi = {
  getEncomendas: (token: string, status?: string) =>
    api<Encomenda[]>(`/porteiro/encomendas${qs({ status })}`, { token }),

  createEncomenda: (token: string, body: { apartamentoId: string; moradorId: string; tipo: string }) =>
    api<Encomenda>('/porteiro/encomendas', { method: 'POST', token, body }),

  patchEncomenda: (token: string, id: string, body: { moradorId?: string; tipo?: string }) =>
    api<Encomenda>(`/porteiro/encomendas/${id}`, { method: 'PATCH', token, body }),

  getApartamentos: (token: string) =>
    api<ApartamentoLookup[]>('/porteiro/apartamentos', { token }),
};

// ===== Tipos extras para /me =====

export interface MoradorDoAp {
  id: string;
  nome: string;
  telefone: string;
  fotoUrl: string | null;
  statusFacial: 'PENDENTE' | 'REGISTRADO';
  isAdminAp: boolean;
}

export interface MeResponse {
  role: 'morador';
  mustChangePassword: boolean;
  apartamento: { id: string; numero: string };
  moradores: MoradorDoAp[];
}

export interface SlotDisponibilidade {
  horaInicio: number;
  disponivel: boolean;
}

// ===== Morador API =====

export const moradorApi = {
  // Perfil completo (AP + moradores)
  getMe: (token: string) =>
    api<MeResponse>('/me', { token }),

  // Moradores do AP
  getMoradores: (token: string) =>
    api<MoradorDoAp[]>('/me/moradores', { token }),

  createMorador: (token: string, body: { nome: string; telefone: string }) =>
    api<MoradorDoAp>('/me/moradores', { method: 'POST', token, body }),

  updateMorador: (token: string, id: string, body: { nome?: string; telefone?: string }) =>
    api<MoradorDoAp>(`/me/moradores/${id}`, { method: 'PATCH', token, body }),

  deleteMorador: (token: string, id: string) =>
    api<void>(`/me/moradores/${id}`, { method: 'DELETE', token }),

  // Encomendas
  getEncomendas: (token: string, status?: string) =>
    api<Encomenda[]>(`/me/encomendas${qs({ status })}`, { token }),

  baixaEncomenda: (token: string, id: string) =>
    api<void>(`/me/encomendas/${id}/baixa`, { method: 'POST', token }),

  // Reservas
  getReservas: (token: string) =>
    api<Reserva[]>('/me/reservas', { token }),

  createReserva: (
    token: string,
    body: { espaco: string; data: string; horaInicio?: number; duracaoHoras?: number },
  ) => api<Reserva>('/me/reservas', { method: 'POST', token, body }),

  cancelarReserva: (token: string, id: string) =>
    api<void>(`/me/reservas/${id}`, { method: 'DELETE', token }),

  getDisponibilidade: (token: string, espaco: string, data: string) =>
    api<SlotDisponibilidade[]>(
      `/me/reservas/disponibilidade${qs({ espaco, data })}`,
      { token },
    ),

  // Foto & LGPD — endpoint: POST /me/foto/:moradorId
  consentLgpd: (token: string, moradorId: string) =>
    api<void>('/me/consent-lgpd', { method: 'POST', token, body: { moradorId, aceito: true } }),

  uploadFoto: (token: string, moradorId: string, file: File) => {
    const form = new FormData();
    form.append('foto', file);
    return api<{ fotoUrl: string }>(`/me/foto/${moradorId}`, { method: 'POST', token, body: form });
  },
};

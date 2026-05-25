'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, Search, RefreshCw, UserCheck, UserX, Camera, Loader2, X
} from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type MoradorAdmin } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

type AtivoFilter = 'todos' | 'ativos' | 'inativos';
type FacialFilter = 'todos' | 'PENDENTE' | 'REGISTRADO';

export default function MoradoresPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [moradores, setMoradores] = useState<MoradorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ativoFilter, setAtivoFilter] = useState<AtivoFilter>('ativos');
  const [facialFilter, setFacialFilter] = useState<FacialFilter>('todos');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  async function load(t: string) {
    setLoading(true);
    const list = await adminApi.getMoradores(t).catch(() => [] as MoradorAdmin[]);
    setMoradores(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    load(token);
  }, [token]);

  const filtered = moradores.filter(m => {
    if (ativoFilter === 'ativos' && !m.ativo) return false;
    if (ativoFilter === 'inativos' && m.ativo) return false;
    if (facialFilter !== 'todos' && m.statusFacial !== facialFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.nome.toLowerCase().includes(q) && !m.apartamento.numero.includes(q)) return false;
    }
    return true;
  });

  async function toggleAtivo(m: MoradorAdmin) {
    if (!token) return;
    setActionLoading(m.id);
    await adminApi.patchMorador(token, m.id, { ativo: !m.ativo }).catch(() => null);
    await load(token);
    setActionLoading(null);
    setConfirming(null);
  }

  async function resetFoto(m: MoradorAdmin) {
    if (!token) return;
    setActionLoading(m.id);
    await adminApi.patchMorador(token, m.id, { resetFoto: true }).catch(() => null);
    await load(token);
    setActionLoading(null);
    setConfirming(null);
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Moradores">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">Moradores</h2>
          <p className="text-sm text-ink/50 mt-1">{moradores.length} moradores cadastrados</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              placeholder="Buscar por nome ou AP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-bone-dark/60 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div className="flex gap-1 bg-bone rounded-xl p-1">
            {(['todos', 'ativos', 'inativos'] as AtivoFilter[]).map(f => (
              <button key={f} onClick={() => setAtivoFilter(f)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                  ativoFilter === f ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink')}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-bone rounded-xl p-1">
            {([['todos', 'Todos'], ['PENDENTE', 'Pendente'], ['REGISTRADO', 'Registrado']] as [FacialFilter, string][]).map(([f, l]) => (
              <button key={f} onClick={() => setFacialFilter(f)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  facialFilter === f ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink')}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => token && load(token)} className="p-2 rounded-xl border border-bone-dark/60 bg-white hover:bg-bone text-ink/60 hover:text-ink transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Users className="w-10 h-10 text-ink/20 mb-2" />
              <p className="text-sm text-ink/50">Nenhum morador encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bone-dark/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">AP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden md:table-cell">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden sm:table-cell">Facial</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, i) => (
                    <tr key={m.id} className={cn('border-b border-bone-dark/30 last:border-0', i % 2 === 0 ? 'bg-white' : 'bg-bone/30')}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-ink">{m.apartamento.numero}</span>
                        {m.isAdminAp && <span className="ml-1 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">Admin</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{m.nome}</td>
                      <td className="px-4 py-3 text-ink/60 hidden md:table-cell">{m.telefone}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          m.statusFacial === 'REGISTRADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                          {m.statusFacial === 'REGISTRADO' ? 'Registrado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          m.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-bone text-ink/40')}>
                          {m.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {actionLoading === m.id ? (
                            <Loader2 className="w-4 h-4 text-brand animate-spin" />
                          ) : confirming === m.id + '_foto' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-ink/50">Resetar foto?</span>
                              <button onClick={() => resetFoto(m)} className="text-xs text-red-600 font-medium hover:underline">Sim</button>
                              <button onClick={() => setConfirming(null)} className="text-xs text-ink/40 hover:underline">Não</button>
                            </div>
                          ) : confirming === m.id + '_ativo' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-ink/50">{m.ativo ? 'Desativar?' : 'Ativar?'}</span>
                              <button onClick={() => toggleAtivo(m)} className="text-xs text-brand font-medium hover:underline">Sim</button>
                              <button onClick={() => setConfirming(null)} className="text-xs text-ink/40 hover:underline">Não</button>
                            </div>
                          ) : (
                            <>
                              {m.fotoUrl && (
                                <button onClick={() => setConfirming(m.id + '_foto')} title="Resetar foto"
                                  className="p-1.5 rounded-lg text-ink/40 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => setConfirming(m.id + '_ativo')} title={m.ativo ? 'Desativar' : 'Ativar'}
                                className={cn('p-1.5 rounded-lg transition-colors',
                                  m.ativo ? 'text-ink/40 hover:text-red-500 hover:bg-red-50' : 'text-ink/40 hover:text-emerald-600 hover:bg-emerald-50')}>
                                {m.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <p className="text-xs text-ink/40 text-center">{filtered.length} de {moradores.length} moradores</p>
      </div>
    </AppShell>
  );
}

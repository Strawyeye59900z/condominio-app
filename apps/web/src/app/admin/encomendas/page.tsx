'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, RefreshCw, Loader2 } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type Encomenda } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

const TIPO_LABEL: Record<string, string> = { CAIXA: 'Caixa', ENVELOPE: 'Envelope', SACOLA: 'Sacola' };
const WA_LABEL: Record<string, string> = { ENVIADA: 'Enviado', FALHOU: 'Falhou', PENDENTE: 'Aguardando' };

function ptDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

type Tab = 'PENDENTE' | 'TODAS';

export default function EncomendasAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('PENDENTE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  async function load(t: string, status?: string) {
    setLoading(true);
    const list = await adminApi.getEncomendas(t, status).catch(() => [] as Encomenda[]);
    setEncomendas(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    load(token, tab === 'PENDENTE' ? 'PENDENTE' : undefined);
  }, [token, tab]);

  async function handleSaveEdit(id: string) {
    if (!token) return;
    setSaving(true);
    await adminApi.patchEncomendaAdmin(token, id, { tipo: editTipo }).catch(() => null);
    setSaving(false);
    setEditingId(null);
    load(token, tab === 'PENDENTE' ? 'PENDENTE' : undefined);
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Encomendas">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">Encomendas</h2>
          <p className="text-sm text-ink/50 mt-1">Visão geral do síndico — edição irrestrita</p>
        </motion.div>

        {/* Tabs + refresh */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="flex items-center gap-3">
          <div className="flex gap-1 bg-bone rounded-xl p-1">
            {(['PENDENTE', 'TODAS'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  tab === t ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink')}>
                {t === 'PENDENTE' ? 'Pendentes' : 'Todas'}
              </button>
            ))}
          </div>
          <button onClick={() => token && load(token, tab === 'PENDENTE' ? 'PENDENTE' : undefined)}
            className="p-2 rounded-xl border border-bone-dark/60 bg-white hover:bg-bone text-ink/60 hover:text-ink transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {!loading && <p className="text-xs text-ink/40">{encomendas.length} encomendas</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
          ) : encomendas.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Package className="w-10 h-10 text-ink/20 mb-2" />
              <p className="text-sm text-ink/50">Nenhuma encomenda encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bone-dark/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">AP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Morador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden sm:table-cell">Recebida</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden lg:table-cell">Porteiro</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden md:table-cell">WhatsApp</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {encomendas.map((enc, i) => (
                    <tr key={enc.id} className={cn('border-b border-bone-dark/30 last:border-0', i % 2 === 0 ? 'bg-white' : 'bg-bone/30')}>
                      <td className="px-4 py-3 font-mono font-semibold text-ink">{enc.apartamento.numero}</td>
                      <td className="px-4 py-3 font-medium text-ink">{enc.morador.nome}</td>
                      <td className="px-4 py-3">
                        {editingId === enc.id ? (
                          <select value={editTipo} onChange={e => setEditTipo(e.target.value)}
                            className="border border-brand/40 rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/30">
                            <option value="CAIXA">Caixa</option>
                            <option value="ENVELOPE">Envelope</option>
                            <option value="SACOLA">Sacola</option>
                          </select>
                        ) : (
                          <span className="text-ink/70">{TIPO_LABEL[enc.tipo]}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/50 hidden sm:table-cell">{ptDateTime(enc.recebidaEm)}</td>
                      <td className="px-4 py-3 text-ink/60 hidden lg:table-cell text-xs">{enc.funcionario?.nome ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          enc.status === 'PENDENTE' ? 'bg-amber-50 text-amber-600' :
                          enc.status === 'RETIRADA' ? 'bg-emerald-50 text-emerald-600' : 'bg-bone text-ink/40')}>
                          {enc.status === 'PENDENTE' ? 'Pendente' : enc.status === 'RETIRADA' ? 'Retirada' : 'Cancelada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          enc.whatsappStatus === 'ENVIADA' ? 'bg-emerald-50 text-emerald-600' :
                          enc.whatsappStatus === 'FALHOU' ? 'bg-red-50 text-red-600' : 'bg-bone text-ink/40')}>
                          {WA_LABEL[enc.whatsappStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {saving && editingId === enc.id ? (
                            <Loader2 className="w-4 h-4 text-brand animate-spin" />
                          ) : editingId === enc.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(enc.id)}
                                className="text-xs text-brand font-medium hover:underline">Salvar</button>
                              <button onClick={() => setEditingId(null)}
                                className="text-xs text-ink/40 hover:underline">Cancelar</button>
                            </>
                          ) : (
                            <button onClick={() => { setEditingId(enc.id); setEditTipo(enc.tipo); }}
                              className="text-xs text-ink/50 hover:text-brand hover:underline font-medium">
                              Editar
                            </button>
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
      </div>
    </AppShell>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Send,
  History,
  Building2,
  Pencil,
} from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import {
  porteiroApi,
  type Encomenda,
  type ApartamentoLookup,
  ApiError,
} from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_OPTS = [
  { value: 'CAIXA', label: '📦 Caixa' },
  { value: 'ENVELOPE', label: '✉️ Envelope' },
  { value: 'SACOLA', label: '🛍️ Sacola' },
] as const;

const TIPO_LABEL: Record<string, string> = {
  CAIXA: '📦 Caixa',
  ENVELOPE: '✉️ Envelope',
  SACOLA: '🛍️ Sacola',
};

const TIPO_LABEL_PLAIN: Record<string, string> = {
  CAIXA: 'Caixa',
  ENVELOPE: 'Envelope',
  SACOLA: 'Sacola',
};

function ptTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ptDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function wasToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function minutesAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function canEdit(enc: Encomenda) {
  return new Date(enc.editavelAte) > new Date();
}

// ── Register modal ────────────────────────────────────────────────────────────

interface RegisterModalProps {
  token: string;
  apartamentos: ApartamentoLookup[];
  onClose: () => void;
  onSuccess: (enc: Encomenda) => void;
}

function RegisterModal({ token, apartamentos, onClose, onSuccess }: RegisterModalProps) {
  const [search, setSearch] = useState('');
  const [selectedAp, setSelectedAp] = useState<ApartamentoLookup | null>(null);
  const [moradorId, setMoradorId] = useState('');
  const [tipo, setTipo] = useState<'CAIXA' | 'ENVELOPE' | 'SACOLA'>('CAIXA');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = search.length >= 1
    ? apartamentos.filter(a => a.numero.toLowerCase().includes(search.toLowerCase()))
    : apartamentos;

  function handleSelectAp(ap: ApartamentoLookup) {
    setSelectedAp(ap);
    setMoradorId(ap.moradores[0]?.id ?? '');
    setSearch('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAp || !moradorId) return;
    setError(null);
    start(async () => {
      try {
        const enc = await porteiroApi.createEncomenda(token, {
          apartamentoId: selectedAp.id,
          moradorId,
          tipo,
        });
        onSuccess(enc);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao registrar encomenda.');
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bone-dark/60">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-brand" />
            <h2 className="font-display font-bold text-sm text-ink">Nova Encomenda</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-bone transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Apartamento</label>
            {selectedAp ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-brand/8 border border-brand/20">
                <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-display font-bold text-sm">
                  {selectedAp.numero.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">AP {selectedAp.numero}</p>
                  <p className="text-xs text-ink/50">{selectedAp.moradores.length} morador(es)</p>
                </div>
                <button type="button" onClick={() => { setSelectedAp(null); setMoradorId(''); }} className="text-ink/40 hover:text-ink">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/30" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar nº do AP..." autoFocus className="input pl-9"
                />
                {search.length >= 1 && filtered.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl border border-bone-dark shadow-lg max-h-48 overflow-y-auto">
                    {filtered.slice(0, 8).map(ap => (
                      <button key={ap.id} type="button" onClick={() => handleSelectAp(ap)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bone text-left transition-colors">
                        <span className="font-semibold text-sm text-ink">AP {ap.numero}</span>
                        <span className="text-xs text-ink/50">{ap.moradores.map(m => m.nome).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                )}
                {search.length >= 1 && filtered.length === 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-xl border border-bone-dark shadow-lg px-4 py-3">
                    <p className="text-xs text-ink/50">Nenhum apartamento encontrado.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedAp && selectedAp.moradores.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1.5">Destinatário</label>
              <div className="relative">
                <select value={moradorId} onChange={e => setMoradorId(e.target.value)} required className="input appearance-none pr-8">
                  {selectedAp.moradores.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Tipo de encomenda</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPO_OPTS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setTipo(opt.value)}
                  className={cn('py-2.5 rounded-xl text-xs font-semibold border transition-all',
                    tipo === opt.value ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-ink border-bone-dark hover:border-brand')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={pending || !selectedAp || !moradorId} className="btn-primary w-full">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : 'Registrar encomenda'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  enc: Encomenda;
  token: string;
  apartamentos: ApartamentoLookup[];
  onClose: () => void;
  onSuccess: (enc: Encomenda) => void;
}

function EditModal({ enc, token, apartamentos, onClose, onSuccess }: EditModalProps) {
  const ap = apartamentos.find(a => a.id === enc.apartamento.id);
  const [moradorId, setMoradorId] = useState(enc.morador.id);
  const [tipo, setTipo] = useState<'CAIXA' | 'ENVELOPE' | 'SACOLA'>(enc.tipo);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const updated = await porteiroApi.patchEncomenda(token, enc.id, { moradorId, tipo });
        onSuccess(updated);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao editar encomenda.');
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bone-dark/60">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-brand" />
            <h2 className="font-display font-bold text-sm text-ink">Editar Encomenda</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-bone transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* AP read-only */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-bone border border-bone-dark/40">
            <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-display font-bold text-sm">
              {enc.apartamento.numero.slice(0, 3)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">AP {enc.apartamento.numero}</p>
              <p className="text-xs text-ink/50">Apartamento fixo</p>
            </div>
          </div>

          {ap && ap.moradores.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1.5">Destinatário</label>
              <div className="relative">
                <select value={moradorId} onChange={e => setMoradorId(e.target.value)} className="input appearance-none pr-8">
                  {ap.moradores.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Tipo de encomenda</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPO_OPTS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setTipo(opt.value)}
                  className={cn('py-2.5 rounded-xl text-xs font-semibold border transition-all',
                    tipo === opt.value ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-ink border-bone-dark hover:border-brand')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar alterações'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'pendentes' | 'historico' | 'apartamentos';

export default function PorteiroDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [pendentes, setPendentes] = useState<Encomenda[] | null>(null);
  const [historico, setHistorico] = useState<Encomenda[] | null>(null);
  const [apartamentos, setApartamentos] = useState<ApartamentoLookup[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>('pendentes');
  const [showModal, setShowModal] = useState(false);
  const [editEnc, setEditEnc] = useState<Encomenda | null>(null);
  const [justRegistered, setJustRegistered] = useState<Encomenda | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'funcionario') { router.push('/'); return; }
    if (!u.fotoUrl) { router.push('/porteiro/foto'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    Promise.allSettled([
      porteiroApi.getEncomendas(token, 'PENDENTE'),
      porteiroApi.getEncomendas(token, 'RETIRADA'),
      porteiroApi.getApartamentos(token),
    ]).then(([pend, hist, aps]) => {
      if (pend.status === 'fulfilled') setPendentes(pend.value);
      if (hist.status === 'fulfilled') setHistorico(hist.value);
      if (aps.status === 'fulfilled') setApartamentos(aps.value);
      setLoading(false);
    });
  }, [token]);

  async function handleReenviarWhatsapp(encId: string) {
    if (!token || resending) return;
    setResending(encId);
    try {
      await porteiroApi.reenviarWhatsapp(token, encId);
      setPendentes(prev => (prev ?? []).map(e => e.id === encId ? { ...e, whatsappStatus: 'PENDENTE' } : e));
    } finally {
      setResending(null);
    }
  }

  function handleNewEncomenda(enc: Encomenda) {
    setPendentes(prev => [enc, ...(prev ?? [])]);
    setShowModal(false);
    setJustRegistered(enc);
    setTimeout(() => setJustRegistered(null), 4000);
  }

  function handleEditSuccess(updated: Encomenda) {
    setPendentes(prev => (prev ?? []).map(e => e.id === updated.id ? updated : e));
    setEditEnc(null);
  }

  if (!user) return null;

  const todayCount = (pendentes ?? []).filter(e => wasToday(e.recebidaEm)).length;
  const displayName = user.nome ?? 'Porteiro';

  return (
    <AppShell user={user} title="Portaria">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-xl text-ink">Olá, {displayName.split(' ')[0]}! 👋</h2>
          <p className="text-sm text-ink/50 mt-1">
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </motion.div>

        {/* Success toast */}
        <AnimatePresence>
          {justRegistered && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Encomenda registrada! AP {justRegistered.apartamento.numero}</p>
                <p className="text-xs text-emerald-600">Notificação WhatsApp enviada para {justRegistered.morador.nome}.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA: Nova encomenda */}
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          onClick={() => setShowModal(true)}
          disabled={loading || !apartamentos}
          className="w-full bg-brand text-white rounded-2xl p-5 flex items-center gap-4 hover:bg-brand-light active:scale-[0.99] transition-all shadow-sm disabled:opacity-60 group"
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-lg leading-none">Registrar Encomenda</p>
            <p className="text-white/70 text-xs mt-1">Registrar nova entrega na portaria</p>
          </div>
        </motion.button>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
          className="grid grid-cols-3 gap-1 bg-bone rounded-xl p-1">
          {([
            { key: 'pendentes' as Tab, label: 'Pendentes', icon: Clock, count: pendentes?.length ?? 0 },
            { key: 'historico' as Tab, label: 'Histórico', icon: History, count: historico?.length ?? 0 },
            { key: 'apartamentos' as Tab, label: 'Apartamentos', icon: Building2, count: null },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink')}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {!loading && t.count !== null && t.count > 0 && (
                <span className={cn('w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center',
                  tab === t.key ? 'bg-brand text-white' : 'bg-bone-dark text-ink/60')}>
                  {t.count > 9 ? '9+' : t.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'pendentes' && (
            <motion.div key="pendentes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="card space-y-3">
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-bone rounded-xl animate-pulse" />)}</div>
              ) : (pendentes ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium text-ink/60">Nenhuma encomenda pendente</p>
                  <p className="text-xs text-ink/40 mt-1">Tudo limpo por agora!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(pendentes ?? []).map(enc => {
                    const mins = minutesAgo(enc.recebidaEm);
                    const editable = canEdit(enc);
                    return (
                      <div key={enc.id}
                        className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all',
                          wasToday(enc.recebidaEm) && mins < 15 ? 'bg-amber-50 border-amber-200' : 'bg-white border-bone-dark/50')}>
                        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 font-display font-bold text-sm text-brand">
                          {enc.apartamento.numero.slice(0, 3)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink truncate">
                            AP {enc.apartamento.numero} · {enc.morador.nome.split(' ')[0]}
                          </p>
                          <p className="text-xs text-ink/50">
                            {TIPO_LABEL_PLAIN[enc.tipo]} · {mins < 60 ? `há ${mins}min` : ptTime(enc.recebidaEm)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                            enc.whatsappStatus === 'ENVIADA' ? 'bg-emerald-50 text-emerald-600' :
                            enc.whatsappStatus === 'FALHOU' ? 'bg-red-50 text-red-600' : 'bg-bone text-ink/50')}>
                            {enc.whatsappStatus === 'ENVIADA' ? '✓ Notif.' : enc.whatsappStatus === 'FALHOU' ? '✗ Falhou' : '⏳'}
                          </span>
                          {enc.whatsappStatus === 'FALHOU' && (
                            <button onClick={() => handleReenviarWhatsapp(enc.id)} disabled={resending === enc.id}
                              className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:underline disabled:opacity-50">
                              {resending === enc.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Send className="w-2.5 h-2.5" />}
                              Reenviar
                            </button>
                          )}
                          {editable && (
                            <button onClick={() => setEditEnc(enc)}
                              className="flex items-center gap-1 text-[10px] font-semibold text-ink/50 hover:text-brand hover:underline">
                              <Pencil className="w-2.5 h-2.5" /> Editar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'historico' && (
            <motion.div key="historico" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="card space-y-3">
              <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Encomendas retiradas</p>
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-bone rounded-xl animate-pulse" />)}</div>
              ) : (historico ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <History className="w-10 h-10 text-ink/20 mb-2" />
                  <p className="text-sm font-medium text-ink/60">Nenhum histórico ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(historico ?? []).map(enc => (
                    <div key={enc.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-bone-dark/50">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 font-display font-bold text-sm text-emerald-600">
                        {enc.apartamento.numero.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">
                          AP {enc.apartamento.numero} · {enc.morador.nome.split(' ')[0]}
                        </p>
                        <p className="text-xs text-ink/50">
                          {TIPO_LABEL_PLAIN[enc.tipo]} · recebida {ptDateTime(enc.recebidaEm)}
                        </p>
                        {enc.retiradaEm && (
                          <p className="text-xs text-emerald-600">Retirada {ptDateTime(enc.retiradaEm)}</p>
                        )}
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'apartamentos' && (
            <motion.div key="apartamentos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} className="space-y-2">
              {loading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-bone rounded-xl animate-pulse" />)}
                </div>
              ) : (apartamentos ?? []).length === 0 ? (
                <div className="card flex flex-col items-center py-10 text-center">
                  <Building2 className="w-10 h-10 text-ink/20 mb-2" />
                  <p className="text-sm text-ink/50">Nenhum apartamento cadastrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(apartamentos ?? []).map(ap => {
                    const apPendentes = (pendentes ?? []).filter(e => e.apartamento.id === ap.id);
                    return (
                      <div key={ap.id}
                        className={cn('card p-3 space-y-1.5 cursor-default',
                          apPendentes.length > 0 ? 'border-amber-200 bg-amber-50' : '')}>
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-base text-ink">AP {ap.numero}</span>
                          {apPendentes.length > 0 && (
                            <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                              {apPendentes.length}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/50 leading-snug truncate">
                          {ap.moradores.length > 0
                            ? ap.moradores.map(m => m.nome.split(' ')[0]).join(', ')
                            : 'Sem moradores'}
                        </p>
                        {apPendentes.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-amber-200">
                            {apPendentes.map(e => (
                              <p key={e.id} className="text-[11px] text-amber-700 font-medium">
                                {TIPO_LABEL[e.tipo]} · {minutesAgo(e.recebidaEm) < 60
                                  ? `${minutesAgo(e.recebidaEm)}min`
                                  : ptTime(e.recebidaEm)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {!loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <p className="font-display font-bold text-2xl text-ink">{todayCount}</p>
              <p className="text-xs text-ink/50 mt-0.5">registradas hoje</p>
            </div>
            <div className="card text-center">
              <p className="font-display font-bold text-2xl text-ink">{pendentes?.length ?? 0}</p>
              <p className="text-xs text-ink/50 mt-0.5">aguardando retirada</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && token && apartamentos && (
          <RegisterModal token={token} apartamentos={apartamentos}
            onClose={() => setShowModal(false)} onSuccess={handleNewEncomenda} />
        )}
        {editEnc && token && apartamentos && (
          <EditModal enc={editEnc} token={token} apartamentos={apartamentos}
            onClose={() => setEditEnc(null)} onSuccess={handleEditSuccess} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

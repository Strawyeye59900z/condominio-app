'use client';

import { useEffect, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { moradorApi, type Reserva, type SlotDisponibilidade, ApiError } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

// ── constants ────────────────────────────────────────────────────────────────

const ESPACOS = [
  { value: 'QUADRA',        label: 'Quadra',         emoji: '🏀', desc: 'Cota de 4h/dia por AP' },
  { value: 'CHURRASQUEIRA', label: 'Churrasqueira',  emoji: '🍖', desc: 'Diária exclusiva' },
  { value: 'SALAO_FESTAS',  label: 'Salão de Festas',emoji: '🎉', desc: 'Diária exclusiva' },
] as const;

type EspacoValue = 'QUADRA' | 'CHURRASQUEIRA' | 'SALAO_FESTAS';

const ESPACO_COLOR: Record<EspacoValue, string> = {
  QUADRA:        'bg-emerald-50 text-emerald-700 border-emerald-200',
  CHURRASQUEIRA: 'bg-orange-50 text-orange-700 border-orange-200',
  SALAO_FESTAS:  'bg-purple-50 text-purple-700 border-purple-200',
};

const DURACAO_OPTS = [1, 2, 3, 4];

// ── helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function maxDateStr() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split('T')[0];
}

function ptDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00'); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function canCancel(r: Reserva): boolean {
  if (r.espaco === 'QUADRA') {
    // livre até o início do horário
    return r.canceladaEm === null;
  }
  // churrasqueira / salão: até o dia anterior
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  ontem.setHours(0, 0, 0, 0);
  const dataRes = new Date(r.data + 'T00:00:00');
  return r.canceladaEm === null && dataRes > ontem;
}

// ── Nova reserva modal ────────────────────────────────────────────────────────

interface NovaReservaModalProps {
  token: string;
  onClose: () => void;
  onSuccess: (r: Reserva) => void;
}

function NovaReservaModal({ token, onClose, onSuccess }: NovaReservaModalProps) {
  const [espaco, setEspaco] = useState<EspacoValue>('QUADRA');
  const [data, setData] = useState('');
  const [horaInicio, setHoraInicio] = useState<number>(8);
  const [duracao, setDuracao] = useState<number>(2);
  const [slots, setSlots] = useState<SlotDisponibilidade[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Busca disponibilidade da quadra quando muda data ou espaço
  useEffect(() => {
    if (espaco !== 'QUADRA' || !data) { setSlots(null); return; }
    setLoadingSlots(true);
    moradorApi.getDisponibilidade(token, espaco, data)
      .then(s => setSlots(s))
      .catch(() => setSlots(null))
      .finally(() => setLoadingSlots(false));
  }, [espaco, data, token]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setError(null);
    start(async () => {
      try {
        const body: Parameters<typeof moradorApi.createReserva>[1] = { espaco, data };
        if (espaco === 'QUADRA') {
          body.horaInicio = horaInicio;
          body.duracaoHoras = duracao;
        }
        const r = await moradorApi.createReserva(token, body);
        onSuccess(r);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao criar reserva.');
      }
    });
  }

  const slotsLivres = (slots ?? []).filter(s => s.disponivel);
  const horaOcupada = slots
    ? !slots.find(s => s.horaInicio === horaInicio)?.disponivel
    : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-bone-dark/60 z-10">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            <h2 className="font-display font-bold text-sm text-ink">Nova Reserva</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-bone transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* Espaço */}
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-2">Espaço</label>
            <div className="space-y-2">
              {ESPACOS.map(e => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => setEspaco(e.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    espaco === e.value
                      ? 'border-brand bg-brand/5 shadow-sm'
                      : 'border-bone-dark hover:border-brand/40',
                  )}
                >
                  <span className="text-xl">{e.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{e.label}</p>
                    <p className="text-xs text-ink/50">{e.desc}</p>
                  </div>
                  {espaco === e.value && (
                    <CheckCircle2 className="w-4 h-4 text-brand ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <label htmlFor="res-data" className="block text-xs font-semibold text-ink/70 mb-1.5">
              Data
            </label>
            <input
              id="res-data"
              type="date"
              required
              min={todayStr()}
              max={maxDateStr()}
              value={data}
              onChange={e => setData(e.target.value)}
              className="input"
            />
            <p className="text-[11px] text-ink/40 mt-1">Máximo 90 dias à frente.</p>
          </div>

          {/* Hora / Duração (apenas quadra) */}
          {espaco === 'QUADRA' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1.5">
                  Horário de início
                </label>
                {loadingSlots ? (
                  <div className="h-10 bg-bone rounded-xl animate-pulse" />
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 14 }, (_, i) => i + 7).map(h => {
                      const slot = slots?.find(s => s.horaInicio === h);
                      const ocupado = slot ? !slot.disponivel : false;
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={ocupado || !data}
                          onClick={() => setHoraInicio(h)}
                          className={cn(
                            'py-2 rounded-lg text-xs font-semibold border transition-all',
                            horaInicio === h
                              ? 'bg-brand text-white border-brand'
                              : ocupado
                              ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed line-through'
                              : 'bg-white text-ink border-bone-dark hover:border-brand',
                          )}
                        >
                          {String(h).padStart(2, '0')}h
                        </button>
                      );
                    })}
                  </div>
                )}
                {data && slots && slotsLivres.length === 0 && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Quadra sem horários disponíveis neste dia.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1.5">
                  Duração
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DURACAO_OPTS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuracao(d)}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-semibold border transition-all',
                        duracao === d
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white text-ink border-bone-dark hover:border-brand',
                      )}
                    >
                      {d}h
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink/40 mt-1">
                  Cota máxima: 4h por AP por dia.
                </p>
              </div>
            </>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={pending || !data || (espaco === 'QUADRA' && horaOcupada)}
            className="btn-primary w-full"
          >
            {pending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Reservando...</>
              : 'Confirmar reserva'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReservasPage() {
  const { user, token, ready } = useAuth('morador');

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [canceling, startCancel] = useTransition();
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    moradorApi.getReservas(token)
      .then(rs => setReservas(rs.filter(r => r.canceladaEm === null)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  function handleNovaReserva(r: Reserva) {
    setReservas(prev => [...prev, r].sort((a, b) => a.data.localeCompare(b.data)));
    setShowModal(false);
  }

  function handleCancelar(id: string) {
    if (!token) return;
    setCancelErr(null);
    startCancel(async () => {
      try {
        await moradorApi.cancelarReserva(token, id);
        setReservas(prev => prev.filter(r => r.id !== id));
        setCancelId(null);
      } catch (err) {
        setCancelErr(err instanceof ApiError ? err.message : 'Erro ao cancelar.');
      }
    });
  }

  if (!ready) return null;

  const hoje = todayStr();
  const upcoming = reservas.filter(r => r.data >= hoje);
  const past = reservas.filter(r => r.data < hoje);

  return (
    <AppShell user={user!} title="Reservas">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-xl text-ink">Minhas Reservas</h2>
            <p className="text-xs text-ink/50 mt-1">Espaços comuns do condomínio.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary py-2 px-4 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Nova reserva
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-bone rounded-2xl animate-pulse" />)}
          </div>
        ) : upcoming.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <Calendar className="w-14 h-14 text-ink/20 mb-3" />
            <p className="font-semibold text-ink/60">Nenhuma reserva futura</p>
            <p className="text-xs text-ink/40 mt-1 mb-4">Reserve a quadra, churrasqueira ou salão.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary py-2 px-5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Fazer reserva
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {upcoming.map(r => {
                const days = daysUntil(r.data);
                const colorCls = ESPACO_COLOR[r.espaco as EspacoValue] ?? 'bg-bone text-ink/50 border-bone-dark';
                const isCanceling = cancelId === r.id;
                const canCancelThis = canCancel(r);

                return (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-2xl border border-bone-dark/60 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', colorCls)}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-ink">
                          {ESPACOS.find(e => e.value === r.espaco)?.label}
                        </p>
                        <p className="text-xs text-ink/60 mt-0.5">
                          {ptDate(r.data)}
                          {r.horaInicio != null
                            ? ` · ${String(r.horaInicio).padStart(2, '0')}h`
                            : ''}
                          {r.duracaoHoras != null ? ` (${r.duracaoHoras}h)` : ''}
                        </p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                        days === 0 ? 'bg-emerald-50 text-emerald-700'
                          : days === 1 ? 'bg-amber-50 text-amber-700'
                          : 'bg-bone text-ink/50',
                      )}>
                        {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `em ${days}d`}
                      </span>
                    </div>

                    {/* Cancelamento */}
                    {canCancelThis && (
                      <div className="mt-3">
                        {cancelErr && isCanceling && (
                          <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{cancelErr}
                          </p>
                        )}
                        <AnimatePresence mode="wait">
                          {!isCanceling ? (
                            <motion.button
                              key="btn"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              type="button"
                              onClick={() => { setCancelErr(null); setCancelId(r.id); }}
                              className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Cancelar reserva
                            </motion.button>
                          ) : (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <p className="text-xs text-ink/60 flex-1">Confirma o cancelamento?</p>
                              <button
                                onClick={() => setCancelId(null)}
                                className="btn-secondary py-1 px-3 text-xs"
                                disabled={canceling}
                              >
                                Não
                              </button>
                              <button
                                onClick={() => handleCancelar(r.id)}
                                disabled={canceling}
                                className="text-xs bg-red-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                {canceling ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim'}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {!canCancelThis && r.espaco !== 'QUADRA' && (
                      <p className="mt-2 text-[11px] text-ink/40">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Cancelamento encerrado (prazo: até o dia anterior).
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Reservas passadas */}
        {!loading && past.length > 0 && (
          <details className="group">
            <summary className="text-xs font-semibold text-ink/50 cursor-pointer select-none list-none flex items-center gap-2 hover:text-ink transition-colors">
              <span className="w-4 h-4 border border-bone-dark rounded flex items-center justify-center text-[10px] group-open:rotate-90 transition-transform">▸</span>
              {past.length} reserva{past.length > 1 ? 's' : ''} passada{past.length > 1 ? 's' : ''}
            </summary>
            <div className="mt-3 space-y-2">
              {past.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-bone/60 opacity-60">
                  <MapPin className="w-4 h-4 text-ink/30 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-ink/60">
                      {ESPACOS.find(e => e.value === r.espaco)?.label}
                    </p>
                    <p className="text-[11px] text-ink/40">{ptDate(r.data)}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && token && (
          <NovaReservaModal
            token={token}
            onClose={() => setShowModal(false)}
            onSuccess={handleNovaReserva}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

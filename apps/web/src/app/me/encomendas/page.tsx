'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { moradorApi, type Encomenda, ApiError } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

// ── helpers ─────────────────────────────────────────────────────────────────

const TIPO_ICON: Record<string, string> = {
  CAIXA: '📦',
  ENVELOPE: '✉️',
  SACOLA: '🛍️',
};

const TIPO_LABEL: Record<string, string> = {
  CAIXA: 'Caixa',
  ENVELOPE: 'Envelope',
  SACOLA: 'Sacola',
};

function ptDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function wasToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
}

// ── Encomenda card ────────────────────────────────────────────────────────────

function EncomendaCard({
  enc,
  onBaixa,
}: {
  enc: Encomenda;
  onBaixa: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isNew = wasToday(enc.recebidaEm);

  async function handleBaixa() {
    setErr(null);
    setLoading(true);
    try {
      await onBaixa(enc.id);
      // sucesso: o card será desmontado pelo pai — não precisa resetar loading
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Erro ao confirmar retirada.');
      setConfirming(false);
      setLoading(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'rounded-2xl border p-4 space-y-3 transition-colors',
        isNew ? 'bg-amber-50 border-amber-200' : 'bg-white border-bone-dark/60',
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0',
          isNew ? 'bg-amber-100' : 'bg-bone',
        )}>
          {TIPO_ICON[enc.tipo]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-ink">
            {TIPO_LABEL[enc.tipo]}
            {isNew && (
              <span className="ml-2 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                NOVO
              </span>
            )}
          </p>
          <p className="text-xs text-ink/50 mt-0.5">
            Recebida em {ptDateTime(enc.recebidaEm)}
          </p>
        </div>
        {/* WhatsApp badge */}
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 self-start',
          enc.whatsappStatus === 'ENVIADA'
            ? 'bg-emerald-50 text-emerald-700'
            : enc.whatsappStatus === 'FALHOU'
            ? 'bg-red-50 text-red-600'
            : 'bg-bone text-ink/50',
        )}>
          {enc.whatsappStatus === 'ENVIADA'
            ? '✓ Notificado'
            : enc.whatsappStatus === 'FALHOU'
            ? '✗ Sem notif.'
            : '⏳ Aguardando'}
        </span>
      </div>

      {/* Error */}
      {err && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />{err}
        </p>
      )}

      {/* Baixa action */}
      <AnimatePresence mode="wait">
        {!confirming ? (
          <motion.button
            key="btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full btn-primary py-2 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmar retirada
          </motion.button>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <p className="text-xs text-ink/70 flex-1 self-center">Confirma a retirada?</p>
            <button
              onClick={() => setConfirming(false)}
              className="btn-secondary py-1.5 px-3 text-xs"
              disabled={loading}
            >
              Não
            </button>
            <button
              onClick={handleBaixa}
              disabled={loading}
              className="btn-primary py-1.5 px-3 text-xs"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Sim, retirei'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'pendentes' | 'historico';

export default function EncomendasPage() {
  const { user, token, ready } = useAuth('morador');

  const [pendentes, setPendentes] = useState<Encomenda[]>([]);
  const [historico, setHistorico] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pendentes');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      moradorApi.getEncomendas(token, 'PENDENTE'),
      moradorApi.getEncomendas(token, 'RETIRADA'),
    ]).then(([pend, hist]) => {
      setPendentes(pend);
      setHistorico(hist);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  async function handleBaixa(id: string) {
    if (!token) return;
    try {
      await moradorApi.baixaEncomenda(token, id);
      // Re-fetch para garantir que a lista reflita o BD (evita glitches de estado)
      const [pend, hist] = await Promise.all([
        moradorApi.getEncomendas(token, 'PENDENTE'),
        moradorApi.getEncomendas(token, 'RETIRADA'),
      ]);
      setPendentes(Array.isArray(pend) ? pend : []);
      setHistorico(Array.isArray(hist) ? hist : []);
    } catch (err) {
      console.error('Erro ao confirmar retirada:', err);
      throw err;
    }
  }

  if (!ready) return null;

  return (
    <AppShell user={user!} title="Encomendas">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h2 className="font-display font-extrabold text-xl text-ink">Minhas Encomendas</h2>
          <p className="text-xs text-ink/50 mt-1">Retire na portaria com o porteiro.</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-bone rounded-xl p-1.5">
          {([
            { key: 'pendentes', label: 'Pendentes', icon: Clock, count: pendentes.length },
            { key: 'historico', label: 'Histórico', icon: History, count: historico.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all',
                tab === t.key
                  ? 'bg-white text-brand shadow-sm'
                  : 'text-ink/60 hover:text-ink',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {!loading && t.count > 0 && (
                <span className={cn(
                  'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                  tab === t.key ? 'bg-brand text-white' : 'bg-bone-dark text-ink/60',
                )}>
                  {t.count > 9 ? '9+' : t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-bone rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : tab === 'pendentes' ? (
          pendentes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-3" />
              <p className="font-semibold text-ink/70">Nenhuma encomenda aguardando</p>
              <p className="text-xs text-ink/40 mt-1">
                Quando chegar algo na portaria, você será notificado pelo WhatsApp.
              </p>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendentes.map(enc => (
                  <EncomendaCard key={enc.id} enc={enc} onBaixa={handleBaixa} />
                ))}
              </AnimatePresence>
            </motion.div>
          )
        ) : (
          historico.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <Package className="w-14 h-14 text-ink/20 mb-3" />
              <p className="font-semibold text-ink/60">Nenhum histórico ainda</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {historico.map(enc => (
                <div
                  key={enc.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-bone-dark/60"
                >
                  <div className="w-9 h-9 rounded-xl bg-bone flex items-center justify-center text-lg shrink-0">
                    {TIPO_ICON[enc.tipo]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{TIPO_LABEL[enc.tipo]}</p>
                    <p className="text-xs text-ink/50">
                      Recebida {ptDateTime(enc.recebidaEm)}
                      {enc.funcionario && ` · ${enc.funcionario.nome.split(' ')[0]}`}
                    </p>
                    {enc.retiradaEm && (
                      <p className="text-xs text-emerald-600">
                        Retirada {ptDateTime(enc.retiradaEm)}
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}

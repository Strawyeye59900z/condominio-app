'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  Calendar,
  User,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Star,
} from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { moradorApi, type Encomenda, type Reserva } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

// ── Helpers ─────────────────────────────────────────────────────────────────

const ESPACO_LABEL: Record<string, string> = {
  QUADRA: 'Quadra',
  CHURRASQUEIRA: 'Churrasqueira',
  SALAO_FESTAS: 'Salão de Festas',
};

const ESPACO_COLOR: Record<string, string> = {
  QUADRA: 'bg-emerald-50 text-emerald-600',
  CHURRASQUEIRA: 'bg-orange-50 text-orange-600',
  SALAO_FESTAS: 'bg-purple-50 text-purple-600',
};

const TIPO_LABEL: Record<string, string> = {
  CAIXA: '📦 Caixa',
  ENVELOPE: '✉️ Envelope',
  SACOLA: '🛍️ Sacola',
};

function ptDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function ptDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// ── Quick action ──────────────────────────────────────────────────────────────

function QuickAction({
  label,
  href,
  icon: Icon,
  accent,
  badge,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-bone-dark/60 hover:border-brand hover:shadow-sm transition-all group relative"
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold text-ink text-center leading-tight">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MoradorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [encomendas, setEncomendas] = useState<Encomenda[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'morador') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    Promise.allSettled([
      moradorApi.getEncomendas(token, 'PENDENTE'),
      moradorApi.getReservas(token),
    ]).then(([enc, res]) => {
      if (enc.status === 'fulfilled') setEncomendas(enc.value);
      if (res.status === 'fulfilled') {
        // Only future/active reservas
        const now = new Date().toISOString().split('T')[0];
        setReservas(res.value.filter(r => r.canceladaEm === null && r.data >= now));
      }
      setLoading(false);
    });
  }, [token]);

  if (!user) return null;

  const pendentes = encomendas?.length ?? 0;
  const proximasReservas = (reservas ?? []).slice(0, 3);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <AppShell user={user} title="Início">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">

        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl bg-brand p-6 text-white relative overflow-hidden"
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-white/70 text-sm">{greeting()}!</p>
            <h2 className="font-display font-extrabold text-2xl mt-0.5">
              Apartamento {user.numero}
            </h2>
            <p className="text-white/60 text-xs mt-2">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            {!loading && pendentes > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5">
                <Package className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">
                  {pendentes} encomenda{pendentes > 1 ? 's' : ''} esperando retirada
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wider mb-3">Acesso rápido</p>
          <div className="grid grid-cols-3 gap-3">
            <QuickAction
              href="/me/encomendas"
              label="Encomendas"
              icon={Package}
              accent="bg-amber-50 text-amber-600"
              badge={pendentes}
            />
            <QuickAction
              href="/me/reservas"
              label="Reservas"
              icon={Calendar}
              accent="bg-purple-50 text-purple-600"
            />
            <QuickAction
              href="/me/perfil"
              label="Meu Perfil"
              icon={User}
              accent="bg-blue-50 text-blue-600"
            />
          </div>
        </motion.div>

        {/* Encomendas pendentes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-ink/50" />
              <h3 className="font-semibold text-sm text-ink">Encomendas pendentes</h3>
            </div>
            <Link href="/me/encomendas" className="text-xs text-brand hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-12 bg-bone rounded-xl animate-pulse" />)}
            </div>
          ) : pendentes === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-ink/60">Nenhuma encomenda aguardando</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(encomendas ?? []).map(enc => (
                <div
                  key={enc.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100"
                >
                  <Package className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink truncate">{TIPO_LABEL[enc.tipo]}</p>
                    <p className="text-[11px] text-ink/50">
                      Recebida em {ptDateTime(enc.recebidaEm)}
                    </p>
                  </div>
                  <Link
                    href="/me/encomendas"
                    className="text-xs bg-amber-500 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-600 transition-colors shrink-0"
                  >
                    Retirar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Próximas reservas */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="card space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink/50" />
              <h3 className="font-semibold text-sm text-ink">Próximas reservas</h3>
            </div>
            <Link href="/me/reservas" className="text-xs text-brand hover:underline flex items-center gap-1">
              Gerenciar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-12 bg-bone rounded-xl animate-pulse" />)}
            </div>
          ) : proximasReservas.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Star className="w-9 h-9 text-ink/20 mb-2" />
              <p className="text-sm font-medium text-ink/60">Nenhuma reserva futura</p>
              <Link href="/me/reservas" className="mt-3 text-xs btn-primary py-2 px-4">
                Fazer reserva
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {proximasReservas.map(r => {
                const days = daysUntil(r.data);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-bone-dark/50"
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', ESPACO_COLOR[r.espaco] ?? 'bg-bone text-ink/50')}>
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink">{ESPACO_LABEL[r.espaco]}</p>
                      <p className="text-[11px] text-ink/50">
                        {ptDate(r.data)}
                        {r.horaInicio != null ? ` · ${String(r.horaInicio).padStart(2, '0')}h` : ''}
                        {r.duracaoHoras != null ? ` (${r.duracaoHoras}h)` : ''}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      days === 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : days === 1
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-bone text-ink/50',
                    )}>
                      {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `em ${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>
    </AppShell>
  );
}

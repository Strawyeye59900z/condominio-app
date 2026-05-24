'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  Package,
  Calendar,
  KeyRound,
  Camera,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type Encomenda, type Reserva } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

// ── Helpers ─────────────────────────────────────────────────────────────────

const ESPACO_LABEL: Record<string, string> = {
  QUADRA: 'Quadra',
  CHURRASQUEIRA: 'Churrasqueira',
  SALAO_FESTAS: 'Salão de Festas',
};

const TIPO_LABEL: Record<string, string> = {
  CAIXA: 'Caixa',
  ENVELOPE: 'Envelope',
  SACOLA: 'Sacola',
};

function ptDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function ptTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: string;
  loading?: boolean;
  href?: string;
}

function StatCard({ label, value, icon: Icon, accent = 'bg-brand/10 text-brand', loading, href }: StatCardProps) {
  const inner = (
    <div className="card flex items-center gap-4 hover:shadow-md transition-shadow group">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink/50 truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-bone rounded animate-pulse mt-1" />
        ) : (
          <p className="font-display font-bold text-2xl text-ink leading-tight">{value}</p>
        )}
      </div>
      {href && (
        <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-brand group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Quick action card ─────────────────────────────────────────────────────────

function QuickAction({
  label,
  desc,
  href,
  icon: Icon,
  accent = 'bg-brand/8 text-brand',
}: {
  label: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-xl border border-bone-dark/60 bg-white hover:border-brand hover:shadow-sm transition-all group"
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', accent)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{label}</p>
        <p className="text-xs text-ink/50 truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-ink/30 group-hover:text-brand ml-auto shrink-0 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

// ── Page component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [encomendas, setEncomendas] = useState<Encomenda[] | null>(null);
  const [reservasHoje, setReservasHoje] = useState<Reserva[] | null>(null);
  const [totalMoradores, setTotalMoradores] = useState<number | null>(null);
  const [totalPorteiros, setTotalPorteiros] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const hoje = todayISO();
    Promise.allSettled([
      adminApi.getEncomendas(token, 'PENDENTE'),
      adminApi.getReservas(token, { inicio: hoje, fim: hoje }),
      adminApi.getMoradores(token),
      adminApi.getFuncionarios(token),
    ]).then(([enc, res, mor, port]) => {
      if (enc.status === 'fulfilled') setEncomendas(enc.value);
      if (res.status === 'fulfilled') setReservasHoje(res.value);
      if (mor.status === 'fulfilled') setTotalMoradores(mor.value.length);
      if (port.status === 'fulfilled') setTotalPorteiros(port.value.filter(p => p.ativo).length);
      setLoading(false);
    });
  }, [token]);

  if (!user) return null;

  const encPendentes = encomendas ?? [];
  const recentEnc = encPendentes.slice(0, 5);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <AppShell user={user} title="Dashboard">
      <div className="p-6 max-w-6xl mx-auto space-y-8">

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-display font-extrabold text-2xl text-ink">
            {greeting()}, Síndico! 👋
          </h2>
          <p className="text-sm text-ink/50 mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label="Moradores ativos"
            value={totalMoradores ?? '—'}
            icon={Users}
            loading={loading}
            href="/admin/moradores"
            accent="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Encomendas pendentes"
            value={encomendas?.length ?? '—'}
            icon={Package}
            loading={loading}
            href="/admin/encomendas"
            accent={encPendentes.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-brand/10 text-brand'}
          />
          <StatCard
            label="Reservas hoje"
            value={reservasHoje?.length ?? '—'}
            icon={Calendar}
            loading={loading}
            href="/admin/reservas"
            accent="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Porteiros ativos"
            value={totalPorteiros ?? '—'}
            icon={KeyRound}
            loading={loading}
            href="/admin/porteiros"
            accent="bg-emerald-50 text-emerald-600"
          />
        </motion.div>

        {/* Body: two-column on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* Left: recent encomendas */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="card space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-ink/50" />
                <h3 className="font-semibold text-sm text-ink">Encomendas pendentes</h3>
              </div>
              <Link href="/admin/encomendas" className="text-xs text-brand hover:underline">
                Ver todas
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-bone rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentEnc.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-ink/60">Nenhuma encomenda pendente</p>
                <p className="text-xs text-ink/40 mt-1">Tudo retirado por hoje!</p>
              </div>
            ) : (
              <div className="divide-y divide-bone-dark/40">
                {recentEnc.map(enc => (
                  <div key={enc.id} className="flex items-center gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{enc.morador.nome}</p>
                      <p className="text-xs text-ink/50">
                        AP {enc.apartamento.numero} · {TIPO_LABEL[enc.tipo]} · {ptDate(enc.recebidaEm)} {ptTime(enc.recebidaEm)}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      enc.whatsappStatus === 'ENVIADA'
                        ? 'bg-emerald-50 text-emerald-600'
                        : enc.whatsappStatus === 'FALHOU'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-bone text-ink/50',
                    )}>
                      {enc.whatsappStatus === 'ENVIADA' ? 'Notif. enviada' : enc.whatsappStatus === 'FALHOU' ? 'Falhou' : 'Aguardando'}
                    </span>
                  </div>
                ))}
                {encPendentes.length > 5 && (
                  <p className="text-xs text-ink/40 pt-3 text-center">
                    + {encPendentes.length - 5} outras encomendas pendentes
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* Right: quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="space-y-3"
          >
            <h3 className="font-semibold text-sm text-ink/70 px-1">Ações rápidas</h3>

            <QuickAction
              href="/admin/facial"
              label="Fila Facial"
              desc="Cadastrar fotos na leitora"
              icon={Camera}
              accent="bg-violet-50 text-violet-600"
            />
            <QuickAction
              href="/admin/relatorios"
              label="Relatório PDF"
              desc="Exportar reservas do período"
              icon={FileText}
              accent="bg-sky-50 text-sky-600"
            />
            <QuickAction
              href="/admin/porteiros"
              label="Novo porteiro"
              desc="Cadastrar funcionário"
              icon={KeyRound}
              accent="bg-emerald-50 text-emerald-600"
            />
            <QuickAction
              href="/admin/moradores"
              label="Gerenciar moradores"
              desc="CRUD e importação CSV"
              icon={Users}
              accent="bg-blue-50 text-blue-600"
            />

            {/* Reservas hoje */}
            {!loading && (reservasHoje?.length ?? 0) > 0 && (
              <div className="card mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <p className="text-xs font-semibold text-ink">Reservas de hoje</p>
                </div>
                {reservasHoje!.slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                      {ESPACO_LABEL[r.espaco]}
                    </span>
                    <span className="text-xs text-ink/60 truncate">
                      AP {r.apartamento.numero}
                      {r.horaInicio != null ? ` · ${String(r.horaInicio).padStart(2, '0')}h` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Status row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-wrap gap-3 text-xs text-ink/50"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Sistema online
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Atualizado às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </motion.div>
      </div>
    </AppShell>
  );
}

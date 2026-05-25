'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, Trash2, Loader2, FileText } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type Reserva } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

const ESPACO_LABEL: Record<string, string> = {
  QUADRA: 'Quadra',
  CHURRASQUEIRA: 'Churrasqueira',
  SALAO_FESTAS: 'Salão de Festas',
};

const ESPACO_COLOR: Record<string, string> = {
  QUADRA: 'bg-blue-50 text-blue-600',
  CHURRASQUEIRA: 'bg-orange-50 text-orange-600',
  SALAO_FESTAS: 'bg-purple-50 text-purple-600',
};

type EspacoFilter = 'TODOS' | 'QUADRA' | 'CHURRASQUEIRA' | 'SALAO_FESTAS';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function weekLaterStr() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}
function ptDate(iso: string) {
  const date = iso.includes('T') ? iso.split('T')[0] : iso;
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export default function ReservasAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [inicio, setInicio] = useState(todayStr());
  const [fim, setFim] = useState(weekLaterStr());
  const [espacoFilter, setEspacoFilter] = useState<EspacoFilter>('TODOS');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  async function load(t: string) {
    setLoading(true);
    const list = await adminApi.getReservas(t, { inicio, fim }).catch(() => [] as Reserva[]);
    setReservas(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    load(token);
  }, [token]);

  async function handleCancelar(id: string) {
    if (!token) return;
    setCancelingId(id);
    await adminApi.cancelarReserva(token, id).catch(() => null);
    setCancelingId(null);
    setConfirmCancel(null);
    load(token);
  }

  async function handleDownloadPdf() {
    if (!token) return;
    setDownloadingPdf(true);
    try {
      const res = await adminApi.getRelatorio(token, inicio, fim) as unknown as Response;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-reservas-${inicio}-${fim}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setDownloadingPdf(false);
  }

  const filtered = reservas.filter(r => espacoFilter === 'TODOS' || r.espaco === espacoFilter);

  if (!user) return null;

  return (
    <AppShell user={user} title="Reservas">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">Reservas</h2>
          <p className="text-sm text-ink/50 mt-1">Calendário por espaço com cancelamento e relatório PDF</p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-ink/50 mb-1 block">De</label>
            <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
              className="px-3 py-2 rounded-xl border border-bone-dark/60 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/50 mb-1 block">Até</label>
            <input type="date" value={fim} onChange={e => setFim(e.target.value)}
              className="px-3 py-2 rounded-xl border border-bone-dark/60 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
          </div>
          <button onClick={() => token && load(token)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Buscar
          </button>

          <div className="flex gap-1 bg-bone rounded-xl p-1">
            {(['TODOS', 'QUADRA', 'CHURRASQUEIRA', 'SALAO_FESTAS'] as EspacoFilter[]).map(e => (
              <button key={e} onClick={() => setEspacoFilter(e)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  espacoFilter === e ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink')}>
                {e === 'TODOS' ? 'Todos' : ESPACO_LABEL[e]}
              </button>
            ))}
          </div>

          <button onClick={handleDownloadPdf} disabled={downloadingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-bone-dark/60 bg-white text-sm font-medium text-ink/60 hover:bg-bone hover:text-ink transition-colors disabled:opacity-50 ml-auto">
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Baixar PDF
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Calendar className="w-10 h-10 text-ink/20 mb-2" />
              <p className="text-sm text-ink/50">Nenhuma reserva no período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bone-dark/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Espaço</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">AP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden md:table-cell">Morador</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden sm:table-cell">Horário</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className={cn('border-b border-bone-dark/30 last:border-0',
                      r.canceladaEm ? 'opacity-40' : i % 2 === 0 ? 'bg-white' : 'bg-bone/30')}>
                      <td className="px-4 py-3 text-ink">{ptDate(r.data)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', ESPACO_COLOR[r.espaco])}>
                          {ESPACO_LABEL[r.espaco]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-ink">{r.apartamento.numero}</td>
                      <td className="px-4 py-3 text-ink/70 hidden md:table-cell">{r.morador.nome}</td>
                      <td className="px-4 py-3 text-ink/60 hidden sm:table-cell">
                        {r.horaInicio != null
                          ? `${String(r.horaInicio).padStart(2, '0')}h${r.duracaoHoras ? ` (${r.duracaoHoras}h)` : ''}`
                          : 'Dia todo'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          {r.canceladaEm ? (
                            <span className="text-xs text-ink/30">Cancelada</span>
                          ) : cancelingId === r.id ? (
                            <Loader2 className="w-4 h-4 text-brand animate-spin" />
                          ) : confirmCancel === r.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-ink/50">Cancelar?</span>
                              <button onClick={() => handleCancelar(r.id)} className="text-xs text-red-600 font-medium hover:underline">Sim</button>
                              <button onClick={() => setConfirmCancel(null)} className="text-xs text-ink/40 hover:underline">Não</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmCancel(r.id)}
                              className="p-1.5 rounded-lg text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
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
        {!loading && <p className="text-xs text-ink/40 text-center">{filtered.length} reserva{filtered.length !== 1 ? 's' : ''} no período</p>}
      </div>
    </AppShell>
  );
}

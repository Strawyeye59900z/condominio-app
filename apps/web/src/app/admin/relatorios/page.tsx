'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';

function todayStr() { return new Date().toISOString().split('T')[0]; }
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export default function RelatoriosPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [inicio, setInicio] = useState(monthStartStr());
  const [fim, setFim] = useState(todayStr());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  async function handleDownload() {
    if (!token) return;
    setDownloading(true);
    setError('');
    try {
      const res = await adminApi.getRelatorio(token, inicio, fim) as unknown as Response;
      if (!res.ok) { setError('Erro ao gerar relatório'); setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-reservas-${inicio}-a-${fim}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao baixar o relatório');
    } finally {
      setDownloading(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Relatórios">
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">Relatórios</h2>
          <p className="text-sm text-ink/50 mt-1">Exportar reservas do período em PDF</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="card space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-ink">Relatório de Reservas</p>
              <p className="text-xs text-ink/50">Lista todas as reservas do período selecionado</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-ink/60 mb-1 block">Data inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-bone-dark/60 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/60 mb-1 block">Data final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                <input type="date" value={fim} onChange={e => setFim(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-bone-dark/60 bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleDownload} disabled={downloading || !inicio || !fim}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors disabled:opacity-50">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Gerando PDF...' : 'Baixar Relatório PDF'}
          </button>

          <p className="text-xs text-ink/40 text-center">
            O arquivo será baixado automaticamente no seu computador
          </p>
        </motion.div>

        {/* Quick presets */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-2">
          <p className="text-xs font-medium text-ink/50 px-1">Períodos rápidos</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Este mês', calc: () => ({ i: monthStartStr(), f: todayStr() }) },
              {
                label: 'Mês anterior', calc: () => {
                  const d = new Date();
                  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                  const end = new Date(d.getFullYear(), d.getMonth(), 0);
                  return { i: start.toISOString().split('T')[0], f: end.toISOString().split('T')[0] };
                }
              },
              {
                label: 'Últimos 90d', calc: () => {
                  const end = new Date();
                  const start = new Date(end); start.setDate(start.getDate() - 90);
                  return { i: start.toISOString().split('T')[0], f: end.toISOString().split('T')[0] };
                }
              },
            ].map(({ label, calc }) => (
              <button key={label} onClick={() => { const { i, f } = calc(); setInicio(i); setFim(f); }}
                className="px-3 py-2 rounded-xl border border-bone-dark/60 bg-white text-xs font-medium text-ink/60 hover:bg-bone hover:text-ink transition-colors">
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

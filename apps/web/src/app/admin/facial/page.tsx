'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Loader2, RefreshCw, UserCircle2 } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type FacialSyncInfo, type FacialSyncStatus } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';

interface FacialItem {
  morador: { id: string; nome: string; telefone: string; statusFacial: string; createdAt: string };
  apartamento: { id: string; numero: string };
  fotoProxyUrl: string;
  fotoDownloadUrl: string;
}

const STATUS_LABEL: Record<FacialSyncStatus, { label: string; cls: string }> = {
  PENDENTE:   { label: 'Pendente',  cls: 'bg-amber-100 text-amber-700' },
  ENVIADO:    { label: 'Enviado',   cls: 'bg-emerald-100 text-emerald-700' },
  FALHOU:     { label: 'Falhou',    cls: 'bg-red-100 text-red-700' },
  REMOVENDO:  { label: 'Removendo', cls: 'bg-ink/10 text-ink/50' },
};

export default function FacialPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [item, setItem] = useState<FacialItem | null>(null);
  const [syncInfo, setSyncInfo] = useState<FacialSyncInfo | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  const loadNext = useCallback(async (t: string) => {
    setLoading(true);
    setPhotoSrc(null);
    setSyncInfo(null);
    try {
      const raw = await fetch('/api/v1/admin/facial-queue/next', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (raw.status === 204) { setItem(null); setEmpty(true); setLoading(false); return; }
      const data = (await raw.json()) as FacialItem;
      setItem(data);
      setEmpty(false);

      // Carrega status por terminal
      try {
        const info = await adminApi.getFacialSyncStatus(t, data.morador.id);
        setSyncInfo(info);
      } catch { /* sync info é opcional */ }

      // Carrega foto
      const fotoRes = await fetch(data.fotoProxyUrl, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (fotoRes.ok) {
        const blob = await fotoRes.blob();
        setPhotoSrc(URL.createObjectURL(blob));
      }
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadNext(token);
  }, [token, loadNext]);

  async function handleRegistrado() {
    if (!token || !item) return;
    setMarking(true);
    await adminApi.postFacialRegistrado(token, item.morador.id).catch(() => null);
    setMarking(false);
    loadNext(token);
  }

  async function handleReenviar() {
    if (!token || !item) return;
    setReenviando(true);
    try {
      await adminApi.reenviarFacial(token, item.morador.id);
      // Recarrega sync info
      const info = await adminApi.getFacialSyncStatus(token, item.morador.id);
      setSyncInfo(info);
    } catch { /* ignora */ } finally {
      setReenviando(false);
    }
  }

  async function handleDownload() {
    if (!token || !item) return;
    const res = await fetch(item.fotoDownloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') ?? '';
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] ?? 'foto.jpg';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Fila Facial">
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">Fila Facial</h2>
          <p className="text-sm text-ink/50 mt-1">Acompanhe o cadastro automático nos terminais Hikvision</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="card flex flex-col items-center py-16">
              <Loader2 className="w-8 h-8 text-brand animate-spin mb-3" />
              <p className="text-sm text-ink/50">Carregando...</p>
            </motion.div>
          ) : empty ? (
            <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="card flex flex-col items-center py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <p className="font-semibold text-ink">Fila vazia!</p>
              <p className="text-sm text-ink/50 mt-1">Todos os moradores com foto foram enviados aos terminais</p>
            </motion.div>
          ) : item ? (
            <motion.div key={item.morador.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-4">

              <div className="card space-y-5">
                {/* Foto */}
                <div className="flex justify-center">
                  <div className="relative w-52 h-52 rounded-2xl overflow-hidden bg-bone border border-bone-dark/40">
                    {photoSrc ? (
                      <img src={photoSrc} alt={item.morador.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle2 className="w-16 h-16 text-ink/20" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="text-center space-y-1">
                  <p className="font-display font-bold text-xl text-ink">{item.morador.nome}</p>
                  <p className="text-sm text-ink/60">
                    Apartamento <span className="font-semibold">{item.apartamento.numero}</span>
                  </p>
                  <p className="text-xs text-ink/40">{item.morador.telefone}</p>
                </div>

                {/* Status por terminal */}
                {syncInfo && syncInfo.terminais.length > 0 && (
                  <div className="border-t border-bone-dark/30 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">Terminais</p>
                    {syncInfo.terminais.map((s) => {
                      const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.PENDENTE;
                      return (
                        <div key={s.terminalId} className="flex items-center justify-between text-sm">
                          <span className="text-ink/70">{s.terminalNome}</span>
                          <div className="flex items-center gap-2">
                            {s.ultimoErro && s.status === 'FALHOU' && (
                              <span className="text-xs text-ink/40 max-w-[140px] truncate" title={s.ultimoErro}>
                                {s.ultimoErro}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                              {st.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-bone-dark/60 text-ink/60 text-sm font-medium hover:bg-bone hover:text-ink transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Baixar foto
                  </button>
                  <button
                    onClick={handleReenviar}
                    disabled={reenviando}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-bone-dark/60 text-ink/60 text-sm font-medium hover:bg-bone hover:text-ink transition-colors disabled:opacity-50"
                  >
                    {reenviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Reenviar
                  </button>
                  <button
                    onClick={handleRegistrado}
                    disabled={marking}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Marcar registrado
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

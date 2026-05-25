'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Download, Loader2, UserCircle2 } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';

interface FacialItem {
  morador: { id: string; nome: string; telefone: string; createdAt: string };
  apartamento: { id: string; numero: string };
  fotoProxyUrl: string;
  fotoDownloadUrl: string;
}

export default function FacialPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [item, setItem] = useState<FacialItem | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
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
    try {
      const raw = await fetch('/api/v1/admin/facial-queue/next', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (raw.status === 204) { setItem(null); setEmpty(true); setLoading(false); return; }
      const data = (await raw.json()) as FacialItem;
      setItem(data);
      setEmpty(false);

      // Load photo as blob
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
          <p className="text-sm text-ink/50 mt-1">Confirme o cadastro das fotos na leitora de acesso</p>
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
              <p className="text-sm text-ink/50 mt-1">Todos os moradores com foto já foram registrados na leitora</p>
            </motion.div>
          ) : item ? (
            <motion.div key={item.morador.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="card space-y-5">
              {/* Photo */}
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

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-bone-dark/60 text-ink/60 text-sm font-medium hover:bg-bone hover:text-ink transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar foto
                </button>
                <button
                  onClick={handleRegistrado}
                  disabled={marking}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Já registrado
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, Wifi, WifiOff, RefreshCw, LogOut as LogOutIcon, Loader2 } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

type WaStatus = { connected: boolean; state: string; instance: string };

export default function WhatsAppPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  async function fetchStatus(t: string) {
    const s = await adminApi.getWhatsAppStatus(t).catch(() => null);
    if (s) setStatus(s);
    setLoadingStatus(false);
    return s;
  }

  async function fetchQr(t: string) {
    setLoadingQr(true);
    const r = await adminApi.getWhatsAppQrCode(t).catch(() => null);
    setQrDataUrl(r?.qrDataUrl ?? null);
    setLoadingQr(false);
  }

  useEffect(() => {
    if (!token) return;
    fetchStatus(token);
  }, [token]);

  // Poll status while disconnected
  useEffect(() => {
    if (!token || status === null) return;

    if (!status.connected) {
      fetchQr(token);
      pollRef.current = setInterval(async () => {
        const s = await fetchStatus(token);
        if (s?.connected) {
          setQrDataUrl(null);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 5000);
    } else {
      setQrDataUrl(null);
      if (pollRef.current) clearInterval(pollRef.current);
    }

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [token, status?.connected]);

  async function handleDisconnect() {
    if (!token) return;
    setDisconnecting(true);
    await adminApi.disconnectWhatsApp(token).catch(() => null);
    setDisconnecting(false);
    setStatus(null);
    setLoadingStatus(true);
    await fetchStatus(token);
  }

  async function handleRefreshQr() {
    if (!token) return;
    fetchQr(token);
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="WhatsApp">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">WhatsApp</h2>
          <p className="text-sm text-ink/50 mt-1">Gerencie a conexão da instância de notificações</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="card space-y-6"
        >
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                loadingStatus ? 'bg-bone text-ink/40' :
                status?.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
              )}>
                {loadingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> :
                 status?.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold text-sm text-ink">
                  {loadingStatus ? 'Verificando...' : status?.connected ? 'Conectado' : 'Desconectado'}
                </p>
                <p className="text-xs text-ink/50">
                  Instância: <span className="font-mono">{status?.instance ?? '—'}</span>
                  {status?.state && !status.connected && ` · ${status.state}`}
                </p>
              </div>
            </div>

            {status?.connected && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOutIcon className="w-4 h-4" />}
                Desconectar
              </button>
            )}
          </div>

          {/* QR code area */}
          {!loadingStatus && !status?.connected && (
            <div className="border-t border-bone-dark/40 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Escaneie o QR code com o WhatsApp</p>
                <button
                  onClick={handleRefreshQr}
                  disabled={loadingQr}
                  className="flex items-center gap-1.5 text-xs text-brand hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3 h-3', loadingQr && 'animate-spin')} />
                  Atualizar QR
                </button>
              </div>

              <div className="flex justify-center">
                {loadingQr ? (
                  <div className="w-60 h-60 bg-bone rounded-xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-ink/30 animate-spin" />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code WhatsApp"
                    className="w-60 h-60 rounded-xl border border-bone-dark/40"
                  />
                ) : (
                  <div className="w-60 h-60 bg-bone rounded-xl flex items-center justify-center text-center px-4">
                    <div>
                      <MessageSquare className="w-8 h-8 text-ink/30 mx-auto mb-2" />
                      <p className="text-xs text-ink/50">Não foi possível gerar o QR code</p>
                      <button onClick={handleRefreshQr} className="text-xs text-brand hover:underline mt-1">
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <ol className="text-xs text-ink/50 space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no celular</li>
                <li>Toque em Dispositivos Conectados → Conectar dispositivo</li>
                <li>Aponte a câmera para o QR code acima</li>
              </ol>

              <p className="text-[10px] text-ink/30 text-center">
                O status é atualizado automaticamente a cada 5 segundos
              </p>
            </div>
          )}

          {status?.connected && (
            <div className="border-t border-bone-dark/40 pt-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-ink/60">Notificações de encomendas estão ativas</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}

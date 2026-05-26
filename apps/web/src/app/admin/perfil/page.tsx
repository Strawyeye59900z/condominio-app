'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { authApi, ApiError } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';

export default function AdminPerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    void t;
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (novaSenha.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setError('Confirmação não confere com a nova senha.');
      return;
    }

    startTransition(async () => {
      try {
        const token = session.getToken();
        if (!token) throw new Error('Sessão expirada');
        await authApi.changePassword(token, senhaAtual, novaSenha);
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmar('');
        setSuccess(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao trocar senha.');
      }
    });
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Meu Perfil">
      <div className="p-6 max-w-md mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h2 className="font-display font-extrabold text-2xl text-ink">Meu Perfil</h2>
          <p className="text-sm text-ink/50 mt-1">{user.email}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="card space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-ink">Alterar senha</h3>
              <p className="text-xs text-ink/50">Mínimo 6 caracteres</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                required
                autoComplete="current-password"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                autoComplete="new-password"
                className="input w-full"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Senha alterada com sucesso!
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar nova senha
            </button>
          </form>
        </motion.div>
      </div>
    </AppShell>
  );
}

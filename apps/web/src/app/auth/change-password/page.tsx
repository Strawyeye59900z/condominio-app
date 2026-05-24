'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Building2, Loader2, KeyRound } from 'lucide-react';
import { authApi, ApiError } from '@/lib/api';
import { session } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!session.getToken()) router.push('/');
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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

        // Após trocar, limpa sessão e força novo login
        session.clear();
        router.push('/?changed=1');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao trocar senha.');
      }
    });
  }

  return (
    <main className="min-h-screen marble-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink">Defina uma nova senha</h1>
            <p className="text-xs text-ink/60">Sua senha provisória precisa ser trocada.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Senha atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              required
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              required
              minLength={6}
              className="input"
            />
            <p className="mt-1 text-[11px] text-ink/40">Mínimo 6 caracteres.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              required
              className="input"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Trocar senha e entrar'}
          </button>
        </form>
      </motion.div>

      <div className="absolute top-6 left-6 flex items-center gap-2 text-white/80">
        <Building2 className="w-5 h-5" />
        <span className="font-display font-bold text-sm tracking-wider">MHVL</span>
      </div>
    </main>
  );
}

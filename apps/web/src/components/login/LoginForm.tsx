'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck, KeyRound, Home } from 'lucide-react';
import { authApi, ApiError } from '@/lib/api';
import { session } from '@/lib/auth';
import { cn } from '@/lib/cn';

type Role = 'morador' | 'admin' | 'funcionario';

const ROLES: { value: Role; label: string; icon: typeof Home; helper: string }[] = [
  { value: 'morador', label: 'Morador', icon: Home, helper: 'Nº do apartamento' },
  { value: 'admin', label: 'Síndico', icon: ShieldCheck, helper: 'E-mail' },
  { value: 'funcionario', label: 'Porteiro', icon: KeyRound, helper: 'ID de acesso' },
];

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('morador');
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeRole = ROLES.find(r => r.value === role)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        let resp;
        if (role === 'admin') {
          resp = await authApi.loginAdmin(identifier, senha);
        } else if (role === 'funcionario') {
          resp = await authApi.loginFuncionario(identifier, senha);
        } else {
          resp = await authApi.loginMorador(identifier, senha);
        }

        session.save(resp);

        // Se precisa trocar senha, vai para tela de troca
        if (resp.user.mustChangePassword) {
          router.push('/auth/change-password');
        } else {
          router.push(session.getHomePath(resp.user));
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || 'Não foi possível entrar.');
        } else {
          setError('Erro de conexão. Tente novamente.');
        }
      }
    });
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-ink tracking-tight">
          BEM-VINDO!
        </h2>
        <p className="mt-2 text-sm text-ink/60">
          Selecione seu perfil e entre com seus dados.
        </p>
      </div>

      {/* Tabs de perfil */}
      <div className="mb-6 grid grid-cols-3 gap-1.5 bg-bone rounded-xl p-1.5">
        {ROLES.map(r => {
          const Icon = r.icon;
          const active = r.value === role;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => {
                setRole(r.value);
                setError(null);
                setIdentifier('');
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 text-xs font-semibold transition-all',
                active
                  ? 'bg-white text-brand shadow-sm'
                  : 'text-ink/60 hover:text-ink hover:bg-white/50',
              )}
            >
              <Icon className={cn('w-4 h-4', active && 'text-brand')} />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div>
          <label htmlFor="identifier" className="block text-xs font-semibold text-ink/70 mb-1.5">
            {activeRole.helper}
          </label>
          <input
            id="identifier"
            type={role === 'admin' ? 'email' : 'text'}
            inputMode={role === 'morador' ? 'numeric' : 'text'}
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder={
              role === 'admin' ? 'voce@exemplo.com'
              : role === 'morador' ? 'Ex.: 101'
              : 'Ex.: porteiro01'
            }
            required
            autoComplete={role === 'admin' ? 'email' : 'username'}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="senha" className="block text-xs font-semibold text-ink/70 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              id="senha"
              type={showPassword ? 'text' : 'password'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Erro */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão entrar */}
        <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      {/* Rodapé do form */}
      <p className="mt-6 text-center text-xs text-ink/50">
        Esqueceu sua senha? Procure o síndico para reset.
      </p>
    </div>
  );
}

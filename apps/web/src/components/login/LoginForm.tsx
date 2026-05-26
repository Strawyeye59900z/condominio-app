'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShieldCheck, KeyRound, Home, ArrowLeft, UserCircle2 } from 'lucide-react';
import { authApi, ApiError, type FuncionarioPublic } from '@/lib/api';
import { session } from '@/lib/auth';
import { cn } from '@/lib/cn';

type Role = 'morador' | 'admin' | 'funcionario';

const ROLES: { value: Role; label: string; icon: typeof Home; helper: string }[] = [
  { value: 'morador', label: 'Morador', icon: Home, helper: 'Nº do apartamento' },
  { value: 'admin', label: 'Síndico', icon: ShieldCheck, helper: 'E-mail' },
  { value: 'funcionario', label: 'Porteiro', icon: KeyRound, helper: 'Selecione seu cartão' },
];

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('morador');
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Porteiros
  const [funcionarios, setFuncionarios] = useState<FuncionarioPublic[] | null>(null);
  const [selectedFunc, setSelectedFunc] = useState<FuncionarioPublic | null>(null);
  const [loadingFuncs, setLoadingFuncs] = useState(false);

  const activeRole = ROLES.find(r => r.value === role)!;

  // Carrega lista de porteiros quando a tab é selecionada
  useEffect(() => {
    if (role !== 'funcionario' || funcionarios !== null) return;
    setLoadingFuncs(true);
    authApi.listFuncionarios()
      .then(list => setFuncionarios(list))
      .catch(() => setFuncionarios([]))
      .finally(() => setLoadingFuncs(false));
  }, [role, funcionarios]);

  function changeRole(newRole: Role) {
    setRole(newRole);
    setError(null);
    setIdentifier('');
    setSenha('');
    setSelectedFunc(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        let resp;
        if (role === 'admin') {
          resp = await authApi.loginAdmin(identifier, senha);
        } else if (role === 'funcionario') {
          if (!selectedFunc) {
            setError('Selecione seu cartão.');
            return;
          }
          resp = await authApi.loginFuncionario(selectedFunc.loginId, senha);
        } else {
          resp = await authApi.loginMorador(identifier, senha);
        }

        session.save(resp);

        if (resp.user.mustChangePassword) {
          router.push('/auth/change-password');
        } else if (resp.user.role === 'funcionario' && !resp.user.fotoUrl) {
          router.push('/porteiro/foto');
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
              onClick={() => changeRole(r.value)}
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

      {/* Conteúdo dependente do role */}
      <AnimatePresence mode="wait">
        {role === 'funcionario' ? (
          <motion.div
            key="porteiro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <PorteiroLogin
              funcionarios={funcionarios}
              loading={loadingFuncs}
              selected={selectedFunc}
              onSelect={f => { setSelectedFunc(f); setError(null); }}
              onBack={() => setSelectedFunc(null)}
              senha={senha}
              setSenha={setSenha}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              error={error}
              pending={pending}
              onSubmit={handleSubmit}
            />
          </motion.div>
        ) : (
          <motion.form
            key="default"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="space-y-4"
            autoComplete="on"
          >
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
                  role === 'admin' ? 'voce@exemplo.com' : 'Ex.: 101'
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
          </motion.form>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-xs text-ink/50">
        Esqueceu sua senha? Procure o síndico para reset.
      </p>
    </div>
  );
}

// ============================================================
// LOGIN DO PORTEIRO: cards com foto
// ============================================================

interface PorteiroLoginProps {
  funcionarios: FuncionarioPublic[] | null;
  loading: boolean;
  selected: FuncionarioPublic | null;
  onSelect: (f: FuncionarioPublic) => void;
  onBack: () => void;
  senha: string;
  setSenha: (s: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((p: boolean) => boolean)) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function PorteiroLogin({
  funcionarios, loading, selected, onSelect, onBack,
  senha, setSenha, showPassword, setShowPassword,
  error, pending, onSubmit,
}: PorteiroLoginProps) {
  // Tela 2: porteiro selecionado, pede só a senha
  if (selected) {
    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-ink/60 hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Trocar de porteiro
        </button>

        <div className="flex items-center gap-4 p-4 bg-bone/60 rounded-xl">
          <PorteiroAvatar id={selected.id} nome={selected.nome} size="lg" />
          <div className="min-w-0">
            <p className="text-xs text-ink/50 uppercase tracking-wider">Você é</p>
            <p className="font-display font-bold text-lg truncate">{selected.nome}</p>
          </div>
        </div>

        <div>
          <label htmlFor="senha-porteiro" className="block text-xs font-semibold text-ink/70 mb-1.5">
            Sua senha
          </label>
          <div className="relative">
            <input
              id="senha-porteiro"
              type={showPassword ? 'text' : 'password'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              autoComplete="current-password"
              className="input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

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

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
        </button>
      </form>
    );
  }

  // Tela 1: lista de cards
  return (
    <div>
      <p className="text-xs font-semibold text-ink/70 mb-3">
        Selecione seu cartão de acesso
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-bone rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !funcionarios || funcionarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bone-dark p-8 text-center">
          <UserCircle2 className="w-12 h-12 text-ink/30 mx-auto mb-2" />
          <p className="text-sm text-ink/60">Nenhum porteiro cadastrado.</p>
          <p className="text-xs text-ink/40 mt-1">Solicite ao síndico para criar seu acesso.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {funcionarios.map(f => (
            <motion.button
              key={f.id}
              type="button"
              onClick={() => onSelect(f)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-bone to-bone-dark border border-bone-dark/50 hover:border-brand hover:shadow-lg transition-all"
            >
              <PorteiroAvatar id={f.id} nome={f.nome} size="card" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3">
                <p className="text-white text-xs font-bold truncate">{f.nome}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Avatar do porteiro
// ============================================================

function PorteiroAvatar({
  id, nome, size = 'lg',
}: { id: string; nome: string; size?: 'lg' | 'card' }) {
  const [broken, setBroken] = useState(false);
  const src = `/api/v1/auth/funcionarios/${id}/foto`;

  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  if (size === 'card') {
    return broken ? (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-white text-3xl font-bold font-display">
        {initials || '?'}
      </div>
    ) : (
      <img
        src={src}
        alt={nome}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }

  return broken ? (
    <div className="w-14 h-14 rounded-full bg-brand text-white flex items-center justify-center font-display font-bold text-lg">
      {initials || '?'}
    </div>
  ) : (
    <img src={src} alt={nome} className="w-14 h-14 rounded-full object-cover ring-2 ring-white" onError={() => setBroken(true)} />
  );
}

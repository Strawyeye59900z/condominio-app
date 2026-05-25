'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Plus, RefreshCw, UserCheck, UserX, Lock, Loader2, X, Eye, EyeOff
} from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type FuncionarioAdmin } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

function ptDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function PorteirosPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [porteiros, setPorteiros] = useState<FuncionarioAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<{ id: string; msg: string } | null>(null);

  // Create form
  const [loginId, setLoginId] = useState('');
  const [nome, setNome] = useState('');
  const [senhaProvisoria, setSenhaProvisoria] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  async function load(t: string) {
    setLoading(true);
    const list = await adminApi.getFuncionarios(t).catch(() => [] as FuncionarioAdmin[]);
    setPorteiros(list);
    setLoading(false);
  }

  useEffect(() => {
    if (!token) return;
    load(token);
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setCreateError('');
    try {
      await adminApi.createFuncionario(token, { loginId, nome, senhaProvisoria });
      setShowModal(false);
      setLoginId(''); setNome(''); setSenhaProvisoria('');
      load(token);
    } catch (err: any) {
      setCreateError(err.message ?? 'Erro ao criar porteiro');
    } finally {
      setCreating(false);
    }
  }

  async function toggleAtivo(p: FuncionarioAdmin) {
    if (!token) return;
    setActionLoading(p.id + '_ativo');
    await adminApi.patchFuncionario(token, p.id, { ativo: !p.ativo }).catch(() => null);
    await load(token);
    setActionLoading(null);
  }

  async function resetSenha(p: FuncionarioAdmin) {
    if (!token) return;
    setActionLoading(p.id + '_senha');
    try {
      const res = await adminApi.patchFuncionario(token, p.id, { resetarSenha: true }) as any;
      const nova = res?.senhaProvisoria ?? '(ver API)';
      setSuccessMsg({ id: p.id, msg: `Nova senha: ${nova}` });
      await load(token);
    } catch {}
    setActionLoading(null);
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Porteiros">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-ink">Porteiros</h2>
            <p className="text-sm text-ink/50 mt-1">{porteiros.filter(p => p.ativo).length} ativos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => token && load(token)} className="p-2 rounded-xl border border-bone-dark/60 bg-white hover:bg-bone text-ink/60 hover:text-ink transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors">
              <Plus className="w-4 h-4" />
              Novo porteiro
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
          className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : porteiros.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <KeyRound className="w-10 h-10 text-ink/20 mb-2" />
              <p className="text-sm text-ink/50">Nenhum porteiro cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bone-dark/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Login</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide hidden sm:table-cell">Cadastro</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {porteiros.map((p, i) => (
                    <tr key={p.id} className={cn('border-b border-bone-dark/30 last:border-0', i % 2 === 0 ? 'bg-white' : 'bg-bone/30')}>
                      <td className="px-4 py-3 font-medium text-ink">
                        {p.nome}
                        {p.mustChangePassword && <span className="ml-1 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">Troca senha</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-ink/70">{p.loginId}</td>
                      <td className="px-4 py-3 text-ink/50 hidden sm:table-cell">{ptDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          p.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-bone text-ink/40')}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {successMsg?.id === p.id && (
                            <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg mr-1">
                              {successMsg.msg}
                              <button onClick={() => setSuccessMsg(null)} className="ml-1 text-emerald-400 hover:text-emerald-600">
                                <X className="w-3 h-3 inline" />
                              </button>
                            </span>
                          )}
                          {actionLoading?.startsWith(p.id) ? (
                            <Loader2 className="w-4 h-4 text-brand animate-spin" />
                          ) : (
                            <>
                              <button onClick={() => resetSenha(p)} title="Resetar senha"
                                className="p-1.5 rounded-lg text-ink/40 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => toggleAtivo(p)} title={p.ativo ? 'Desativar' : 'Ativar'}
                                className={cn('p-1.5 rounded-lg transition-colors',
                                  p.ativo ? 'text-ink/40 hover:text-red-500 hover:bg-red-50' : 'text-ink/40 hover:text-emerald-600 hover:bg-emerald-50')}>
                                {p.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </>
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

        {/* Create modal */}
        <AnimatePresence>
          {showModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-lg text-ink">Novo porteiro</h3>
                    <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-bone transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-ink/60 mb-1 block">Nome completo</label>
                      <input value={nome} onChange={e => setNome(e.target.value)} required
                        className="w-full px-3 py-2.5 rounded-xl border border-bone-dark/60 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        placeholder="Ex: João Silva" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink/60 mb-1 block">Login (ID único)</label>
                      <input value={loginId} onChange={e => setLoginId(e.target.value)} required
                        className="w-full px-3 py-2.5 rounded-xl border border-bone-dark/60 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        placeholder="Ex: joao123" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink/60 mb-1 block">Senha provisória</label>
                      <div className="relative">
                        <input type={showSenha ? 'text' : 'password'} value={senhaProvisoria}
                          onChange={e => setSenhaProvisoria(e.target.value)} required
                          className="w-full px-3 py-2.5 pr-10 rounded-xl border border-bone-dark/60 text-sm text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                          placeholder="Mínimo 6 caracteres" minLength={6} />
                        <button type="button" onClick={() => setShowSenha(!showSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink">
                          {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-ink/40 mt-1">O porteiro será obrigado a trocar na 1ª entrada</p>
                    </div>

                    {createError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>}

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowModal(false)}
                        className="flex-1 py-2.5 rounded-xl border border-bone-dark/60 text-sm font-medium text-ink/60 hover:bg-bone transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" disabled={creating}
                        className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                        {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                        Criar
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

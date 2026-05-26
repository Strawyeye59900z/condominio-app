'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, Loader2, X, AlertCircle } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type AdminUser } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

export default function AdminsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    adminApi.listAdmins(token)
      .then(setAdmins)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    try {
      const novo = await adminApi.createAdmin(token, email.trim(), senha);
      setAdmins(prev => [...prev, novo]);
      setEmail('');
      setSenha('');
      setShowForm(false);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao criar administrador');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Remover este administrador?')) return;
    setDeletingId(id);
    try {
      await adminApi.deleteAdmin(token, id);
      setAdmins(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err?.message ?? 'Erro ao remover administrador');
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Administradores">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-2xl text-ink">Administradores</h2>
              <p className="text-sm text-ink/50 mt-1">Gerencie o acesso de síndicos ao painel</p>
            </div>
            <button
              onClick={() => { setShowForm(v => !v); setError(null); }}
              className="btn-primary flex items-center gap-2"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Cancelar' : 'Novo admin'}
            </button>
          </div>
        </motion.div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card space-y-4"
          >
            <h3 className="font-semibold text-sm text-ink">Novo Administrador</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input w-full"
                  placeholder="admin@condominio.com"
                />
              </div>
              <div>
                <label className="label">Senha provisória</label>
                <input
                  type="text"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={6}
                  className="input w-full font-mono"
                  placeholder="mínimo 6 caracteres"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar administrador
              </button>
            </form>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="card divide-y divide-bone-dark/40"
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-ink/30 animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-ink/50 py-8 text-center">Nenhum administrador encontrado.</p>
          ) : (
            admins.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{a.email}</p>
                    <p className="text-xs text-ink/40">
                      {a.id === user.id ? 'Você · ' : ''}
                      desde {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {a.id !== user.id && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className={cn(
                      'p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40',
                    )}
                  >
                    {deletingId === a.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                )}
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}

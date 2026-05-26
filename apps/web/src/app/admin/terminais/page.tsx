'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Plus, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { adminApi, type TerminalFacial } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';

interface FormData {
  nome: string;
  host: string;
  porta: string;
  usuario: string;
  senha: string;
}

const emptyForm: FormData = { nome: '', host: '', porta: '80', usuario: 'admin', senha: '' };

export default function TerminaisPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [terminais, setTerminais] = useState<TerminalFacial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; erro?: string }>>({});
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'admin') { router.push('/'); return; }
    setUser(u);
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const data = await adminApi.getTerminais(t);
      setTerminais(data);
    } catch {
      setErro('Erro ao carregar terminais');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  async function handleSalvar() {
    if (!token) return;
    setSaving(true);
    setErro(null);
    try {
      await adminApi.createTerminal(token, {
        nome: form.nome,
        host: form.host,
        porta: parseInt(form.porta) || 80,
        usuario: form.usuario,
        senha: form.senha,
      });
      setShowForm(false);
      setForm(emptyForm);
      await load(token);
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao salvar terminal');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestar(id: string) {
    if (!token) return;
    setTestando(id);
    setTestResults((prev) => ({ ...prev, [id]: undefined as any }));
    try {
      const res = await adminApi.testarTerminal(token, id);
      setTestResults((prev) => ({ ...prev, [id]: res }));
      // Atualiza ultimoOk/ultimoErr recarregando a lista
      await load(token);
    } catch (e: any) {
      setTestResults((prev) => ({ ...prev, [id]: { ok: false, erro: e?.message } }));
    } finally {
      setTestando(null);
    }
  }

  async function handleToggleAtivo(terminal: TerminalFacial) {
    if (!token) return;
    try {
      await adminApi.patchTerminal(token, terminal.id, { ativo: !terminal.ativo });
      await load(token);
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao atualizar terminal');
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Terminais Faciais">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-extrabold text-2xl text-ink">Terminais Faciais</h2>
            <p className="text-sm text-ink/50 mt-1">Gerencie os leitores Hikvision conectados via Tailscale</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setErro(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo terminal
          </button>
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <X className="w-4 h-4 flex-shrink-0" />
            {erro}
            <button onClick={() => setErro(null)} className="ml-auto"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Formulário novo terminal */}
        {showForm && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ink">Novo terminal</h3>
              <button onClick={() => setShowForm(false)} className="text-ink/40 hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-ink/60 mb-1">Nome</label>
                <input
                  className="input w-full"
                  placeholder="Ex: Portaria Principal"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">IP (host)</label>
                <input
                  className="input w-full"
                  placeholder="192.168.1.21"
                  value={form.host}
                  onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Porta</label>
                <input
                  className="input w-full"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.porta}
                  onChange={(e) => setForm((f) => ({ ...f, porta: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Usuário</label>
                <input
                  className="input w-full"
                  value={form.usuario}
                  onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/60 mb-1">Senha</label>
                <input
                  className="input w-full"
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-bone-dark/60 text-ink/60 text-sm font-medium hover:bg-bone transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={saving || !form.nome || !form.host || !form.senha}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Lista de terminais */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        ) : terminais.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <Wifi className="w-10 h-10 text-ink/20 mb-3" />
            <p className="font-semibold text-ink">Nenhum terminal cadastrado</p>
            <p className="text-sm text-ink/50 mt-1">Adicione os leitores Hikvision conectados via Tailscale</p>
          </div>
        ) : (
          <div className="space-y-3">
            {terminais.map((t) => {
              const result = testResults[t.id];
              return (
                <div key={t.id} className="card flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full ${t.ativo ? 'bg-emerald-400' : 'bg-ink/20'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink">{t.nome}</span>
                      <span className="text-xs text-ink/40 font-mono">{t.host}:{t.porta}</span>
                      {!t.ativo && <span className="text-xs bg-ink/10 text-ink/50 px-2 py-0.5 rounded-full">Inativo</span>}
                    </div>
                    <p className="text-xs text-ink/50 mt-0.5">Usuário: {t.usuario}</p>
                    {t.ultimoOk && (
                      <p className="text-xs text-emerald-600 mt-1">
                        ✓ OK em {new Date(t.ultimoOk).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {t.ultimoErr && !t.ultimoOk && (
                      <p className="text-xs text-red-500 mt-1 truncate">✗ {t.ultimoErr}</p>
                    )}
                    {result && (
                      <p className={`text-xs mt-1 ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                        {result.ok ? '✓ Conexão OK' : `✗ ${result.erro}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTestar(t.id)}
                      disabled={testando === t.id}
                      title="Testar conexão"
                      className="p-2 rounded-lg border border-bone-dark/60 text-ink/60 hover:bg-bone hover:text-ink transition-colors disabled:opacity-50"
                    >
                      {testando === t.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RefreshCw className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(t)}
                      title={t.ativo ? 'Desativar' : 'Ativar'}
                      className="p-2 rounded-lg border border-bone-dark/60 text-ink/60 hover:bg-bone hover:text-ink transition-colors"
                    >
                      {t.ativo ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Camera,
  Phone,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { moradorApi, authApi, type MoradorDoAp, ApiError } from '@/lib/api';
import { AppShell } from '@/components/shell/AppShell';
import { cn } from '@/lib/cn';

// ── helpers ─────────────────────────────────────────────────────────────────

function initials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ── LGPD Consent Modal ────────────────────────────────────────────────────────

function LgpdModal({
  moradorNome,
  onAccept,
  onClose,
}: {
  moradorNome: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-ink">Termo de Consentimento</h2>
            <p className="text-xs text-ink/50">Para: {moradorNome}</p>
          </div>
        </div>

        <div className="rounded-xl bg-bone/60 p-4 text-xs text-ink/70 space-y-2 leading-relaxed">
          <p>
            Ao enviar sua foto, você autoriza o <strong>Condomínio Mansão Heitor Villa Lobos</strong> a
            armazenar e utilizar sua imagem exclusivamente para:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Cadastro na leitora de reconhecimento facial do prédio.</li>
            <li>Identificação de moradores pela administração.</li>
          </ul>
          <p>
            A foto não será compartilhada com terceiros. Você pode solicitar a exclusão ao síndico a qualquer momento.
          </p>
          <p className="text-ink/40">
            Base legal: LGPD Art. 7º, I (consentimento do titular).
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-brand"
          />
          <span className="text-xs text-ink/70">
            Li e concordo com o uso da minha imagem conforme descrito acima.
          </span>
        </label>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 py-2 text-xs">
            Cancelar
          </button>
          <button
            disabled={!checked}
            onClick={onAccept}
            className="btn-primary flex-1 py-2 text-xs"
          >
            Aceitar e continuar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Morador form (add / edit) ─────────────────────────────────────────────────

interface MoradorFormProps {
  initial?: Partial<MoradorDoAp>;
  onSave: (data: { nome: string; telefone: string }) => Promise<void>;
  onClose: () => void;
}

function MoradorForm({ initial, onSave, onClose }: MoradorFormProps) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [telefone, setTelefone] = useState(initial?.telefone ?? '');
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      try {
        await onSave({ nome: nome.trim(), telefone: telefone.trim() });
      } catch (error) {
        setErr(error instanceof ApiError ? error.message : 'Erro ao salvar.');
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bone-dark/60">
          <h2 className="font-display font-bold text-sm text-ink">
            {initial?.id ? 'Editar morador' : 'Adicionar morador'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-bone">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              autoFocus
              placeholder="Ex.: Maria Silva"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">
              WhatsApp <span className="font-normal text-ink/40">(com DDD)</span>
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              required
              placeholder="Ex.: 11999999999"
              className="input"
            />
          </div>
          {err && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />{err}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Change password form ──────────────────────────────────────────────────────

function ChangePasswordSection({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      try {
        await authApi.changePassword(token, atual, nova);
        setOk(true);
        setAtual(''); setNova('');
        setTimeout(() => { setOk(false); setOpen(false); }, 2000);
      } catch (error) {
        setErr(error instanceof ApiError ? error.message : 'Erro ao alterar senha.');
      }
    });
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-brand" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">Segurança</p>
          <p className="text-xs text-ink/50">Senha de acesso do apartamento.</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-brand hover:underline"
        >
          {open ? 'Fechar' : 'Alterar senha'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="overflow-hidden space-y-3"
          >
            {/* Senha atual */}
            <div className="relative">
              <input
                type={showAtual ? 'text' : 'password'}
                value={atual}
                onChange={e => setAtual(e.target.value)}
                required
                placeholder="Senha atual"
                className="input pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowAtual(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
              >
                {showAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Nova senha */}
            <div className="relative">
              <input
                type={showNova ? 'text' : 'password'}
                value={nova}
                onChange={e => setNova(e.target.value)}
                required
                minLength={6}
                placeholder="Nova senha (mín. 6 caracteres)"
                className="input pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNova(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
              >
                {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {err && (
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />{err}
              </p>
            )}
            {ok && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />Senha alterada com sucesso!
              </p>
            )}

            <button type="submit" disabled={pending} className="btn-primary w-full py-2 text-xs">
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar nova senha'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { user, token, ready } = useAuth('morador');

  const [moradores, setMoradores] = useState<MoradorDoAp[]>([]);
  const [loading, setLoading] = useState(true);
  const [apartamentoNumero, setApartamentoNumero] = useState('');

  // Modals
  const [editingMorador, setEditingMorador] = useState<MoradorDoAp | null | 'new'>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  // Foto
  const [lgpdFor, setLgpdFor] = useState<MoradorDoAp | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingMoradorId, setPendingMoradorId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    moradorApi.getMe(token)
      .then(data => {
        setMoradores(data.moradores);
        setApartamentoNumero(data.apartamento.numero);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  // ── Moradores CRUD ────────────────────────────────────────

  async function handleSaveMorador(data: { nome: string; telefone: string }) {
    if (!token) return;
    if (editingMorador === 'new') {
      const m = await moradorApi.createMorador(token, data);
      setMoradores(prev => [...prev, m]);
      setEditingMorador(null);
      // Inicia o fluxo de foto imediatamente após criar morador
      startUploadFlow(m);
      return;
    } else if (editingMorador) {
      const m = await moradorApi.updateMorador(token, editingMorador.id, data);
      setMoradores(prev => prev.map(x => x.id === m.id ? m : x));
    }
    setEditingMorador(null);
  }

  function handleDelete(id: string) {
    if (!token) return;
    startDelete(async () => {
      await moradorApi.deleteMorador(token, id);
      setMoradores(prev => prev.filter(m => m.id !== id));
      setDeletingId(null);
    });
  }

  // ── Foto upload flow ──────────────────────────────────────

  function startUploadFlow(m: MoradorDoAp) {
    if (!m.id) return;
    // Se já tem consentimento (consentLgpdAt não está no type público, mas
    // tentamos enviar direto e tratamos o erro se precisar de consent)
    setPendingMoradorId(m.id);
    setLgpdFor(m);
  }

  async function handleLgpdAccept() {
    if (!token || !lgpdFor || !pendingMoradorId) return;
    try {
      await moradorApi.consentLgpd(token, pendingMoradorId);
    } catch {
      // ignora se já tinha consent
    }
    setLgpdFor(null);
    // Abre o file picker
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token || !pendingMoradorId) return;
    e.target.value = '';

    if (file.size > 1024 * 1024) {
      setUploadErr('Foto maior que 1 MB. Escolha uma imagem menor.');
      return;
    }

    setUploadingFor(pendingMoradorId);
    setUploadErr(null);
    try {
      const res = await moradorApi.uploadFoto(token, pendingMoradorId, file);
      setMoradores(prev =>
        prev.map(m => m.id === pendingMoradorId ? { ...m, fotoUrl: res.fotoUrl } : m),
      );
    } catch (err) {
      setUploadErr(err instanceof ApiError ? err.message : 'Erro no upload.');
    } finally {
      setUploadingFor(null);
      setPendingMoradorId(null);
    }
  }

  if (!ready) return null;

  return (
    <AppShell user={user!} title="Meu Perfil">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        capture="user"
      />

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">

        {/* Header AP */}
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shrink-0">
            <p className="font-display font-extrabold text-white text-xl leading-none">
              {apartamentoNumero || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink/50 uppercase tracking-wider">Apartamento</p>
            <p className="font-display font-bold text-2xl text-ink">{apartamentoNumero || '—'}</p>
          </div>
        </div>

        {/* Moradores */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-ink/50" />
              <h3 className="font-semibold text-sm text-ink">Moradores</h3>
              {!loading && (
                <span className="text-xs bg-bone px-2 py-0.5 rounded-full text-ink/60">
                  {moradores.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setEditingMorador('new')}
              className="flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-14 bg-bone rounded-xl animate-pulse" />)}
            </div>
          ) : moradores.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-ink/50">Nenhum morador cadastrado.</p>
              <button
                onClick={() => setEditingMorador('new')}
                className="mt-2 text-xs text-brand hover:underline"
              >
                Adicionar o primeiro
              </button>
            </div>
          ) : (
            <div className="divide-y divide-bone-dark/40">
              {moradores.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
                    {initials(m.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {m.nome}
                      {m.isAdminAp && (
                        <span className="ml-1.5 text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-semibold">
                          Admin AP
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink/50 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {m.telefone}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingMorador(m)}
                      className="p-1.5 rounded-lg text-ink/40 hover:text-brand hover:bg-brand/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!m.isAdminAp && (
                      <button
                        onClick={() => setDeletingId(m.id)}
                        className="p-1.5 rounded-lg text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fotos Faciais */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-ink/50" />
            <h3 className="font-semibold text-sm text-ink">Fotos Faciais</h3>
          </div>
          <p className="text-xs text-ink/50">
            A foto é usada para cadastro na leitora do prédio. Tamanho máximo: 1 MB.
          </p>

          {uploadErr && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-3 rounded-xl">
              <AlertTriangle className="w-3 h-3 shrink-0" />{uploadErr}
            </p>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-16 bg-bone rounded-xl animate-pulse" />)}
            </div>
          ) : moradores.length === 0 ? (
            <p className="text-xs text-ink/40 text-center py-4">
              Adicione moradores primeiro para enviar fotos.
            </p>
          ) : (
            <div className="space-y-3">
              {moradores.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-bone-dark/50"
                >
                  {/* Foto / avatar */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-bone flex items-center justify-center">
                    {m.fotoUrl ? (
                      <img
                        src={m.fotoUrl}
                        alt={m.nome}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="font-display font-bold text-ink/30 text-sm">
                        {initials(m.nome)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{m.nome}</p>
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      m.statusFacial === 'REGISTRADO'
                        ? 'bg-emerald-50 text-emerald-700'
                        : m.fotoUrl
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-bone text-ink/50',
                    )}>
                      {m.statusFacial === 'REGISTRADO'
                        ? '✓ Registrado na leitora'
                        : m.fotoUrl
                        ? '⏳ Aguardando registro'
                        : 'Sem foto'}
                    </span>
                  </div>

                  {/* Upload button */}
                  {m.statusFacial !== 'REGISTRADO' && (
                    <button
                      onClick={() => startUploadFlow(m)}
                      disabled={uploadingFor === m.id}
                      className="flex items-center gap-1.5 text-xs bg-brand/10 text-brand px-3 py-1.5 rounded-lg font-semibold hover:bg-brand/20 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {uploadingFor === m.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : m.fotoUrl ? (
                        <><Upload className="w-3.5 h-3.5" />Substituir</>
                      ) : (
                        <><Camera className="w-3.5 h-3.5" />Enviar foto</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Segurança */}
        {token && <ChangePasswordSection token={token} />}
      </div>

      {/* Modais */}
      <AnimatePresence>
        {editingMorador !== null && (
          <MoradorForm
            key="morador-form"
            initial={editingMorador === 'new' ? {} : editingMorador}
            onSave={handleSaveMorador}
            onClose={() => setEditingMorador(null)}
          />
        )}

        {deletingId && (
          <motion.div
            key="delete-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={e => { if (e.target === e.currentTarget) setDeletingId(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4"
            >
              <p className="font-semibold text-sm text-ink">Remover morador?</p>
              <p className="text-xs text-ink/60">
                O morador será desativado e não poderá mais usar o AP para login.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="btn-secondary flex-1 py-2 text-xs"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  disabled={deleting}
                  className="flex-1 py-2 text-xs bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remover'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {lgpdFor && (
          <LgpdModal
            key="lgpd"
            moradorNome={lgpdFor.nome}
            onAccept={handleLgpdAccept}
            onClose={() => { setLgpdFor(null); setPendingMoradorId(null); }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

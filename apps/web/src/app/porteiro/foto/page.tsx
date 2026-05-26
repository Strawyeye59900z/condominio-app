'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Upload, Loader2, CheckCircle2, RotateCcw, Building2 } from 'lucide-react';
import { session } from '@/lib/auth';
import { porteiroApi, ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

export default function PorteiroFotoPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'choice' | 'camera' | 'preview'>('choice');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || u.role !== 'funcionario') { router.push('/'); return; }
    if (u.fotoUrl) { router.push('/porteiro'); return; }
    setNome(u.nome ?? 'Porteiro');
    setToken(t);
  }, [router]);

  // Clean up camera stream on unmount or when leaving camera mode
  useEffect(() => {
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, [stream]);

  async function startCamera() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      setStream(s);
      setMode('camera');
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s;
      }, 50);
    } catch {
      setError('Não foi possível acessar a câmera. Use a opção de upload de arquivo.');
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const offX = (video.videoWidth - size) / 2;
    const offY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offX, offY, size, size, 0, 0, size, size);

    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
      setCapturedFile(file);
      setPreview(canvas.toDataURL('image/jpeg', 0.85));
      stopCamera();
      setMode('preview');
    }, 'image/jpeg', 0.85);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setMode('preview');
  }

  function resetChoice() {
    stopCamera();
    setCapturedFile(null);
    setPreview(null);
    setMode('choice');
    setError(null);
  }

  async function handleUpload() {
    if (!capturedFile || !token) return;
    setUploading(true);
    setError(null);
    try {
      const result = await porteiroApi.uploadFoto(token, capturedFile);
      // Update session with new fotoUrl
      const u = session.getUser();
      if (u) {
        sessionStorage.setItem('mhvl_user', JSON.stringify({ ...u, fotoUrl: result.fotoUrl }));
      }
      setDone(true);
      setTimeout(() => router.push('/porteiro'), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar foto. Tente novamente.');
      setUploading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen marble-bg flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <p className="font-display font-bold text-2xl text-white">Foto salva!</p>
          <p className="text-white/70 text-sm">Redirecionando para o painel...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen marble-bg flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 flex items-center gap-2 text-white/80">
        <Building2 className="w-5 h-5" />
        <span className="font-display font-bold text-sm tracking-wider">MHVL</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6 text-brand" />
          </div>
          <h1 className="font-display font-bold text-xl text-ink">Foto de perfil</h1>
          <p className="text-sm text-ink/60 mt-1">
            Olá, <strong>{nome}</strong>! Tire uma foto para seu crachá de porteiro.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Choice mode */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <button
                onClick={startCamera}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-bone-dark/60 hover:border-brand hover:bg-brand/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors shrink-0">
                  <Camera className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink">Usar câmera</p>
                  <p className="text-xs text-ink/50">Tire uma foto agora mesmo</p>
                </div>
              </button>

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-bone-dark/60 hover:border-brand hover:bg-brand/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-bone flex items-center justify-center group-hover:bg-brand/20 transition-colors shrink-0">
                  <Upload className="w-5 h-5 text-ink/60 group-hover:text-brand" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-ink">Enviar arquivo</p>
                  <p className="text-xs text-ink/50">JPG, PNG ou WebP</p>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Camera mode */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-56 rounded-full border-2 border-white/60 border-dashed" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button onClick={resetChoice}
                  className="flex-1 py-3 rounded-xl border border-bone-dark/60 text-sm text-ink/60 hover:bg-bone transition-colors flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Cancelar
                </button>
                <button onClick={capturePhoto}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Tirar foto
                </button>
              </div>
            </div>
          )}

          {/* Preview mode */}
          {mode === 'preview' && preview && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden aspect-square bg-bone">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <button onClick={resetChoice} disabled={uploading}
                  className="flex-1 py-3 rounded-xl border border-bone-dark/60 text-sm text-ink/60 hover:bg-bone transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> Tirar outra
                </button>
                <button onClick={handleUpload} disabled={uploading}
                  className={cn('flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50')}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {uploading ? 'Enviando...' : 'Usar esta foto'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <p className="text-center text-[11px] text-ink/40">
            Esta foto será exibida no seu cartão de login. Não precisa de aprovação do síndico.
          </p>
        </div>
      </motion.div>
    </main>
  );
}

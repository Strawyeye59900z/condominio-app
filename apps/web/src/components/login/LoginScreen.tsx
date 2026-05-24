'use client';

import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
import { Building2 } from 'lucide-react';
import { TypewriterSequence, type TypewriterLine } from '@/components/TypewriterSequence';
import { LoginForm } from './LoginForm';

const LEFT_LINES: TypewriterLine[] = [
  {
    text: 'Bem-vindo à',
    className: 'text-white/70 text-2xl sm:text-3xl lg:text-4xl font-light',
    speed: 35,
    pauseAfter: 280,
  },
  {
    text: 'Mansão Heitor',
    className: 'font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-white',
    speed: 45,
    pauseAfter: 180,
  },
  {
    text: 'Villa Lobos',
    className: 'font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-white/90',
    speed: 45,
    pauseAfter: 500,
  },
  {
    text: 'Acesse para gerenciar reservas dos espaços comuns,',
    className: 'text-white/70 leading-relaxed text-sm sm:text-base max-w-md mt-2',
    speed: 18,
    pauseAfter: 60,
  },
  {
    text: 'acompanhar encomendas e manter seu cadastro sempre atualizado.',
    className: 'text-white/70 leading-relaxed text-sm sm:text-base max-w-md',
    speed: 18,
    pauseAfter: 350,
  },
  {
    text: 'Sua casa, agora ainda mais conectada.',
    className: 'text-white/50 text-sm italic mt-3',
    speed: 25,
  },
];

export function LoginScreen() {
  const sectionRef = useRef<HTMLElement>(null);

  // Raw mouse-position values (−0.5 → +0.5 relative to panel width/height)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Spring physics — blobs glide smoothly instead of snapping
  const springCfg = { stiffness: 55, damping: 18, mass: 0.8 };
  const spX = useSpring(rawX, springCfg);
  const spY = useSpring(rawY, springCfg);

  // Blob 1 (top-right) — largest parallax shift
  const blob1X = useTransform(spX, [-0.5, 0.5], [-22, 22]);
  const blob1Y = useTransform(spY, [-0.5, 0.5], [-14, 14]);

  // Blob 2 (bottom-left) — medium shift, opposite horizontal direction
  const blob2X = useTransform(spX, [-0.5, 0.5], [14, -14]);
  const blob2Y = useTransform(spY, [-0.5, 0.5], [8, -8]);

  // Blob 3 (center glow) — very subtle
  const blob3X = useTransform(spX, [-0.5, 0.5], [-8, 8]);
  const blob3Y = useTransform(spY, [-0.5, 0.5], [5, -5]);

  // Text content — barely perceptible drift (creates depth illusion)
  const contentX = useTransform(spX, [-0.5, 0.5], [-5, 5]);
  const contentY = useTransform(spY, [-0.5, 0.5], [-3, 3]);

  function handleMouseMove(e: React.MouseEvent) {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <main className="min-h-screen bg-ink p-4 sm:p-6 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-[640px]">

        {/* ===== Lado escuro / marca + parallax ===== */}
        <section
          ref={sectionRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="marble-bg relative p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between overflow-hidden"
        >
          {/* Logo (estático — ainda destaca no topo) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative z-10 flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-sm tracking-[0.18em] uppercase">
              MHVL
            </span>
          </motion.div>

          {/* Texto com typewriter + leve deriva de parallax */}
          <motion.div
            style={{ x: contentX, y: contentY }}
            className="relative z-10 mt-14 lg:mt-0"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 64 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="h-[2px] bg-white/40 mb-6"
            />
            <TypewriterSequence
              lines={LEFT_LINES}
              startDelay={700}
              cursorClassName="bg-white"
            />
          </motion.div>

          {/* Rodapé */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 5.5 }}
            className="relative z-10 mt-12 lg:mt-0 text-xs text-white/40"
          >
            © {new Date().getFullYear()} Mansão Heitor Villa Lobos
          </motion.div>

          {/* ── Blobs parallax ─────────────────────────── */}
          {/* Blob 1 — topo-direita, camada de frente */}
          <motion.div
            style={{ x: blob1X, y: blob1Y }}
            className="absolute top-[16%] right-[-50px] w-80 h-80 bg-brand-light/28 rounded-full blur-3xl pointer-events-none will-change-transform"
          />
          {/* Blob 2 — base-esquerda, camada de trás */}
          <motion.div
            style={{ x: blob2X, y: blob2Y }}
            className="absolute bottom-[-40px] left-[-30px] w-[440px] h-[440px] bg-brand/32 rounded-full blur-3xl pointer-events-none will-change-transform"
          />
          {/* Blob 3 — glow central suave */}
          <motion.div
            style={{ x: blob3X, y: blob3Y }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-white/6 rounded-full blur-2xl pointer-events-none will-change-transform"
          />
        </section>

        {/* ===== Lado claro / formulário ===== */}
        <section className="p-8 sm:p-12 lg:p-14 bg-white flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
            className="w-full max-w-md mx-auto"
          >
            <LoginForm />
          </motion.div>
        </section>
      </div>
    </main>
  );
}

'use client';

import { motion } from 'framer-motion';
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
  return (
    <main className="min-h-screen bg-ink p-4 sm:p-6 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-[640px]">
        {/* ===== Lado escuro / marca ===== */}
        <section className="marble-bg relative p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between overflow-hidden">
          {/* Logo do condomínio (topo) */}
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

          {/* Bloco de texto com typewriter sequencial */}
          <div className="relative z-10 mt-14 lg:mt-0">
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
          </div>

          {/* Rodapé */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 5.5 }}
            className="relative z-10 mt-12 lg:mt-0 text-xs text-white/40"
          >
            © {new Date().getFullYear()} Mansão Heitor Villa Lobos
          </motion.div>

          {/* Brilho decorativo */}
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-brand-light/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/30 rounded-full blur-3xl pointer-events-none" />
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

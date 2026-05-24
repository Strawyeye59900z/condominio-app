'use client';

import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { Typewriter } from '@/components/Typewriter';
import { LoginForm } from './LoginForm';

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
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-sm tracking-[0.18em] uppercase">
              MHVL
            </span>
          </motion.div>

          {/* Conteúdo central (título + descrição) */}
          <div className="relative z-10 mt-14 lg:mt-0">
            {/* Linha decorativa */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 64 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-[2px] bg-white/40 mb-6"
            />

            {/* Nome do condomínio com efeito typewriter */}
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="block text-white/70 text-2xl sm:text-3xl lg:text-4xl font-light mb-3"
              >
                Bem-vindo à
              </motion.span>
              <Typewriter
                text="Mansão Heitor"
                speed={75}
                delay={1100}
                showCursor={false}
                className="block"
              />
              <Typewriter
                text="Villa Lobos"
                speed={75}
                delay={2400}
                showCursor
                className="block text-white/90"
              />
            </h1>

            {/* Descrição */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 4.2 }}
              className="mt-8 space-y-4"
            >
              <p className="text-white/70 max-w-md leading-relaxed text-sm sm:text-base">
                Acesse para gerenciar reservas dos espaços comuns, acompanhar
                encomendas e manter seu cadastro sempre atualizado.
              </p>
              <p className="text-white/50 text-sm italic">
                Sua casa, agora ainda mais conectada.
              </p>
            </motion.div>
          </div>

          {/* Rodapé sutil */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 5 }}
            className="relative z-10 mt-12 lg:mt-0 text-xs text-white/40"
          >
            © {new Date().getFullYear()} Mansão Heitor Villa Lobos
          </motion.div>

          {/* Brilho de fundo decorativo */}
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-brand-light/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand/30 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* ===== Lado claro / formulário ===== */}
        <section className="p-8 sm:p-12 lg:p-14 bg-white flex items-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-md mx-auto"
          >
            <LoginForm />
          </motion.div>
        </section>
      </div>
    </main>
  );
}

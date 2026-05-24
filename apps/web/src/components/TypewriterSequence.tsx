'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface TypewriterLine {
  text: string;
  className?: string;
  /** ms entre caracteres desta linha (default herda do prop speed) */
  speed?: number;
  /** ms de pausa após terminar esta linha antes de começar a próxima */
  pauseAfter?: number;
  /** força esta linha a aparecer em bloco (sem typewriter) — usado p/ instant */
  instant?: boolean;
}

interface TypewriterSequenceProps {
  lines: TypewriterLine[];
  speed?: number;
  startDelay?: number;
  cursorClassName?: string;
  onComplete?: () => void;
}

/**
 * Digita várias linhas em sequência mantendo um único cursor piscante
 * que vai se movendo de linha em linha conforme a digitação avança.
 */
export function TypewriterSequence({
  lines,
  speed = 35,
  startDelay = 0,
  cursorClassName,
  onComplete,
}: TypewriterSequenceProps) {
  const [activeLine, setActiveLine] = useState(0);
  const [displayed, setDisplayed] = useState<string[]>(lines.map(() => ''));
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const completeCalled = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started || activeLine >= lines.length) return;

    const current = lines[activeLine];

    // Linha instantânea: preenche tudo de uma vez e avança
    if (current.instant) {
      setDisplayed(prev => {
        const next = [...prev];
        next[activeLine] = current.text;
        return next;
      });
      const pause = current.pauseAfter ?? 80;
      const t = setTimeout(() => setActiveLine(i => i + 1), pause);
      return () => clearTimeout(t);
    }

    const currentDisplayed = displayed[activeLine];

    if (currentDisplayed.length >= current.text.length) {
      // Linha terminou — pausa antes da próxima
      const pause = current.pauseAfter ?? 220;
      const t = setTimeout(() => setActiveLine(i => i + 1), pause);
      return () => clearTimeout(t);
    }

    // Digitar o próximo caractere
    const charSpeed = current.speed ?? speed;
    const t = setTimeout(() => {
      setDisplayed(prev => {
        const next = [...prev];
        next[activeLine] = current.text.slice(0, currentDisplayed.length + 1);
        return next;
      });
    }, charSpeed);

    return () => clearTimeout(t);
  }, [started, activeLine, displayed, lines, speed]);

  useEffect(() => {
    if (activeLine >= lines.length && !completeCalled.current) {
      completeCalled.current = true;
      setDone(true);
      onComplete?.();
    }
  }, [activeLine, lines.length, onComplete]);

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const isActive = idx === activeLine;
        const isPast = idx < activeLine;
        const text = displayed[idx];

        return (
          <div
            key={idx}
            className={cn(
              'transition-opacity',
              !isActive && !isPast && !done && 'opacity-0',
              line.className,
            )}
          >
            {text}
            {isActive && !line.instant && (
              <span
                className={cn(
                  'inline-block w-[3px] h-[0.9em] bg-current align-middle ml-1 animate-pulse',
                  cursorClassName,
                )}
              />
            )}
            {/* Espaço invisível para reservar altura mesmo antes da digitação */}
            {!isActive && !isPast && !done && ' '}
          </div>
        );
      })}
    </div>
  );
}

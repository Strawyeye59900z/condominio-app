'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  showCursor?: boolean;
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({
  text,
  speed = 60,
  delay = 0,
  showCursor = true,
  className,
  onComplete,
}: TypewriterProps) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, text, speed, started, onComplete]);

  return (
    <span className={cn('inline-block', className)}>
      {displayed}
      {showCursor && (
        <span
          className={cn(
            'inline-block w-[2px] h-[0.9em] bg-current ml-1 align-middle',
            displayed.length < text.length ? 'animate-pulse' : 'animate-blink',
          )}
        />
      )}
    </span>
  );
}

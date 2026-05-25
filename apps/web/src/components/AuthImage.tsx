'use client';

import { useEffect, useRef, useState } from 'react';
import { session } from '@/lib/auth';

interface AuthImageProps {
  moradorId: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Exibe foto de morador buscando do endpoint autenticado.
 * Usa blob URL para não expor o token na src.
 */
export function AuthImage({ moradorId, alt, fallback, className }: AuthImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = session.getToken();
    if (!token) { setError(true); return; }

    const apiBase = process.env.NEXT_PUBLIC_APP_URL ?? '';
    fetch(`${apiBase}/api/v1/me/foto/${moradorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        prevUrl.current = url;
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, [moradorId]);

  if (error || !blobUrl) return <>{fallback ?? null}</>;

  return <img src={blobUrl} alt={alt} className={className} />;
}

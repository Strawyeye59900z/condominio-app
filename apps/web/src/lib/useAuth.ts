'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { session, type SessionUser } from './auth';

/**
 * Verifica sessão ativa e redireciona para / se inválida ou role errada.
 * Retorna { user, token, ready } — só renderize conteúdo quando ready=true.
 */
export function useAuth(requiredRole?: 'admin' | 'funcionario' | 'morador') {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = session.getUser();
    const t = session.getToken();
    if (!u || !t || (requiredRole && u.role !== requiredRole)) {
      router.push('/');
      return;
    }
    setUser(u);
    setToken(t);
    setReady(true);
  }, [router, requiredRole]);

  return { user, token, ready };
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { session, type SessionUser } from '@/lib/auth';
import { authApi } from '@/lib/api';

export default function MeHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const u = session.getUser();
    if (!u || u.role !== 'morador') {
      router.push('/');
      return;
    }
    setUser(u);
  }, [router]);

  async function handleLogout() {
    try { await authApi.logout(session.getToken() ?? undefined); } catch {}
    session.clear();
    router.push('/');
  }

  if (!user) return null;

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-bold">Olá, AP {user.numero}</h1>
      <p className="text-ink/60 mt-2">Área do morador. UI-3 será construída em seguida.</p>
      <button onClick={handleLogout} className="btn-secondary mt-6">Sair</button>
    </main>
  );
}

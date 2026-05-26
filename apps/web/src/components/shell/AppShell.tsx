'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  Calendar,
  Camera,
  FileText,
  Home,
  User,
  Building2,
  KeyRound,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { session, type SessionUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/cn';

// ── Nav config by role ──────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard',   href: '/admin',              icon: LayoutDashboard },
    { label: 'Moradores',   href: '/admin/moradores',    icon: Users },
    { label: 'Porteiros',   href: '/admin/porteiros',    icon: KeyRound },
    { label: 'Encomendas',  href: '/admin/encomendas',   icon: Package },
    { label: 'Reservas',    href: '/admin/reservas',     icon: Calendar },
    { label: 'Fila Facial', href: '/admin/facial',       icon: Camera },
    { label: 'Relatórios',  href: '/admin/relatorios',   icon: FileText },
    { label: 'WhatsApp',    href: '/admin/whatsapp',     icon: MessageSquare },
    { label: 'Admins',      href: '/admin/admins',       icon: Shield },
  ],
  funcionario: [
    { label: 'Portaria',    href: '/porteiro',            icon: Building2 },
  ],
  morador: [
    { label: 'Início',      href: '/me',             icon: Home },
    { label: 'Encomendas',  href: '/me/encomendas',  icon: Package },
    { label: 'Reservas',    href: '/me/reservas',    icon: Calendar },
    { label: 'Meu Perfil',  href: '/me/perfil',      icon: User },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Síndico',
  funcionario: 'Porteiro',
  morador: 'Morador',
};

// ── Sidebar content (shared between desktop + mobile overlay) ───────────────

function SidebarContent({
  user,
  onNavigate,
}: {
  user: SessionUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[user.role] ?? [];

  async function handleLogout() {
    try { await authApi.logout(session.getToken() ?? undefined); } catch {}
    session.clear();
    router.push('/');
  }

  // Derive display name
  const displayName =
    user.role === 'admin'
      ? (user.email?.split('@')[0] ?? 'Síndico')
      : user.role === 'morador'
      ? `AP ${user.numero}`
      : (user.nome ?? 'Porteiro');

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-bone-dark/60">
        <Link
          href={session.getHomePath(user)}
          className="flex items-center gap-2.5 group"
          onClick={onNavigate}
        >
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-ink leading-none">MHVL</p>
            <p className="text-[10px] text-ink/40 leading-tight mt-0.5 truncate">
              Mansão Heitor Villa Lobos
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          // "exact" match for root pages, prefix match for sub-pages
          const isActive =
            item.href === pathname ||
            (item.href !== '/admin' &&
              item.href !== '/porteiro' &&
              item.href !== '/me' &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink/60 hover:text-ink hover:bg-bone',
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-ink/50 group-hover:text-ink')}
              />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User card + logout */}
      <div className="px-3 pb-4 pt-2 border-t border-bone-dark/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bone/60">
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink truncate">{displayName}</p>
            <p className="text-[10px] text-ink/50 truncate">{ROLE_LABEL[user.role]}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="p-1.5 rounded-lg text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AppShell ────────────────────────────────────────────────────────────────

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  /** Page title shown in the mobile/desktop header */
  title?: string;
}

export function AppShell({ user, children, title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bone overflow-hidden">
      {/* ── Desktop sidebar (always visible on lg+) ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-bone-dark/60 h-full">
        <SidebarContent user={user} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-bone-dark/60 lg:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-bone transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent user={user} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-14 bg-white border-b border-bone-dark/60 flex items-center px-4 gap-3">
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden p-2 rounded-lg text-ink/50 hover:text-ink hover:bg-bone transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          {title && (
            <h1 className="font-display font-bold text-sm text-ink hidden sm:block">{title}</h1>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notification bell (placeholder) */}
          <button className="p-2 rounded-lg text-ink/40 hover:text-ink hover:bg-bone transition-colors relative">
            <Bell className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

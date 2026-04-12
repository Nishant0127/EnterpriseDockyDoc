'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------------ //
// Theme hook — reads/writes localStorage, toggles .dark on <html>
// ------------------------------------------------------------------ //

function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial state from the html class (set by inline script in layout)
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('dd-theme', next ? 'dark' : 'light'); } catch { /* noop */ }
  }

  return { isDark, toggle };
}

// ------------------------------------------------------------------ //
// Page title resolver
// ------------------------------------------------------------------ //

const TITLE_MAP: [string, string][] = [
  ['/dashboard',  'Dashboard'],
  ['/documents',  'Documents'],
  ['/workspaces', 'Workspaces'],
  ['/members',    'Members'],
  ['/reminders',  'Reminders'],
  ['/reports',    'Reports'],
  ['/activity',   'Activity'],
  ['/settings',   'Settings'],
];

function resolveTitle(pathname: string): string {
  const match = TITLE_MAP.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
  return match?.[1] ?? 'DockyDoc';
}

// ------------------------------------------------------------------ //
// Header
// ------------------------------------------------------------------ //

export default function Header() {
  const { user, isLoading, logout } = useUser();
  const { toggle: toggleSidebar } = useSidebar();
  const { isDark, toggle: toggleTheme } = useTheme();
  const pathname = usePathname();

  const pageTitle = resolveTitle(pathname);
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?';

  return (
    <header className="h-[52px] bg-white dark:bg-surface border-b border-gray-200 dark:border-stroke flex items-center gap-3 px-4 flex-shrink-0">
      {/* Mobile hamburger — hidden on desktop */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-gray-500 dark:text-ink-3 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
      >
        <HamburgerIcon />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <span className="text-sm font-semibold text-gray-900 dark:text-ink truncate">
            {pageTitle}
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
            'text-gray-400 dark:text-ink-3',
            'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-ink',
          )}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* User avatar */}
        <div
          title={user ? `${user.firstName} ${user.lastName} — ${user.email}` : ''}
          className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-[11px] font-semibold text-brand-700 dark:text-brand-300 flex-shrink-0 select-none"
          role="img"
          aria-label={user ? `${user.firstName} ${user.lastName}` : 'User'}
        >
          {isLoading ? '…' : initials}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
            'text-gray-400 dark:text-ink-3',
            'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-ink',
          )}
        >
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}

// ------------------------------------------------------------------ //
// Icons
// ------------------------------------------------------------------ //

function HamburgerIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

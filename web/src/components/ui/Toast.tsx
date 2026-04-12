'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------------ //
// Types
// ------------------------------------------------------------------ //

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving?: boolean;
}

interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

// ------------------------------------------------------------------ //
// Context
// ------------------------------------------------------------------ //

const ToastContext = createContext<ToastAPI | null>(null);
let _nextId = 1;

const DURATION = 4500;     // ms until auto-dismiss
const EXIT_DURATION = 200; // ms for exit animation

// ------------------------------------------------------------------ //
// Provider
// ------------------------------------------------------------------ //

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const add = useCallback((message: string, variant: ToastVariant) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);

    const timer = setTimeout(() => startLeave(id), DURATION);
    timersRef.current.set(id, timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startLeave(id: number) {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    // Mark as leaving — triggers exit animation
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
    // Remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_DURATION);
  }

  const api: ToastAPI = {
    success: (m) => add(m, 'success'),
    error:   (m) => add(m, 'error'),
    info:    (m) => add(m, 'info'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastBanner key={t.id} toast={t} onDismiss={() => startLeave(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ------------------------------------------------------------------ //
// Variant styles
// ------------------------------------------------------------------ //

const VARIANT_STYLES: Record<ToastVariant, { wrap: string; iconBg: string; bar: string }> = {
  success: {
    wrap:   'bg-white dark:bg-surface border-green-200 dark:border-green-800/50 shadow-green-100 dark:shadow-none',
    iconBg: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    bar:    'bg-green-400',
  },
  error: {
    wrap:   'bg-white dark:bg-surface border-red-200 dark:border-red-800/50 shadow-red-100 dark:shadow-none',
    iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    bar:    'bg-red-400',
  },
  info: {
    wrap:   'bg-white dark:bg-surface border-blue-200 dark:border-blue-800/50 shadow-blue-100 dark:shadow-none',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    bar:    'bg-blue-400',
  },
};

// ------------------------------------------------------------------ //
// Individual toast banner
// ------------------------------------------------------------------ //

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') {
    return (
      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (variant === 'error') {
    return (
      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function ToastBanner({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  const styles = VARIANT_STYLES[toast.variant];

  // Trigger enter animation on next frame
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const isLeaving = toast.leaving ?? false;

  return (
    <div
      className={cn(
        'pointer-events-auto flex flex-col rounded-xl border shadow-lg overflow-hidden',
        'w-80 max-w-sm',
        styles.wrap,
        // Enter/exit transitions — slide from right
        'transition-all duration-200 ease-out',
        entered && !isLeaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4',
      )}
      role="alert"
    >
      {/* Main content row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className={cn('mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0', styles.iconBg)}>
          <ToastIcon variant={toast.variant} />
        </div>

        {/* Message */}
        <p className="flex-1 text-sm font-medium leading-snug text-gray-900 dark:text-ink">
          {toast.message}
        </p>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-gray-300 dark:text-ink-3 hover:text-gray-500 dark:hover:text-ink-2 active:scale-90 transition-all duration-100 mt-0.5 rounded"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar — animates from 100% → 0% over DURATION */}
      <div
        className={cn('h-[2px] w-full', styles.bar, 'origin-left opacity-50')}
        style={{
          animation: `toast-shrink ${DURATION}ms linear forwards`,
        }}
      />
    </div>
  );
}

// Inject the toast-shrink keyframe once (scoped by data-toast-style)
if (typeof document !== 'undefined') {
  if (!document.getElementById('toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'toast-keyframes';
    style.textContent = `@keyframes toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`;
    document.head.appendChild(style);
  }
}

// ------------------------------------------------------------------ //
// Hook
// ------------------------------------------------------------------ //

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

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

// ------------------------------------------------------------------ //
// Provider
// ------------------------------------------------------------------ //

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const add = useCallback((message: string, variant: ToastVariant) => {
    const id = _nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 4500);
    timersRef.current.set(id, timer);
  }, []);

  function dismiss(id: number) {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
          <ToastBanner key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ------------------------------------------------------------------ //
// Individual toast banner
// ------------------------------------------------------------------ //

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-white border-green-200 text-gray-900 shadow-green-100',
  error:   'bg-white border-red-200   text-gray-900 shadow-red-100',
  info:    'bg-white border-blue-200  text-gray-900 shadow-blue-100',
};

const ICON_BG: Record<ToastVariant, string> = {
  success: 'bg-green-100 text-green-600',
  error:   'bg-red-100   text-red-600',
  info:    'bg-blue-100  text-blue-600',
};

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
        'w-80 max-w-sm transition-all duration-250 ease-out',
        VARIANT_STYLES[toast.variant],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      )}
      role="alert"
    >
      <div className={cn('mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0', ICON_BG[toast.variant])}>
        <ToastIcon variant={toast.variant} />
      </div>
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Hook
// ------------------------------------------------------------------ //

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

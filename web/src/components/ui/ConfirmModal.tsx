'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  title: string;
  body: string;
  confirmLabel?: string;
  /** Red button + warning icon */
  danger?: boolean;
  /** Shows spinner and disables buttons */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  title,
  body,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loading, onClose]);

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !loading) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-backdrop"
      onClick={handleBackdrop}
    >
      <div className="bg-white dark:bg-surface rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 animate-in">
        {/* Icon + text */}
        <div className="flex items-start gap-4 mb-5">
          {danger && (
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 flex-none">
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                className="text-red-600"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-ink">{title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-ink-2 leading-relaxed">{body}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-ink-2 border border-gray-200 dark:border-stroke rounded-lg hover:bg-gray-50 dark:hover:bg-surface-high active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2',
              danger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            )}
          >
            {loading && (
              <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

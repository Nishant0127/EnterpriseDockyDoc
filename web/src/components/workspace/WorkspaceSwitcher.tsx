'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';
import type { WorkspaceType } from '@/types';

// ------------------------------------------------------------------ //
// Badge colours per workspace type
// ------------------------------------------------------------------ //

const TYPE_BADGE: Record<WorkspaceType, string> = {
  ENTERPRISE: 'bg-purple-100 text-purple-700',
  PERSONAL: 'bg-blue-100 text-blue-700',
  FAMILY: 'bg-green-100 text-green-700',
};

// ------------------------------------------------------------------ //
// Component
// ------------------------------------------------------------------ //

/**
 * WorkspaceSwitcher — dropdown in the Sidebar that lets the user
 * switch between their workspace memberships.
 *
 * Active workspace is stored in UserContext and persisted to localStorage.
 */
export default function WorkspaceSwitcher() {
  const { user, activeWorkspace, switchWorkspace } = useUser();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!user || !activeWorkspace) {
    // Skeleton placeholder while loading
    return (
      <div className="px-3 py-2">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  async function handleSwitch(workspaceId: string) {
    if (workspaceId === activeWorkspace?.workspaceId || switching) return;
    setSwitching(workspaceId);
    try {
      await switchWorkspace(workspaceId);
    } catch {
      // Error is already reverted in context — could show a toast here later
    } finally {
      setSwitching(null);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left',
          open ? 'bg-gray-100' : 'hover:bg-gray-100',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {/* Workspace avatar */}
        <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {activeWorkspace.workspaceName[0].toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
            {activeWorkspace.workspaceName}
          </p>
          <span
            className={cn(
              'inline-block text-[10px] font-medium px-1.5 py-px rounded-sm leading-tight',
              TYPE_BADGE[activeWorkspace.workspaceType],
            )}
          >
            {activeWorkspace.workspaceType}
          </span>
        </div>

        <ChevronIcon
          className={cn(
            'flex-shrink-0 text-gray-400 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Switch workspace"
          className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Your workspaces
            </p>
          </div>

          <ul className="py-1 max-h-56 overflow-y-auto">
            {user.workspaces.map((ws) => {
              const isActive = ws.workspaceId === activeWorkspace.workspaceId;
              const isLoading = switching === ws.workspaceId;

              return (
                <li key={ws.workspaceId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSwitch(ws.workspaceId)}
                    disabled={isLoading}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      isActive
                        ? 'bg-brand-50'
                        : 'hover:bg-gray-50',
                      isLoading && 'opacity-60 cursor-wait',
                    )}
                  >
                    {/* Mini avatar */}
                    <div
                      className={cn(
                        'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-200 text-gray-600',
                      )}
                    >
                      {ws.workspaceName[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isActive ? 'text-brand-700' : 'text-gray-900',
                        )}
                      >
                        {ws.workspaceName}
                      </p>
                      <p className="text-xs text-gray-400">{ws.role}</p>
                    </div>

                    {isActive && (
                      <CheckIcon className="flex-shrink-0 text-brand-600" />
                    )}
                    {isLoading && (
                      <SpinnerIcon className="flex-shrink-0 text-gray-400" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Inline icons
// ------------------------------------------------------------------ //

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

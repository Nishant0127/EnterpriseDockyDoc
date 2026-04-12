'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { WorkspaceListItem, WorkspaceType } from '@/types';

const TYPE_BADGE: Record<WorkspaceType, { label: string; class: string }> = {
  ENTERPRISE: { label: 'Enterprise', class: 'bg-purple-100 text-purple-700' },
  PERSONAL:   { label: 'Personal',   class: 'bg-blue-100 text-blue-700' },
  FAMILY:     { label: 'Family',     class: 'bg-green-100 text-green-700' },
};

export default function WorkspacesPage() {
  const { user, activeWorkspace, switchWorkspace, isLoading: userLoading } = useUser();
  const toast = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [justSwitched, setJustSwitched] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<WorkspaceListItem[]>('/api/v1/workspaces')
      .then(setWorkspaces)
      .catch(() => setError('Failed to load workspaces.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSwitch(id: string) {
    if (id === activeWorkspace?.workspaceId) return;
    setSwitching(id);
    try {
      await switchWorkspace(id);
      const ws = workspaces.find((w) => w.id === id);
      toast.success(ws ? `Switched to "${ws.name}".` : 'Workspace switched.');
      setJustSwitched(id);
      // Clear the "just switched" highlight after 2.5 s
      setTimeout(() => setJustSwitched(null), 2500);
    } catch {
      toast.error('Failed to switch workspace. Please try again.');
    } finally {
      setSwitching(null);
    }
  }

  if (userLoading || loading) return <PageSkeleton />;

  const sorted = [...workspaces].sort((a, b) => {
    const aA = a.id === activeWorkspace?.workspaceId ? 0 : 1;
    const bA = b.id === activeWorkspace?.workspaceId ? 0 : 1;
    return aA - bA;
  });

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Workspaces</h1>
        <p className="page-subtitle">
          {user?.firstName} {user?.lastName} &middot; {workspaces.length} workspace
          {workspaces.length !== 1 ? 's' : ''}
        </p>
        {/* Active workspace indicator — always visible at the top */}
        {activeWorkspace && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
            Active: {activeWorkspace.workspaceName}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((ws) => {
          const badge      = TYPE_BADGE[ws.type];
          const isActive   = ws.id === activeWorkspace?.workspaceId;
          const isNew      = ws.id === justSwitched;   // just-switched highlight
          const membership = user?.workspaces.find((m) => m.workspaceId === ws.id);

          return (
            <div
              key={ws.id}
              className={cn(
                // Base
                'relative flex items-center justify-between rounded-xl border p-4 transition-all duration-300',
                // Left accent bar for active — strong visual anchor
                'border-l-4',
                isActive && !isNew
                  ? 'border-l-brand-600 border-t-brand-300 border-r-brand-300 border-b-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700/40 shadow-sm'
                  : isNew
                  ? 'border-l-green-500 border-t-green-200 border-r-green-200 border-b-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700/40 shadow-sm'
                  : 'border-l-gray-200 border-gray-200 bg-white hover:border-gray-300 hover:shadow-card-md hover:-translate-y-px',
              )}
            >
              {/* Left */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors duration-300',
                    isNew
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {isNew ? (
                    // Checkmark on "just switched"
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    ws.name.slice(0, 2).toUpperCase()
                  )}
                </div>

                {/* Name + meta */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ws.name}</p>
                    {isNew && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500 text-white">
                        Switched ✓
                      </span>
                    )}
                    {isActive && !isNew && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={cn('inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded', badge.class)}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {ws.memberCount} member{ws.memberCount !== 1 ? 's' : ''}
                    </span>
                    {membership && (
                      <span className="text-xs text-gray-400 capitalize">
                        · {membership.role.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right — action button */}
              <button
                type="button"
                onClick={() => handleSwitch(ws.id)}
                disabled={isActive || isNew || switching === ws.id}
                className={cn(
                  'flex-shrink-0 ml-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  isNew
                    ? 'bg-green-500 text-white cursor-default'
                    : isActive
                    ? 'bg-brand-600 text-white cursor-default'
                    : switching === ws.id
                    ? 'border border-gray-200 text-gray-400 cursor-wait'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-95',
                )}
              >
                {switching === ws.id ? (
                  <span className="flex items-center gap-1.5">
                    <Spinner />
                    Switching…
                  </span>
                ) : isNew ? (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Switched
                  </span>
                ) : isActive ? (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Current
                  </span>
                ) : (
                  'Switch'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="11" height="11" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded mb-3" />
      <div className="h-7 w-44 bg-brand-100 rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl border-l-4 border-l-gray-200" />
        ))}
      </div>
    </div>
  );
}

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
    } catch {
      toast.error('Failed to switch workspace. Please try again.');
    } finally {
      setSwitching(null);
    }
  }

  if (userLoading || loading) return <PageSkeleton />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {user?.firstName} {user?.lastName} &middot; {workspaces.length} workspace
          {workspaces.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {[...workspaces].sort((a, b) => {
          const aActive = a.id === activeWorkspace?.workspaceId ? 0 : 1;
          const bActive = b.id === activeWorkspace?.workspaceId ? 0 : 1;
          return aActive - bActive;
        }).map((ws) => {
          const badge = TYPE_BADGE[ws.type];
          const isActive = ws.id === activeWorkspace?.workspaceId;
          const membership = user?.workspaces.find((m) => m.workspaceId === ws.id);

          return (
            <div
              key={ws.id}
              className={cn(
                'flex items-center justify-between rounded-xl border p-4 transition-all',
                isActive
                  ? 'border-brand-400 bg-brand-50 shadow-sm ring-1 ring-brand-200'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              {/* Left */}
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {ws.name}
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-600 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        'inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded',
                        badge.class,
                      )}
                    >
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

              {/* Right */}
              <button
                type="button"
                onClick={() => handleSwitch(ws.id)}
                disabled={isActive || switching === ws.id}
                className={cn(
                  'flex-shrink-0 ml-4 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white cursor-default'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50',
                )}
              >
                {switching === ws.id ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin" width="11" height="11" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Switching…
                  </span>
                ) : isActive ? (
                  <span className="flex items-center gap-1">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Current
                  </span>
                ) : 'Switch'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

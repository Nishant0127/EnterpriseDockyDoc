'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { WorkspaceUserRole } from '@/types';

interface WorkspaceMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: WorkspaceUserRole;
  status: string;
  joinedAt: string;
}

interface WorkspaceDetail {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  members: WorkspaceMember[];
}

const ROLE_BADGE: Record<WorkspaceUserRole, { label: string; class: string }> = {
  OWNER:  { label: 'Owner',  class: 'bg-purple-100 text-purple-700' },
  ADMIN:  { label: 'Admin',  class: 'bg-blue-100 text-blue-700' },
  EDITOR: { label: 'Editor', class: 'bg-green-100 text-green-700' },
  VIEWER: { label: 'Viewer', class: 'bg-gray-100 text-gray-600' },
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function MembersPage() {
  const { activeWorkspace, isLoading: userLoading } = useUser();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    apiFetch<WorkspaceDetail>(`/api/v1/workspaces/${activeWorkspace.workspaceId}`)
      .then(setDetail)
      .catch(() => setError('Failed to load members.'))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId]);

  if (userLoading || loading) return <PageSkeleton />;

  if (!activeWorkspace) {
    return <div className="text-sm text-gray-500 p-4">No active workspace selected.</div>;
  }

  if (error || !detail) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
        {error ?? 'Could not load members.'}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {detail.name} &middot; {detail.memberCount} member
          {detail.memberCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {detail.members.map((member) => {
            const badge = ROLE_BADGE[member.role];
            const joined = new Date(member.joinedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-3.5">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                  {initials(member.firstName, member.lastName)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                </div>

                {/* Role */}
                <span
                  className={cn(
                    'flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded',
                    badge.class,
                  )}
                >
                  {badge.label}
                </span>

                {/* Joined date */}
                <span className="flex-shrink-0 text-xs text-gray-400 hidden sm:block">
                  Joined {joined}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-48 bg-gray-100 rounded mb-6" />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-9 h-9 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-14 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { addWorkspaceMember, fetchWorkspaceDetail } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { WorkspaceDetail, WorkspaceMember, WorkspaceUserRole } from '@/types';

// Role sort order: lower index = shown first
const ROLE_ORDER: WorkspaceUserRole[] = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'];

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
  const { activeWorkspace, user, isLoading: userLoading } = useUser();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const canManage =
    activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN';

  function load(workspaceId: string) {
    setLoading(true);
    fetchWorkspaceDetail(workspaceId)
      .then(setDetail)
      .catch(() => setError('Failed to load members.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!activeWorkspace) return;
    load(activeWorkspace.workspaceId);
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

  const sortedMembers = [...detail.members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {detail.name} &middot; {detail.memberCount} member
            {detail.memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Add Member
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {sortedMembers.map((member) => {
            const badge = ROLE_BADGE[member.role];
            const joined = new Date(member.joinedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const isYou = member.userId === user?.id;

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
                    {isYou && (
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>
                    )}
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

      {showAddModal && (
        <AddMemberModal
          workspaceId={activeWorkspace.workspaceId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            load(activeWorkspace.workspaceId);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Add Member Modal
// ------------------------------------------------------------------ //

interface AddMemberModalProps {
  workspaceId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddMemberModal({ workspaceId, onClose, onAdded }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<WorkspaceUserRole>('VIEWER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addWorkspaceMember(workspaceId, { email, firstName, lastName, role });
      onAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Alice"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="alice@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceUserRole)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
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

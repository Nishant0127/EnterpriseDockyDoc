'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';
import {
  addWorkspaceMember,
  createInvitation,
  fetchWorkspaceDetail,
  listInvitations,
  removeWorkspaceMember,
  revokeInvitation,
  updateWorkspaceMember,
} from '@/lib/documents';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { WorkspaceDetail, WorkspaceMember, WorkspaceInvitation, WorkspaceUserRole } from '@/types';

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
  const toast = useToast();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<WorkspaceMember | null>(null);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const canManage =
    activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN';

  function load(workspaceId: string) {
    setLoading(true);
    setError(null);
    fetchWorkspaceDetail(workspaceId)
      .then(setDetail)
      .catch(() => setError('Failed to load members.'))
      .finally(() => setLoading(false));
    // Also refresh pending invitations if admin/owner
    if (canManage) {
      listInvitations(workspaceId)
        .then(setInvitations)
        .catch(() => {});
    }
  }

  useEffect(() => {
    if (!activeWorkspace) return;
    load(activeWorkspace.workspaceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.workspaceId]);

  async function confirmRemove() {
    if (!activeWorkspace || !pendingRemove) return;
    setRemovingId(pendingRemove.id);
    setPendingRemove(null);
    try {
      await removeWorkspaceMember(activeWorkspace.workspaceId, pendingRemove.id);
      toast.success(`${pendingRemove.firstName} ${pendingRemove.lastName} removed.`);
      load(activeWorkspace.workspaceId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member.');
    } finally {
      setRemovingId(null);
    }
  }

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
            {detail.name} &middot; {detail.memberCount} member{detail.memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Invite
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Add
            </button>
          </div>
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
            const isOwner = member.role === 'OWNER';

            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
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

                {/* Role badge */}
                <span className={cn('flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded', badge.class)}>
                  {badge.label}
                </span>

                {/* Joined */}
                <span className="flex-shrink-0 text-xs text-gray-400 hidden sm:block">
                  Joined {joined}
                </span>

                {/* Actions */}
                {canManage && !isYou && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingMember(member)}
                      title="Edit role"
                      className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <PencilIcon />
                    </button>
                    {!isOwner && (
                      <button
                        onClick={() => setPendingRemove(member)}
                        disabled={removingId === member.id}
                        title="Remove member"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {removingId === member.id ? (
                          <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <TrashIcon />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {canManage && invitations.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Pending Invitations
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
              {invitations.length}
            </span>
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {invitations.map((inv) => {
                const expiresLabel = new Date(inv.expiresAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                });
                const isRevoking = revokingId === inv.id;
                return (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-3 bg-amber-50/40">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700 flex-shrink-0">
                      {inv.email[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400">
                        Invited by {inv.createdBy.firstName} {inv.createdBy.lastName}
                        {' · '}expires {expiresLabel}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                      {inv.role}
                    </span>
                    <button
                      onClick={async () => {
                        if (!activeWorkspace) return;
                        setRevokingId(inv.id);
                        try {
                          await revokeInvitation(activeWorkspace.workspaceId, inv.id);
                          setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
                          toast.success(`Invitation to ${inv.email} revoked.`);
                        } catch {
                          toast.error('Failed to revoke invitation.');
                        } finally {
                          setRevokingId(null);
                        }
                      }}
                      disabled={isRevoking}
                      title="Revoke invitation"
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {isRevoking ? (
                        <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          workspaceId={activeWorkspace.workspaceId}
          onClose={() => setShowInviteModal(false)}
          onInvited={(inv) => {
            setInvitations((prev) => [inv, ...prev.filter((i) => i.id !== inv.id)]);
          }}
        />
      )}

      {showAddModal && (
        <AddMemberModal
          workspaceId={activeWorkspace.workspaceId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            load(activeWorkspace.workspaceId);
            toast.success('Member added to workspace.');
          }}
        />
      )}

      {editingMember && (
        <EditRoleModal
          workspaceId={activeWorkspace.workspaceId}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={() => {
            setEditingMember(null);
            load(activeWorkspace.workspaceId);
            toast.success('Member updated.');
          }}
        />
      )}

      {pendingRemove && (
        <ConfirmModal
          title="Remove member"
          body={`${pendingRemove.firstName} ${pendingRemove.lastName} will lose access to this workspace immediately.`}
          confirmLabel="Remove Member"
          danger
          loading={removingId === pendingRemove.id}
          onConfirm={confirmRemove}
          onClose={() => setPendingRemove(null)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Edit Role Modal
// ------------------------------------------------------------------ //

function EditRoleModal({
  workspaceId,
  member,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  member: WorkspaceMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(member.firstName);
  const [lastName, setLastName] = useState(member.lastName);
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState<WorkspaceUserRole>(member.role);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      role !== member.role ||
      firstName.trim() !== member.firstName ||
      lastName.trim() !== member.lastName ||
      email.trim() !== member.email,
    [role, firstName, lastName, email, member.role, member.firstName, member.lastName, member.email],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!isDirty) { onClose(); return; }

    setSubmitting(true);
    setError(null);
    try {
      await updateWorkspaceMember(workspaceId, member.id, {
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(email.trim() !== member.email && { email: email.trim() }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Edit Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="member@example.com"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Changing email affects this user globally across all workspaces.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceUserRole)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="VIEWER">Viewer — can view and download shared documents</option>
              <option value="EDITOR">Editor — can upload and edit documents</option>
              <option value="ADMIN">Admin — can manage members and settings</option>
              <option value="OWNER">Owner — full control</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isDirty}
              title={!isDirty ? 'No changes to save' : undefined}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Add Member Modal
// ------------------------------------------------------------------ //

function AddMemberModal({
  workspaceId,
  onClose,
  onAdded,
}: {
  workspaceId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
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
      setError(err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
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
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {submitting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Skeleton + icons
// ------------------------------------------------------------------ //

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

function PencilIcon() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ------------------------------------------------------------------ //
// Invite Modal
// ------------------------------------------------------------------ //

function InviteModal({
  workspaceId,
  onClose,
  onInvited,
}: {
  workspaceId: string;
  onClose: () => void;
  onInvited: (inv: WorkspaceInvitation) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceUserRole>('VIEWER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<WorkspaceInvitation | null>(null);

  const inviteLink = created
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${created.token}`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const inv = await createInvitation(workspaceId, { email: email.trim(), role });
      setCreated(inv);
      onInvited(inv);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {created ? 'Invitation Created' : 'Invite to Workspace'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {created && inviteLink ? (
          /* Success — show the invite link */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Invitation sent to <span className="font-medium">{created.email}</span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Share this link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="px-3 py-2 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                This link expires{' '}
                {new Date(created.expiresAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="colleague@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceUserRole)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="VIEWER">Viewer — can view and download documents</option>
                <option value="EDITOR">Editor — can upload and edit documents</option>
                <option value="ADMIN">Admin — can manage members and settings</option>
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

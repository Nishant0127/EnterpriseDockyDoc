'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { getPublicInvitation, acceptInvitation } from '@/lib/documents';
import type { PublicInvitation, WorkspaceUserRole } from '@/types';

const ROLE_LABELS: Record<WorkspaceUserRole, string> = {
  OWNER:  'Owner',
  ADMIN:  'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

const ROLE_DESCRIPTION: Record<WorkspaceUserRole, string> = {
  OWNER:  'Full control over all documents and settings',
  ADMIN:  'Can manage members and workspace settings',
  EDITOR: 'Can upload, edit, and organize documents',
  VIEWER: 'Can view and download shared documents',
};

const TYPE_BADGE: Record<string, string> = {
  ENTERPRISE: 'bg-purple-100 text-purple-700',
  PERSONAL:   'bg-blue-100 text-blue-700',
  FAMILY:     'bg-green-100 text-green-700',
};

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoading: userLoading, activeWorkspace, refreshUser } = useUser();

  const [invite, setInvite] = useState<PublicInvitation | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);

  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch invitation details (public, no auth needed)
  useEffect(() => {
    if (!params.token) return;
    getPublicInvitation(params.token)
      .then(setInvite)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Invitation not found or no longer valid.';
        setInviteError(msg);
      })
      .finally(() => setInviteLoading(false));
  }, [params.token]);

  async function handleAccept() {
    if (!params.token) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const result = await acceptInvitation(params.token);
      setAccepted(true);
      // Refresh user context so new workspace membership appears
      if (refreshUser) await refreshUser();
      // Navigate to dashboard after a short delay so user can read the success message
      setTimeout(() => router.push('/dashboard'), 1500);
      void result; // result.workspaceName available if needed
    } catch (err: unknown) {
      setAcceptError(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  }

  // ── Loading states ──────────────────────────────────────────────────

  if (inviteLoading || userLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <svg className="animate-spin text-brand-500" width="32" height="32" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Loading invitation…</p>
        </div>
      </PageShell>
    );
  }

  // ── Invalid / expired invitation ────────────────────────────────────

  if (inviteError || !invite) {
    return (
      <PageShell>
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="text-red-500">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Invitation not valid</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            {inviteError ?? 'This invitation link is invalid, expired, or has already been used.'}
          </p>
          <a href="/dashboard" className="inline-block mt-5 text-sm text-brand-600 hover:underline">
            Go to Dashboard →
          </a>
        </div>
      </PageShell>
    );
  }

  // ── Success state ───────────────────────────────────────────────────

  if (accepted) {
    return (
      <PageShell>
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" className="text-green-500">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">You&apos;re in!</h2>
          <p className="text-sm text-gray-500">
            Welcome to <span className="font-medium">{invite.workspace.name}</span>. Redirecting to dashboard…
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Main invite card ─────────────────────────────────────────────────

  const expiresAt = new Date(invite.expiresAt);
  const expiresLabel = expiresAt.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const emailMismatch = user && user.email.toLowerCase() !== invite.email.toLowerCase();
  const typeBadge = TYPE_BADGE[invite.workspace.type] ?? 'bg-gray-100 text-gray-500';

  return (
    <PageShell>
      {/* Workspace banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-600 mb-3">
          <span className="text-white font-bold text-xl">
            {invite.workspace.name[0]?.toUpperCase() ?? 'W'}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          You&apos;ve been invited to
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xl font-bold text-gray-900">{invite.workspace.name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeBadge}`}>
            {invite.workspace.type}
          </span>
        </div>
      </div>

      {/* Invite details */}
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 mb-6 text-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-500">Invited by</span>
          <span className="font-medium text-gray-900">
            {invite.invitedBy.firstName} {invite.invitedBy.lastName}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-500">Invited email</span>
          <span className="font-medium text-gray-900">{invite.email}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-500">Role</span>
          <div className="text-right">
            <span className="font-medium text-gray-900">{ROLE_LABELS[invite.role]}</span>
            <p className="text-[11px] text-gray-400">{ROLE_DESCRIPTION[invite.role]}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-gray-500">Expires</span>
          <span className="text-gray-700">{expiresLabel}</span>
        </div>
      </div>

      {/* Auth check */}
      {!user ? (
        /* Not signed in — prompt to log in */
        <div className="space-y-3">
          <p className="text-sm text-center text-gray-500">
            Sign in to accept this invitation.
          </p>
          <a
            href={`/login?next=/join/${params.token}`}
            className="block w-full text-center px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Sign in to Accept
          </a>
        </div>
      ) : emailMismatch ? (
        /* Signed in as wrong account */
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold mb-1">Wrong account</p>
          <p>
            This invitation was sent to <span className="font-medium">{invite.email}</span>.
            You&apos;re signed in as <span className="font-medium">{user.email}</span>.
          </p>
          <p className="mt-2 text-xs text-amber-600">
            Sign out and sign in with the invited email address to continue.
          </p>
        </div>
      ) : (
        /* Correct user — show accept button */
        <div className="space-y-3">
          <p className="text-xs text-center text-gray-400">
            Signed in as <span className="font-medium text-gray-600">{user.email}</span>
          </p>
          {acceptError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {acceptError}
            </div>
          )}
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            className="w-full px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:scale-95 disabled:opacity-60 transition-all"
          >
            {accepting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Joining…
              </span>
            ) : (
              `Accept & Join ${invite.workspace.name}`
            )}
          </button>
          <p className="text-[11px] text-center text-gray-400">
            By accepting, you agree to the workspace terms and access policies.
          </p>
        </div>
      )}
    </PageShell>
  );
}

// ------------------------------------------------------------------ //
// Shell — minimal layout matching the login page style
// ------------------------------------------------------------------ //

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <span className="text-white font-bold text-xl">D</span>
          </a>
          <h1 className="text-2xl font-bold text-gray-900">DockyDoc</h1>
          <p className="mt-1 text-sm text-gray-500">Workspace Invitation</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} DockyDoc. All rights reserved.
        </p>
      </div>
    </div>
  );
}

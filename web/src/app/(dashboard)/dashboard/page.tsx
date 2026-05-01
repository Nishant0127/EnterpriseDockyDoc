'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { fetchWorkspaceSummary, fetchExpiringDocuments } from '@/lib/documents';
import { fetchWorkspaceActivity } from '@/lib/audit';
import { describeAuditLog, auditActionCategory } from '@/lib/audit';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { WorkspaceSummary, ExpiringDocument, AuditLog } from '@/types';

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function DashboardPage() {
  const { activeWorkspace, user, isLoading: userLoading } = useUser();
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    setDataLoading(true);

    Promise.all([
      fetchWorkspaceSummary(activeWorkspace.workspaceId),
      fetchExpiringDocuments(activeWorkspace.workspaceId),
      fetchWorkspaceActivity({ workspaceId: activeWorkspace.workspaceId, limit: 10 }),
    ])
      .then(([s, exp, act]) => {
        if (cancelled) return;
        setSummary(s);
        setExpiring(exp.slice(0, 8));
        setActivity(act);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => { if (!cancelled) setDataLoading(false); });

    return () => { cancelled = true; };
  }, [activeWorkspace?.workspaceId]);

  const loading = userLoading || dataLoading;
  if (loading) return <DashboardSkeleton />;

  // User has no accessible workspaces (new user, or removed from all workspaces)
  if (!activeWorkspace) {
    return <NoWorkspaceState />;
  }

  const hasExpired   = (summary?.expiredCount  ?? 0) > 0;
  const hasExpiring  = (summary?.expiringCount ?? 0) > 0;

  return (
    <div className="space-y-7">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            Welcome back{user ? `, ${user.firstName}` : ''}
          </h1>
          <p className="page-subtitle">
            {activeWorkspace.workspaceName} — here&apos;s your workspace at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/documents?upload=1"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
          >
            <UploadIcon className="text-white" />
            Upload
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-stroke text-xs font-medium text-gray-700 dark:text-ink-2 hover:bg-gray-50 dark:hover:bg-surface-high transition-colors"
          >
            <FolderIcon className="text-gray-500" />
            Documents
          </Link>
          <Link
            href="/members"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-stroke text-xs font-medium text-gray-700 dark:text-ink-2 hover:bg-gray-50 dark:hover:bg-surface-high transition-colors"
          >
            <UsersIcon className="text-gray-500" />
            Members
          </Link>
        </div>
      </div>

      {/* ── 6-stat KPI grid (2 → 3 → 6 columns) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Documents"
          value={summary?.totalDocuments ?? 0}
          sub={summary ? `${summary.activeDocuments} active` : '—'}
          icon={<DocIcon />}
          color="brand"
          href="/documents"
        />
        <KpiCard
          label="Archived"
          value={summary?.archivedDocuments ?? 0}
          sub="documents"
          icon={<ArchiveIcon />}
          color="gray"
          href="/documents?status=archived"
        />
        <KpiCard
          label="Expiring"
          value={summary?.expiringCount ?? 0}
          sub="within 90 days"
          icon={<ClockIcon />}
          color={hasExpiring ? 'orange' : 'gray'}
          href="/reminders?tab=expiring"
        />
        <KpiCard
          label="Expired"
          value={summary?.expiredCount ?? 0}
          sub="need attention"
          icon={<AlertIcon />}
          color={hasExpired ? 'red' : 'gray'}
          href="/reminders?tab=expired"
        />
        <KpiCard
          label="Members"
          value={summary?.memberCount ?? 0}
          sub="in workspace"
          icon={<UsersIcon />}
          color="teal"
          href="/members"
        />
        <KpiCard
          label="Shares"
          value={summary?.activeShares ?? 0}
          sub="active links"
          icon={<ShareIcon />}
          color="purple"
        />
      </div>

      {/* ── Uploads-this-week banner + bottom panels ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

        {/* Recent Activity — 3 of 5 cols */}
        <div className="lg:col-span-3 bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-stroke overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-stroke">
            <div className="flex items-center gap-2">
              <ActivityIcon className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
              {summary?.recentUploads !== undefined && summary.recentUploads > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-semibold">
                  {summary.recentUploads} upload{summary.recentUploads !== 1 ? 's' : ''} this week
                </span>
              )}
            </div>
            <Link href="/activity" className="text-xs text-brand-600 hover:underline flex-shrink-0">
              View all →
            </Link>
          </div>
          {activity.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500 font-medium">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload a document or invite a team member to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activity.map((log) => {
                const category = auditActionCategory(log.action);
                const actor = log.user
                  ? `${log.user.firstName} ${log.user.lastName}`
                  : 'External';
                const diff = Date.now() - new Date(log.createdAt).getTime();
                const m = Math.floor(diff / 60000);
                const ago =
                  m < 1 ? 'just now'
                  : m < 60 ? `${m}m`
                  : m < 1440 ? `${Math.floor(m / 60)}h`
                  : new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_COLORS[category])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 truncate">{describeAuditLog(log)}</p>
                      <p className="text-[10px] text-gray-400">{actor}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap tabular-nums">{ago}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expiring Documents — 2 of 5 cols */}
        <div className={cn(
          'lg:col-span-2 bg-white dark:bg-surface rounded-xl border overflow-hidden',
          hasExpired ? 'border-red-200 dark:border-red-900/50' : hasExpiring ? 'border-orange-200 dark:border-orange-900/50' : 'border-gray-200 dark:border-stroke',
        )}>
          <div className={cn(
            'flex items-center justify-between px-5 py-3.5 border-b',
            hasExpired ? 'border-red-100 bg-red-50' : hasExpiring ? 'border-orange-100 bg-orange-50' : 'border-gray-100',
          )}>
            <div className="flex items-center gap-2">
              <ClockIcon className={cn(hasExpired ? 'text-red-500' : hasExpiring ? 'text-orange-500' : 'text-gray-400')} />
              <h2 className={cn(
                'text-sm font-semibold',
                hasExpired ? 'text-red-700' : hasExpiring ? 'text-orange-700' : 'text-gray-900',
              )}>
                Expiring
              </h2>
              {hasExpired && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  {summary!.expiredCount} expired
                </span>
              )}
            </div>
            <Link
              href="/reminders"
              className={cn('text-xs hover:underline flex-shrink-0', hasExpired ? 'text-red-600' : 'text-brand-600')}
            >
              View all →
            </Link>
          </div>
          {expiring.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-green-600 font-medium">All clear</p>
              <p className="text-xs text-gray-400 mt-1">No documents expiring in the next 90 days.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {expiring.map((doc) => {
                const isExpired  = doc.daysUntilExpiry < 0;
                const isToday    = doc.daysUntilExpiry === 0;
                const isCritical = doc.daysUntilExpiry <= 7;
                return (
                  <div key={doc.id} className="flex items-center gap-2 px-5 py-2.5">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-xs font-medium text-gray-900 hover:text-brand-600 truncate block"
                      >
                        {doc.name}
                      </Link>
                      {doc.folderName && (
                        <p className="text-[10px] text-gray-400 truncate">{doc.folderName}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold whitespace-nowrap tabular-nums',
                      isExpired || isToday ? 'text-red-600'
                      : isCritical ? 'text-orange-600'
                      : 'text-yellow-700',
                    )}>
                      {isExpired
                        ? `${Math.abs(doc.daysUntilExpiry)}d over`
                        : isToday ? 'Today'
                        : `${doc.daysUntilExpiry}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// KPI Card
// ------------------------------------------------------------------ //

const COLOR_ICON: Record<string, string> = {
  brand:  'bg-brand-50',
  orange: 'bg-orange-50',
  red:    'bg-red-50',
  purple: 'bg-purple-50',
  teal:   'bg-teal-50',
  gray:   'bg-gray-50',
};

const COLOR_VALUE: Record<string, string> = {
  brand:  'text-brand-600',
  orange: 'text-orange-600',
  red:    'text-red-600',
  purple: 'text-purple-600',
  teal:   'text-teal-600',
  gray:   'text-gray-700',
};

const DOT_COLORS: Record<string, string> = {
  create:   'bg-green-500',
  update:   'bg-blue-500',
  delete:   'bg-red-500',
  share:    'bg-purple-500',
  download: 'bg-amber-500',
  member:   'bg-teal-500',
};

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
  href,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={cn(
      'bg-white dark:bg-surface rounded-xl border border-gray-200 dark:border-stroke p-5 transition-all duration-150',
      href && 'group-hover:shadow-card-md group-hover:-translate-y-0.5',
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-none">{label}</p>
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-transform duration-150', COLOR_ICON[color], href && 'group-hover:scale-110')}>
          <span className={cn(COLOR_VALUE[color], '[&_svg]:w-3 [&_svg]:h-3')}>{icon}</span>
        </div>
      </div>
      <p className={cn('text-2xl font-bold leading-none', COLOR_VALUE[color])}>{value}</p>
      <p className="mt-2 text-[10px] text-gray-400 truncate">{sub}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group rounded-xl">
        {content}
      </Link>
    );
  }
  return content;
}

// ------------------------------------------------------------------ //
// Skeleton
// ------------------------------------------------------------------ //

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-44 bg-gray-200 rounded mb-1.5" />
          <div className="h-3 w-64 bg-gray-100 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          <div className="h-8 w-24 bg-gray-100 rounded-lg" />
          <div className="h-8 w-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 h-72" />
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 h-72" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Icons
// ------------------------------------------------------------------ //

function DocIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string } = {}) {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ //
// No workspace state — with inline create form
// ------------------------------------------------------------------ //

function NoWorkspaceState() {
  const { refreshUser, switchWorkspace } = useUser();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const created = await apiFetch<{ id: string; name: string }>('/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });
      toast.success(`Workspace "${created.name}" created!`);
      await refreshUser(created.id);
      await switchWorkspace(created.id);
    } catch {
      toast.error('Failed to create workspace. Please try again.');
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="text-gray-400">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </div>
      <h2 className="text-sm font-semibold text-gray-700">No workspace selected</h2>
      <p className="mt-1 text-xs text-gray-400 max-w-xs">
        You don&apos;t belong to any workspace yet. Create one to get started.
      </p>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Create Workspace
        </button>
      ) : (
        <form onSubmit={handleCreate} className="mt-5 flex flex-col items-center gap-2 w-full max-w-xs">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            maxLength={60}
            required
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2 w-full">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

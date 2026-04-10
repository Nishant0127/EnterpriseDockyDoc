'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { fetchWorkspaceSummary, fetchExpiringDocuments } from '@/lib/documents';
import { fetchWorkspaceActivity } from '@/lib/audit';
import { describeAuditLog, auditActionCategory } from '@/lib/audit';
import { cn } from '@/lib/utils';
import type { WorkspaceSummary, ExpiringDocument, AuditLog } from '@/types';

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function DashboardPage() {
  const { activeWorkspace, user } = useUser();
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchWorkspaceSummary(activeWorkspace.workspaceId),
      fetchExpiringDocuments(activeWorkspace.workspaceId),
      fetchWorkspaceActivity({ workspaceId: activeWorkspace.workspaceId, limit: 6 }),
    ])
      .then(([s, exp, act]) => {
        if (cancelled) return;
        setSummary(s);
        setExpiring(exp.slice(0, 5));
        setActivity(act);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [activeWorkspace?.workspaceId]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {activeWorkspace?.workspaceName ?? 'Dashboard'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Welcome back{user ? `, ${user.firstName}` : ''}. Here&apos;s your workspace at a glance.
          </p>
        </div>
        {/* Quick Actions — top right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/documents?upload=1"
            title="Upload document"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
          >
            <UploadIcon className="text-white" />
            Upload
          </Link>
          <Link
            href="/documents"
            title="Browse documents"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FolderIcon className="text-gray-500" />
            Documents
          </Link>
          <Link
            href="/members"
            title="Manage members"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UsersIcon className="text-gray-500" />
            Members
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total documents"
          value={summary?.totalDocuments ?? 0}
          sub={summary ? `${summary.activeDocuments} active · ${summary.archivedDocuments} archived` : ''}
          icon={<DocIcon />}
          color="brand"
          href="/documents"
        />
        <KpiCard
          label="Expiring soon"
          value={summary?.expiringCount ?? 0}
          sub="within 90 days"
          icon={<ClockIcon />}
          color={summary && summary.expiringCount > 0 ? 'orange' : 'gray'}
          href="/reminders?tab=expiring"
        />
        <KpiCard
          label="Expired"
          value={summary?.expiredCount ?? 0}
          sub="need attention"
          icon={<AlertIcon />}
          color={summary && summary.expiredCount > 0 ? 'red' : 'gray'}
          href="/reminders?tab=expired"
        />
        <KpiCard
          label="Active shares"
          value={summary?.activeShares ?? 0}
          sub="internal + external"
          icon={<ShareIcon />}
          color="purple"
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <UsersIcon className="text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{summary?.memberCount ?? 0}</p>
            <p className="text-xs text-gray-500">Team members</p>
          </div>
          <Link href="/members" className="ml-auto text-xs text-brand-600 hover:underline">
            Manage →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <UploadIcon className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{summary?.recentUploads ?? 0}</p>
            <p className="text-xs text-gray-500">Uploads this week</p>
          </div>
          <Link href="/documents" className="ml-auto text-xs text-brand-600 hover:underline">
            View →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <Link href="/activity" className="text-xs text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No activity yet.</div>
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
                  : m < 60 ? `${m}m ago`
                  : m < 1440 ? `${Math.floor(m / 60)}h ago`
                  : new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                return (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', DOT_COLORS[category])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{describeAuditLog(log)}</p>
                      <p className="text-xs text-gray-400">{actor}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{ago}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expiring Documents */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Expiring Documents</h2>
            <Link href="/reminders" className="text-xs text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          {expiring.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              No documents expiring soon.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {expiring.map((doc) => {
                const isExpired = doc.daysUntilExpiry < 0;
                const isToday = doc.daysUntilExpiry === 0;
                const isCritical = doc.daysUntilExpiry <= 7;
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-brand-600 truncate block"
                      >
                        {doc.name}
                      </Link>
                      {doc.folderName && (
                        <p className="text-xs text-gray-400 truncate">{doc.folderName}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold whitespace-nowrap',
                        isExpired || isToday ? 'text-red-600'
                        : isCritical ? 'text-orange-600'
                        : 'text-yellow-700',
                      )}
                    >
                      {isExpired
                        ? `${Math.abs(doc.daysUntilExpiry)}d overdue`
                        : isToday
                        ? 'Today'
                        : `${doc.daysUntilExpiry}d left`}
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
  gray:   'bg-gray-50',
};

const COLOR_VALUE: Record<string, string> = {
  brand:  'text-brand-600',
  orange: 'text-orange-600',
  red:    'text-red-600',
  purple: 'text-purple-600',
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
      'bg-white rounded-xl border border-gray-200 p-5 transition-all duration-150',
      href && 'group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-gray-300',
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150', COLOR_ICON[color], href && 'group-hover:scale-110')}>
          <span className={COLOR_VALUE[color]}>{icon}</span>
        </div>
      </div>
      <p className={cn('text-3xl font-bold', COLOR_VALUE[color])}>{value}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-gray-400">{sub}</p>
        {href && (
          <span className="text-[10px] text-gray-300 group-hover:text-brand-400 transition-colors font-medium">
            View →
          </span>
        )}
      </div>
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
    <div className="max-w-6xl animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-100 rounded mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 h-64" />
        <div className="bg-white rounded-xl border border-gray-200 h-64" />
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

function ClockIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <path d="M4 16.004V17a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M16 8l-4-4-4 4M12 4v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

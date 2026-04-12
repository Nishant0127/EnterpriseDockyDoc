'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/context/UserContext';
import {
  fetchWorkspaceActivity,
  describeAuditLog,
  auditActionCategory,
  formatAuditAction,
} from '@/lib/audit';
import { cn } from '@/lib/utils';
import type { AuditAction, AuditEntityType, AuditLog } from '@/types';

// ------------------------------------------------------------------ //
// Constants
// ------------------------------------------------------------------ //

const PAGE_SIZE = 25;

const CATEGORY_DOT: Record<string, string> = {
  create:   'bg-green-500',
  update:   'bg-blue-500',
  delete:   'bg-red-500',
  share:    'bg-purple-500',
  download: 'bg-amber-500',
  member:   'bg-teal-500',
};

const CATEGORY_RING: Record<string, string> = {
  create:   'ring-green-100',
  update:   'ring-blue-100',
  delete:   'ring-red-100',
  share:    'ring-purple-100',
  download: 'ring-amber-100',
  member:   'ring-teal-100',
};

const CATEGORY_PILL: Record<string, string> = {
  create:   'bg-green-50 text-green-700',
  update:   'bg-blue-50 text-blue-700',
  delete:   'bg-red-50 text-red-700',
  share:    'bg-purple-50 text-purple-700',
  download: 'bg-amber-50 text-amber-700',
  member:   'bg-teal-50 text-teal-700',
};

const ENTITY_FILTER_OPTIONS: { label: string; value: AuditEntityType | '' }[] = [
  { label: 'All types',   value: '' },
  { label: 'Documents',  value: 'DOCUMENT' },
  { label: 'Shares',     value: 'SHARE' },
  { label: 'Reminders',  value: 'REMINDER' },
  { label: 'Members',    value: 'USER' },
];

const ACTION_FILTER_OPTIONS: { label: string; value: AuditAction | '' }[] = [
  { label: 'All actions',       value: '' },
  { label: 'Created',           value: 'DOCUMENT_CREATED' },
  { label: 'Updated',           value: 'DOCUMENT_UPDATED' },
  { label: 'Deleted',           value: 'DOCUMENT_DELETED' },
  { label: 'New version',       value: 'DOCUMENT_VERSION_ADDED' },
  { label: 'Downloaded',        value: 'DOCUMENT_DOWNLOADED' },
  { label: 'Shared internally', value: 'DOCUMENT_SHARED_INTERNAL' },
  { label: 'External link',     value: 'DOCUMENT_SHARED_EXTERNAL' },
  { label: 'Share revoked',     value: 'SHARE_REVOKED' },
  { label: 'Reminder updated',  value: 'REMINDER_UPDATED' },
  { label: 'Member added',      value: 'MEMBER_ADDED' },
  { label: 'Role updated',      value: 'MEMBER_ROLE_UPDATED' },
];

const DATE_RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: 'All time',    days: 0   },
  { label: 'Last 24h',   days: 1   },
  { label: 'Last 7d',    days: 7   },
  { label: 'Last 30d',   days: 30  },
  { label: 'Last 90d',   days: 90  },
];

// ------------------------------------------------------------------ //
// Date grouping helper
// ------------------------------------------------------------------ //

function groupByDate(logs: AuditLog[]): { label: string; items: AuditLog[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const today: AuditLog[] = [];
  const yesterday: AuditLog[] = [];
  const older: AuditLog[] = [];

  for (const log of logs) {
    const t = new Date(log.createdAt).getTime();
    if (t >= todayStart) today.push(log);
    else if (t >= yesterdayStart) yesterday.push(log);
    else older.push(log);
  }

  return [
    ...(today.length     ? [{ label: 'Today',     items: today     }] : []),
    ...(yesterday.length ? [{ label: 'Yesterday', items: yesterday }] : []),
    ...(older.length     ? [{ label: 'Older',     items: older     }] : []),
  ];
}

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function ActivityPage() {
  const { activeWorkspace } = useUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedOnce = useRef(false);

  // Filters
  const [entityType, setEntityType] = useState<AuditEntityType | ''>('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [dateRangeDays, setDateRangeDays] = useState(0);

  const hasFilters = entityType !== '' || action !== '' || dateRangeDays !== 0;

  function clearFilters() {
    setEntityType('');
    setAction('');
    setDateRangeDays(0);
  }

  // Build dateFrom from selected range
  function buildDateFrom(days: number): string | undefined {
    if (!days) return undefined;
    return new Date(Date.now() - days * 86400000).toISOString();
  }

  // Initial/filter-change load — resets and fetches first page
  useEffect(() => {
    if (!activeWorkspace) return;
    let cancelled = false;
    setLoading(true);
    setLogs([]);
    setLoadedCount(0);
    setHasMore(false);

    fetchWorkspaceActivity({
      workspaceId: activeWorkspace.workspaceId,
      entityType: entityType || undefined,
      action: action || undefined,
      limit: PAGE_SIZE,
      offset: 0,
      dateFrom: buildDateFrom(dateRangeDays),
    })
      .then((data) => {
        if (!cancelled) {
          setLogs(data);
          setLoadedCount(data.length);
          setHasMore(data.length === PAGE_SIZE);
        }
      })
      .catch(() => { if (!cancelled) setLogs([]); })
      .finally(() => {
        if (!cancelled) {
          hasLoadedOnce.current = true;
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.workspaceId, entityType, action, dateRangeDays]);

  async function loadMore() {
    if (!activeWorkspace || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchWorkspaceActivity({
        workspaceId: activeWorkspace.workspaceId,
        entityType: entityType || undefined,
        action: action || undefined,
        limit: PAGE_SIZE,
        offset: loadedCount,
        dateFrom: buildDateFrom(dateRangeDays),
      });
      setLogs((prev) => [...prev, ...data]);
      setLoadedCount((c) => c + data.length);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }

  const showSkeleton = loading && !hasLoadedOnce.current;
  const groups = groupByDate(logs);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-5">
        <h1 className="page-title">Activity</h1>
        <p className="page-subtitle">
          Workspace audit log — all critical actions in one place.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity type */}
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as AuditEntityType | '')}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ENTITY_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Action */}
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | '')}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ACTION_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setDateRangeDays(opt.days)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150',
                  dateRangeDays === opt.days
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Clear
            </button>
          )}

          {loading && hasLoadedOnce.current && (
            <svg className="animate-spin text-brand-500 ml-1" width="13" height="13" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      {showSkeleton ? (
        <ActivitySkeleton />
      ) : logs.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <ClockIcon className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            {hasFilters ? 'No activity matches these filters.' : 'No activity yet.'}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters} className="mt-2 text-xs text-brand-600 hover:underline">
              Clear filters
            </button>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Upload a document or make a change to see activity here.
            </p>
          )}
        </div>
      ) : (
        <div>
          {/* Grouped timeline */}
          {groups.map((group) => (
            <div key={group.label} className="mb-5">
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-300 tabular-nums">{group.items.length}</span>
              </div>

              {/* Items */}
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
                {group.items.map((log) => (
                  <ActivityRow key={log.id} log={log} />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-2 mb-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  `Load more (showing ${loadedCount})`
                )}
              </button>
            </div>
          )}

          {!hasMore && loadedCount > PAGE_SIZE && (
            <p className="text-center text-xs text-gray-300 mt-2 mb-4">
              All {loadedCount} records loaded
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Compact row (table-style, no timeline connector)
// ------------------------------------------------------------------ //

function ActivityRow({ log }: { log: AuditLog }) {
  const category = auditActionCategory(log.action);
  const actor = log.user
    ? `${log.user.firstName} ${log.user.lastName}`
    : 'External';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 hover:bg-gray-50">
      {/* Dot */}
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', CATEGORY_DOT[category])} />

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{describeAuditLog(log)}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              'inline-block text-[9px] font-bold px-1.5 py-px rounded-full uppercase tracking-wide',
              CATEGORY_PILL[category],
            )}
          >
            {formatAuditAction(log.action)}
          </span>
          <span className="text-[10px] text-gray-400">{actor}</span>
        </div>
      </div>

      {/* Time */}
      <time
        className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0"
        title={new Date(log.createdAt).toLocaleString()}
      >
        {formatRelativeTime(log.createdAt)}
      </time>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Skeleton
// ------------------------------------------------------------------ //

function ActivitySkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 animate-pulse overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/3 bg-gray-200 rounded" />
            <div className="h-2.5 w-1/3 bg-gray-100 rounded" />
          </div>
          <div className="w-12 h-3 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

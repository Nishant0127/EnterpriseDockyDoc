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
// Category styles
// ------------------------------------------------------------------ //

const CATEGORY_STYLES = {
  create:   { dot: 'bg-green-500',  ring: 'ring-green-100'  },
  update:   { dot: 'bg-blue-500',   ring: 'ring-blue-100'   },
  delete:   { dot: 'bg-red-500',    ring: 'ring-red-100'    },
  share:    { dot: 'bg-purple-500', ring: 'ring-purple-100' },
  download: { dot: 'bg-amber-500',  ring: 'ring-amber-100'  },
  member:   { dot: 'bg-teal-500',   ring: 'ring-teal-100'   },
} as const;

const PILL_STYLES = {
  create:   'bg-green-50 text-green-700',
  update:   'bg-blue-50 text-blue-700',
  delete:   'bg-red-50 text-red-700',
  share:    'bg-purple-50 text-purple-700',
  download: 'bg-amber-50 text-amber-700',
  member:   'bg-teal-50 text-teal-700',
} as const;

// Only entity types we actually log — DOCUMENT_VERSION and WORKSPACE are unused
const ENTITY_FILTER_OPTIONS: { label: string; value: AuditEntityType | '' }[] = [
  { label: 'All types', value: '' },
  { label: 'Documents', value: 'DOCUMENT' },
  { label: 'Shares', value: 'SHARE' },
  { label: 'Reminders', value: 'REMINDER' },
  { label: 'Members', value: 'USER' },
];

const ACTION_FILTER_OPTIONS: { label: string; value: AuditAction | '' }[] = [
  { label: 'All actions', value: '' },
  { label: 'Created', value: 'DOCUMENT_CREATED' },
  { label: 'Updated', value: 'DOCUMENT_UPDATED' },
  { label: 'Deleted', value: 'DOCUMENT_DELETED' },
  { label: 'New version', value: 'DOCUMENT_VERSION_ADDED' },
  { label: 'Downloaded', value: 'DOCUMENT_DOWNLOADED' },
  { label: 'Shared internally', value: 'DOCUMENT_SHARED_INTERNAL' },
  { label: 'External link', value: 'DOCUMENT_SHARED_EXTERNAL' },
  { label: 'Share revoked', value: 'SHARE_REVOKED' },
  { label: 'Reminder updated', value: 'REMINDER_UPDATED' },
  { label: 'Member added', value: 'MEMBER_ADDED' },
  { label: 'Role updated', value: 'MEMBER_ROLE_UPDATED' },
];

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function ActivityPage() {
  const { activeWorkspace } = useUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [entityType, setEntityType] = useState<AuditEntityType | ''>('');
  const [action, setAction] = useState<AuditAction | ''>('');

  // Track whether this is the first load or a filter change
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!activeWorkspace) return;

    if (firstLoad.current) {
      setInitialLoading(true);
    } else {
      // On filter change: keep existing logs visible, just show a subtle spinner
      setFiltering(true);
    }

    fetchWorkspaceActivity({
      workspaceId: activeWorkspace.workspaceId,
      entityType: entityType || undefined,
      action: action || undefined,
      limit: 100,
    })
      .then((data) => {
        setLogs(data);
        firstLoad.current = false;
      })
      .catch(() => {
        // Keep existing logs on error rather than clearing
        firstLoad.current = false;
      })
      .finally(() => {
        setInitialLoading(false);
        setFiltering(false);
      });
  }, [activeWorkspace?.workspaceId, entityType, action]);

  const hasFilters = entityType !== '' || action !== '';

  function clearFilters() {
    setEntityType('');
    setAction('');
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Activity</h1>
        <p className="mt-1 text-sm text-gray-500">
          Workspace activity feed — all critical actions in one place.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as AuditEntityType | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {ENTITY_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {ACTION_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Clear filters
          </button>
        )}

        {filtering && (
          <svg className="animate-spin text-brand-500 ml-1" width="14" height="14" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Feed */}
      {initialLoading ? (
        <ActivitySkeleton />
      ) : logs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
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
              Actions like uploads, shares, and member changes will appear here.
            </p>
          )}
        </div>
      ) : (
        <div className={cn('relative transition-opacity', filtering && 'opacity-60')}>
          {/* Vertical timeline line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-100" />

          <div className="space-y-0">
            {logs.map((log, i) => (
              <ActivityItem key={log.id} log={log} isLast={i === logs.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Timeline item
// ------------------------------------------------------------------ //

function ActivityItem({ log, isLast }: { log: AuditLog; isLast: boolean }) {
  const category = auditActionCategory(log.action);
  const dotStyle = CATEGORY_STYLES[category];
  const actor = log.user
    ? `${log.user.firstName} ${log.user.lastName}`
    : 'External user';

  return (
    <div className={cn('relative flex gap-4 pb-5', isLast && 'pb-0')}>
      {/* Dot */}
      <div className="relative z-10 flex-shrink-0 mt-0.5">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center ring-4 bg-white', dotStyle.ring)}>
          <span className={cn('w-2.5 h-2.5 rounded-full', dotStyle.dot)} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-900 leading-snug">{describeAuditLog(log)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{actor}</p>
          </div>
          <time
            className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5"
            title={new Date(log.createdAt).toLocaleString()}
          >
            {formatRelativeTime(log.createdAt)}
          </time>
        </div>

        <span className={cn('inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full', PILL_STYLES[category])}>
          {formatAuditAction(log.action)}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Skeleton — only shown on initial page load
// ------------------------------------------------------------------ //

function ActivitySkeleton() {
  return (
    <div className="relative space-y-5 animate-pulse">
      <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-100" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 z-10" />
          <div className="flex-1 space-y-2 pt-1.5">
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
            <div className="h-3 w-1/3 bg-gray-100 rounded" />
          </div>
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
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

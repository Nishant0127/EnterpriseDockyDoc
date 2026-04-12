'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { fetchExpiringDocuments, fetchWorkspaceReminders } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { ExpiringDocument, UpcomingReminder } from '@/types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ------------------------------------------------------------------ //
// Time filter options for "Expiring Soon" tab
// ------------------------------------------------------------------ //

const TIME_FILTERS = [
  { label: '7 days',   days: 7 },
  { label: '14 days',  days: 14 },
  { label: '31 days',  days: 31 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year',   days: 365 },
] as const;

type TabId = 'reminders' | 'expiring' | 'expired';

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysLabel(days: number): { text: string; class: string } {
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, class: 'text-red-600' };
  if (days === 0) return { text: 'Expires today', class: 'text-red-600' };
  if (days <= 7) return { text: `${days}d left`, class: 'text-orange-600' };
  if (days <= 30) return { text: `${days}d left`, class: 'text-yellow-700' };
  return { text: `${days}d left`, class: 'text-gray-500' };
}

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function RemindersPage() {
  const { activeWorkspace, isLoading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Allow deep-linking via ?tab=expiring|expired|reminders
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && ['reminders', 'expiring', 'expired'].includes(tabParam) ? tabParam : 'reminders',
  );
  const [expiringDays, setExpiringDays] = useState(31);

  useEffect(() => {
    if (!activeWorkspace) return;
    setLoading(true);
    Promise.all([
      fetchExpiringDocuments(activeWorkspace.workspaceId),
      fetchWorkspaceReminders(activeWorkspace.workspaceId),
    ])
      .then(([exp, rem]) => {
        setExpiring(exp);
        setReminders(rem);
      })
      .catch(() => setError('Failed to load reminders. Is the API running?'))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.workspaceId]);

  if (userLoading || loading) return <PageSkeleton />;

  if (!activeWorkspace) {
    return <div className="text-sm text-gray-500 p-4">No active workspace selected.</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const expired = expiring.filter((d) => d.daysUntilExpiry < 0);
  const expiringSoon = expiring.filter(
    (d) => d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= expiringDays,
  );

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: 'reminders', label: 'Upcoming Reminders', count: reminders.length },
    { id: 'expiring',  label: 'Expiring Soon',      count: expiringSoon.length },
    { id: 'expired',   label: 'Expired',            count: expired.length },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="page-title">Reminders</h1>
        <p className="page-subtitle">
          {activeWorkspace.workspaceName} &middot; expiring documents and upcoming reminders
        </p>
      </div>

      {/* ---- Tab bar + optional time filter ---- */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-xs font-semibold px-1.5 py-0.5 rounded-full',
                  activeTab === tab.id ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-400',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Time filter — only shown for "Expiring Soon" tab */}
        {activeTab === 'expiring' && (
          <select
            value={expiringDays}
            onChange={(e) => setExpiringDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {TIME_FILTERS.map((f) => (
              <option key={f.days} value={f.days}>
                Next {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ---- Tab content ---- */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {activeTab === 'reminders' && (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900">Upcoming Reminders</h2>
              <span className="ml-auto text-xs font-medium text-gray-400">{reminders.length}</span>
            </div>
            {reminders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm text-gray-400">No pending reminders.</p>
                <p className="text-xs text-gray-300 mt-1">Set reminders on documents with expiry dates.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reminders.map((r) => <ReminderRow key={r.id} reminder={r} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'expiring' && (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900">Expiring Soon</h2>
              <span className="text-xs text-gray-400">
                (within {TIME_FILTERS.find((f) => f.days === expiringDays)?.label ?? `${expiringDays} days`})
              </span>
              <span className="ml-auto text-xs font-medium text-gray-400">{expiringSoon.length}</span>
            </div>
            {expiringSoon.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-sm text-gray-400">
                  No documents expiring in the next {TIME_FILTERS.find((f) => f.days === expiringDays)?.label ?? `${expiringDays} days`}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {expiringSoon.map((doc) => <ExpiringDocRow key={doc.id} doc={doc} />)}
              </div>
            )}
          </>
        )}

        {activeTab === 'expired' && (
          <>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-gray-900">Expired</h2>
              <span className="ml-auto text-xs font-medium text-gray-400">{expired.length}</span>
            </div>
            {expired.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm text-gray-400">No expired documents.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {expired.map((doc) => <ExpiringDocRow key={doc.id} doc={doc} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Expiring document row
// ------------------------------------------------------------------ //

function ExpiringDocRow({ doc }: { doc: ExpiringDocument }) {
  const days = daysLabel(doc.daysUntilExpiry);

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <Link
          href={`/documents/${doc.id}`}
          className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors truncate block"
        >
          {doc.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.folderName && (
            <span className="text-xs text-gray-400">{doc.folderName}</span>
          )}
          <span className="text-xs text-gray-400">{doc.ownerEmail}</span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-500">
          {formatDate(doc.expiryDate)}
        </p>
        <p className={cn('text-xs font-semibold', days.class)}>
          {days.text}
        </p>
      </div>

      {doc.renewalDueDate && (
        <div className="flex-shrink-0 text-right hidden sm:block">
          <p className="text-[10px] text-gray-400">Renewal due</p>
          <p className="text-xs text-gray-500">{formatDate(doc.renewalDueDate)}</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// Upcoming reminder row
// ------------------------------------------------------------------ //

function ReminderRow({ reminder }: { reminder: UpcomingReminder }) {
  const remindAt = new Date(reminder.remindAt);
  const isPast = remindAt < new Date();

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <Link
          href={`/documents/${reminder.documentId}`}
          className="text-sm font-medium text-gray-900 hover:text-brand-600 transition-colors truncate block"
        >
          {reminder.documentName}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded',
              reminder.channel === 'EMAIL'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-500',
            )}
          >
            {reminder.channel}
          </span>
          {reminder.expiryDate && (
            <span className="text-xs text-gray-400">
              Expires {formatDate(reminder.expiryDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-500">{formatDateTime(reminder.remindAt)}</p>
        {isPast && (
          <p className="text-[10px] text-orange-500 font-medium">Overdue reminder</p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Loading skeleton
// ------------------------------------------------------------------ //

function PageSkeleton() {
  return (
    <div className="max-w-4xl animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-56 bg-gray-100 rounded mb-6" />
      <div className="h-10 w-80 bg-gray-100 rounded-lg mb-4" />
      <div className="bg-white rounded-xl border border-gray-200 h-80" />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { fetchExpiringDocuments, fetchWorkspaceReminders } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { ExpiringDocument, UpcomingReminder } from '@/types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

export default function RemindersPage() {
  const { activeWorkspace, isLoading: userLoading } = useUser();
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const now = new Date();
  const expired = expiring.filter((d) => d.daysUntilExpiry < 0);
  const expiringSoon = expiring.filter((d) => d.daysUntilExpiry >= 0);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Reminders</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {activeWorkspace.workspaceName} &middot; expiring documents and upcoming reminders
        </p>
      </div>

      <div className="space-y-6">
        {/* ---- Expired -------------------------------------------- */}
        <Section
          title="Expired"
          count={expired.length}
          emptyText="No expired documents."
          accent="red"
        >
          {expired.map((doc) => (
            <ExpiringDocRow key={doc.id} doc={doc} />
          ))}
        </Section>

        {/* ---- Expiring Soon -------------------------------------- */}
        <Section
          title="Expiring soon"
          subtitle="within 90 days"
          count={expiringSoon.length}
          emptyText="No documents expiring in the next 90 days."
          accent="orange"
        >
          {expiringSoon.map((doc) => (
            <ExpiringDocRow key={doc.id} doc={doc} />
          ))}
        </Section>

        {/* ---- Upcoming Reminders --------------------------------- */}
        <Section
          title="Upcoming reminders"
          count={reminders.length}
          emptyText="No pending reminders."
          accent="blue"
        >
          {reminders.map((r) => (
            <ReminderRow key={r.id} reminder={r} />
          ))}
        </Section>
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
// Section wrapper
// ------------------------------------------------------------------ //

const ACCENT_COLORS = {
  red: 'bg-red-500',
  orange: 'bg-orange-400',
  blue: 'bg-brand-500',
};

function Section({
  title,
  subtitle,
  count,
  emptyText,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  emptyText: string;
  accent: keyof typeof ACCENT_COLORS;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', ACCENT_COLORS[accent])} />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <span className="text-xs text-gray-400">({subtitle})</span>}
        <span className="ml-auto text-xs font-medium text-gray-400">{count}</span>
      </div>
      {count === 0 ? (
        <div className="px-5 py-4 text-sm text-gray-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-gray-100">{children}</div>
      )}
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
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 h-40" />
        ))}
      </div>
    </div>
  );
}

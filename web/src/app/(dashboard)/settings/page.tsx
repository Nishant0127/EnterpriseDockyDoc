'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { fetchWorkspaceDetail } from '@/lib/documents';
import type { WorkspaceDetail } from '@/types';

export default function SettingsPage() {
  const { user, activeWorkspace, isLoading } = useUser();
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    setDetailLoading(true);
    fetchWorkspaceDetail(activeWorkspace.workspaceId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [activeWorkspace?.workspaceId]);

  if (isLoading || detailLoading) return <PageSkeleton />;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {activeWorkspace?.workspaceName ?? 'No workspace selected'}
        </p>
      </div>

      <div className="space-y-4">
        {/* Workspace info */}
        <SettingsCard title="Workspace">
          <SettingsRow label="Name" value={activeWorkspace?.workspaceName ?? '—'} />
          <SettingsRow label="Slug" value={activeWorkspace?.workspaceSlug ?? '—'} />
          <SettingsRow
            label="Type"
            value={
              activeWorkspace
                ? activeWorkspace.workspaceType.charAt(0) +
                  activeWorkspace.workspaceType.slice(1).toLowerCase()
                : '—'
            }
          />
          <SettingsRow label="Your role" value={activeWorkspace?.role ?? '—'} />
          <SettingsRow
            label="Members"
            value={detail ? String(detail.memberCount) : '—'}
          />
          <SettingsRow
            label="Documents"
            value={detail ? String(detail.documentCount) : '—'}
            last
          />
        </SettingsCard>

        {/* Account info */}
        <SettingsCard title="Account">
          <SettingsRow
            label="Name"
            value={user ? `${user.firstName} ${user.lastName}` : '—'}
          />
          <SettingsRow label="Email" value={user?.email ?? '—'} last />
        </SettingsCard>

        {/* Placeholder sections */}
        <SettingsCard title="Notifications">
          <p className="text-sm text-gray-400 py-1">
            Notification preferences — coming soon.
          </p>
        </SettingsCard>

        <SettingsCard title="Security">
          <p className="text-sm text-gray-400 py-1">
            Password and authentication settings — coming soon.
          </p>
        </SettingsCard>

        <SettingsCard title="Retention &amp; Storage">
          <p className="text-sm text-gray-400 py-1">
            Document retention policies and storage settings — coming soon.
          </p>
        </SettingsCard>

        <SettingsCard title="Integrations">
          <p className="text-sm text-gray-400 py-1">
            Connect with third-party tools — coming soon.
          </p>
        </SettingsCard>

        <SettingsCard title="Danger zone">
          <p className="text-sm text-gray-400 py-1">
            Workspace deletion and data export — coming soon.
          </p>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b border-gray-50'}`}
    >
      <span className="text-xs text-gray-500 font-medium w-28 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse">
      <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-44 bg-gray-100 rounded mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-32" />
        ))}
      </div>
    </div>
  );
}

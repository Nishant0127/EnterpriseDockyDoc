'use client';

import { useUser } from '@/context/UserContext';

// ------------------------------------------------------------------ //
// Report card definitions
// ------------------------------------------------------------------ //

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  comingSoon?: boolean;
}

const REPORTS: ReportCard[] = [
  {
    id: 'expiring-docs',
    title: 'Expiring Documents',
    description: 'Documents approaching their expiry date, grouped by urgency.',
    icon: '📅',
    category: 'Compliance',
    comingSoon: true,
  },
  {
    id: 'storage-usage',
    title: 'Storage Usage',
    description: 'Breakdown of storage consumption by folder, owner, and file type.',
    icon: '💾',
    category: 'Operations',
    comingSoon: true,
  },
  {
    id: 'document-activity',
    title: 'Document Activity',
    description: 'Upload, edit, download, and delete events over a selected period.',
    icon: '📊',
    category: 'Activity',
    comingSoon: true,
  },
  {
    id: 'member-activity',
    title: 'Member Activity',
    description: 'Per-member contribution and access patterns across the workspace.',
    icon: '👥',
    category: 'Activity',
    comingSoon: true,
  },
  {
    id: 'tag-coverage',
    title: 'Tag Coverage',
    description: 'Documents missing tags and tag usage across the workspace.',
    icon: '🏷️',
    category: 'Governance',
    comingSoon: true,
  },
  {
    id: 'compliance-audit',
    title: 'Compliance Audit Trail',
    description: 'Full audit log export with filtering by action type and date range.',
    icon: '🛡️',
    category: 'Compliance',
    comingSoon: true,
  },
];

// ------------------------------------------------------------------ //
// Page
// ------------------------------------------------------------------ //

export default function ReportsPage() {
  const { activeWorkspace, isLoading } = useUser();

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {activeWorkspace?.workspaceName ?? 'No workspace'} &middot; insights and analytics
        </p>
      </div>

      {/* ---- AI Report Generator ----------------------------------- */}
      <div className="mb-6 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M12 2a2 2 0 0 1 2 2v1a7 7 0 0 1 0 14v1a2 2 0 0 1-4 0v-1a7 7 0 0 1 0-14V4a2 2 0 0 1 2-2z" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-sm font-semibold text-gray-900">AI Report Generator</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                Coming soon
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Describe the report you need in plain language and let AI generate it from your workspace data.
              Ask things like <span className="italic">&quot;Show me all contracts expiring in Q2&quot;</span> or{' '}
              <span className="italic">&quot;Which documents haven&apos;t been updated in 6 months?&quot;</span>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 max-w-sm rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                Ask a question about your documents…
              </div>
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium opacity-40 cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Report cards ------------------------------------------ */}
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Available Reports</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Report card
// ------------------------------------------------------------------ //

function ReportCard({ report }: { report: ReportCard }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none">{report.icon}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          {report.category}
        </span>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{report.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
      </div>

      <div>
        {report.comingSoon ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            Coming soon
          </span>
        ) : (
          <button
            type="button"
            className="text-xs text-brand-600 font-medium hover:underline"
          >
            Run report →
          </button>
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
    <div className="max-w-5xl animate-pulse">
      <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-52 bg-gray-100 rounded mb-6" />
      <div className="h-32 bg-gray-100 rounded-xl mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-xl h-36" />
        ))}
      </div>
    </div>
  );
}

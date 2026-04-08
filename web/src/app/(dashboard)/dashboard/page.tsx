import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

/**
 * Main dashboard page.
 * Route: /dashboard
 * Currently a placeholder — will display document stats, recent activity, etc.
 */
export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Stat cards — placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLACEHOLDER_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Activity feed will appear here.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components (local — move to /components when they grow)         */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string;
  description: string;
}

function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

const PLACEHOLDER_STATS: StatCardProps[] = [
  { label: 'Documents', value: '—', description: 'Total documents' },
  { label: 'Workspaces', value: '—', description: 'Active workspaces' },
  { label: 'Members', value: '—', description: 'Team members' },
  { label: 'Storage', value: '—', description: 'Used storage' },
];

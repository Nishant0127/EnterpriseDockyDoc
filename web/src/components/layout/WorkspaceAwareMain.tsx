'use client';

import { useUser } from '@/context/UserContext';

/**
 * Re-mounts its children whenever the active workspace changes.
 * This resets all page-level state (loading, data) so stale data
 * from the previous workspace never flashes on screen.
 */
export default function WorkspaceAwareMain({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeWorkspace } = useUser();
  return (
    <main
      key={activeWorkspace?.workspaceId ?? 'no-workspace'}
      className="flex-1 overflow-y-auto p-6"
    >
      {children}
    </main>
  );
}

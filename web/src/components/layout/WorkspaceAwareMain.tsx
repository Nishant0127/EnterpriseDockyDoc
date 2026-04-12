'use client';

import { useUser } from '@/context/UserContext';

/**
 * Re-mounts its children whenever the active workspace changes so that
 * all page-level state (data fetches, loading flags) resets cleanly.
 */
export default function WorkspaceAwareMain({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useUser();
  return (
    <main
      key={activeWorkspace?.workspaceId ?? 'no-workspace'}
      className="flex-1 overflow-y-auto bg-canvas"
    >
      <div className="p-5 lg:p-6 max-w-[1400px]">
        {children}
      </div>
    </main>
  );
}

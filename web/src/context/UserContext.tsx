'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { fetchCurrentUser, switchWorkspaceApi } from '@/lib/api';
import type { CurrentUser, WorkspaceMembership } from '@/types';

// ------------------------------------------------------------------ //
// Context shape
// ------------------------------------------------------------------ //

interface UserContextValue {
  /** Null while loading or on error. */
  user: CurrentUser | null;
  /** The workspace the user is currently operating in. */
  activeWorkspace: WorkspaceMembership | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Switch the active workspace.
   * Validates membership server-side, then updates local state + localStorage.
   */
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

// ------------------------------------------------------------------ //
// Provider
// ------------------------------------------------------------------ //

const STORAGE_KEY = 'dockydoc:activeWorkspaceId';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user on mount
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const data = await fetchCurrentUser();
        if (cancelled) return;

        setUser(data);

        // Restore previously selected workspace from localStorage
        const savedId =
          typeof window !== 'undefined'
            ? localStorage.getItem(STORAGE_KEY)
            : null;

        const restored = savedId
          ? data.workspaces.find((w) => w.workspaceId === savedId)
          : null;

        setActiveWorkspace(restored ?? data.defaultWorkspace);
      } catch (err) {
        if (!cancelled) {
          console.error('[UserContext] Failed to load user:', err);
          setError('Could not load user data. Is the API running?');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;

      // Optimistic update — revert if server rejects
      const previous = activeWorkspace;
      const optimistic =
        user.workspaces.find((w) => w.workspaceId === workspaceId) ?? null;
      setActiveWorkspace(optimistic);

      try {
        // Server validates membership
        await switchWorkspaceApi(workspaceId);
        // Persist selection
        localStorage.setItem(STORAGE_KEY, workspaceId);
      } catch (err) {
        // Revert on failure
        setActiveWorkspace(previous);
        throw err;
      }
    },
    [user, activeWorkspace],
  );

  return (
    <UserContext.Provider
      value={{ user, activeWorkspace, isLoading, error, switchWorkspace }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ------------------------------------------------------------------ //
// Hook
// ------------------------------------------------------------------ //

/**
 * useUser() — access current user and active workspace from any client component.
 * Must be rendered inside <UserProvider>.
 */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser() must be called inside <UserProvider>');
  }
  return ctx;
}

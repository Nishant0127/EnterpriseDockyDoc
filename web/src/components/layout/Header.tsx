'use client';

import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';
import type { WorkspaceType } from '@/types';

const TYPE_BADGE: Record<WorkspaceType, string> = {
  ENTERPRISE: 'bg-purple-100 text-purple-700',
  PERSONAL: 'bg-blue-100 text-blue-700',
  FAMILY: 'bg-green-100 text-green-700',
};

/**
 * Top header bar.
 * Left: active workspace name + type badge.
 * Right: notification bell + user avatar with initials.
 */
export default function Header() {
  const { user, activeWorkspace, isLoading, logout } = useUser();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '…';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: active workspace context */}
      <div className="flex items-center gap-2 min-w-0">
        {isLoading ? (
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        ) : activeWorkspace ? (
          <>
            <span className="text-sm font-semibold text-gray-800 truncate">
              {activeWorkspace.workspaceName}
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0',
                TYPE_BADGE[activeWorkspace.workspaceType],
              )}
            >
              {activeWorkspace.workspaceType}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
              · {activeWorkspace.role}
            </span>
          </>
        ) : null}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification bell */}
        <button
          type="button"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Notifications"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* User avatar */}
        <button
          type="button"
          title={user ? `${user.firstName} ${user.lastName} — ${user.email}` : ''}
          className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold hover:bg-brand-200 transition-colors flex-shrink-0"
          aria-label="User menu"
        >
          {isLoading ? '…' : initials}
        </button>

        {/* Logout button */}
        <button
          type="button"
          onClick={logout}
          title="Sign out"
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-gray-400',
            'hover:bg-gray-100 hover:text-gray-600 transition-colors',
          )}
          aria-label="Sign out"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}

'use client';

/**
 * Top header bar — shown inside the dashboard shell.
 * Will host search, notifications, and user menu once implemented.
 */
export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: breadcrumb / page title will be injected via context later */}
      <div />

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
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

        {/* User avatar placeholder */}
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold hover:bg-brand-200 transition-colors"
          aria-label="User menu"
        >
          U
        </button>
      </div>
    </header>
  );
}

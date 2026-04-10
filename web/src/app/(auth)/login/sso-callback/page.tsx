'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

/**
 * SSO callback page.
 *
 * Clerk redirects here after the OAuth provider (Google, Microsoft, etc.)
 * completes authentication. <AuthenticateWithRedirectCallback /> exchanges
 * the OAuth code for a Clerk session and then redirects the user to
 * NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL (/dashboard).
 */
export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
          <span className="text-white font-bold text-xl">D</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">Completing sign in…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}

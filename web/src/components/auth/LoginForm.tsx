'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * LoginForm — client component.
 *
 * Currently uses local state only (no API call).
 * To wire up:
 *   - Replace handleSubmit body with `signIn()` from next-auth, or a fetch to POST /api/auth/login
 *   - Add redirect on success
 *   - Handle error messages from the API
 */
export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Replace with real auth call
      // Example:
      //   const result = await signIn('credentials', { email, password, redirect: false });
      //   if (result?.error) setError('Invalid email or password');
      //   else router.push('/dashboard');
      await new Promise((r) => setTimeout(r, 800)); // Simulate network
      console.log('Login attempt:', { email });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Work email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={cn(
            'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          disabled={isLoading}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={cn(
            'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className={cn(
          'w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white',
          'hover:bg-brand-700 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>

      {/* SSO placeholder — ready for Keycloak integration */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white px-2">or</span>
        </div>
      </div>

      <button
        type="button"
        disabled
        title="SSO coming soon"
        className={cn(
          'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-500',
          'cursor-not-allowed opacity-60'
        )}
      >
        Continue with SSO (coming soon)
      </button>
    </form>
  );
}

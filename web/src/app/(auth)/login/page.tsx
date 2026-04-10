import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your DockyDoc workspace',
};

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Login page.
 *
 * When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set:
 *   Renders Clerk's hosted <SignIn> component — supports Google, Microsoft, and
 *   any other providers configured in your Clerk dashboard.
 *
 * When the key is absent (local dev / open-source):
 *   Renders the original email+password LoginForm.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DockyDoc</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to your workspace
          </p>
        </div>

        {clerkEnabled ? (
          /* Clerk SSO — Google, Microsoft, email+password — all configured in Clerk dashboard */
          <div className="flex justify-center">
            <SignIn
              forceRedirectUrl="/dashboard"
              fallbackRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'rounded-2xl shadow-sm border border-gray-200 w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                },
              }}
            />
          </div>
        ) : (
          /* Dev / open-source fallback — email+password form */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <LoginForm />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} DockyDoc. All rights reserved.
        </p>
      </div>
    </div>
  );
}

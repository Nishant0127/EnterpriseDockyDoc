import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DockyDoc',
    template: '%s | DockyDoc',
  },
  description: 'Secure, AI-powered document management for enterprises',
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Root layout — applies to every route.
 *
 * When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set, the entire app is wrapped in
 * <ClerkProvider> which powers SSO login, session tokens, and useAuth().
 *
 * When the key is absent (local dev without Clerk), the provider is omitted and
 * the app falls back to the x-dev-user-email header flow — zero friction for
 * developers running the open-source stack.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (clerkPublishableKey) {
    return (
      <ClerkProvider>
        <html lang="en">
          <body>{children}</body>
        </html>
      </ClerkProvider>
    );
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

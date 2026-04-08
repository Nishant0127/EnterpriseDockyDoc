import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DockyDoc',
    template: '%s | DockyDoc',
  },
  description: 'Secure, AI-powered document management for enterprises',
};

/**
 * Root layout — applies to every route.
 * Keep this minimal; per-section layouts live in their route groups.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

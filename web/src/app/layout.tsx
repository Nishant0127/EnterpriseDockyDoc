import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'DockyDoc',
    template: '%s | DockyDoc',
  },
  description: 'Secure, AI-powered document management for enterprises',
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/** Inline script — runs before first paint to prevent flash of wrong theme. */
const themeScript = `
try {
  var t = localStorage.getItem('dd-theme');
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch(e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const html = (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      {/* suppressHydrationWarning needed because theme script mutates className before hydration */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );

  if (clerkPublishableKey) {
    return <ClerkProvider>{html}</ClerkProvider>;
  }

  return html;
}

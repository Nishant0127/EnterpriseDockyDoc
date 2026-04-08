import { redirect } from 'next/navigation';

/**
 * Root page — redirect to login.
 * Once auth is implemented, this can check session and redirect to /dashboard instead.
 */
export default function RootPage() {
  redirect('/login');
}

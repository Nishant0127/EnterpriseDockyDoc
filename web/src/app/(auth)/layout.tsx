/**
 * Auth route group layout.
 * Applied to: /login, /register, /forgot-password, etc.
 * No sidebar — clean centered layout handled per page.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

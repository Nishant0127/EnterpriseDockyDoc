import { UserProvider } from '@/context/UserContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import WorkspaceAwareMain from '@/components/layout/WorkspaceAwareMain';

/**
 * Dashboard shell layout.
 *
 * Server component — wraps the shell with <UserProvider> (a client component).
 * Sidebar and Header read user/workspace data from UserContext.
 *
 * Auth replacement path:
 *   1. Add server-side session check here (getServerSession / cookie verify).
 *   2. If no session, redirect('/login').
 *   3. Remove the DevAuthGuard-based flow from UserContext.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Fixed left sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <WorkspaceAwareMain>{children}</WorkspaceAwareMain>
        </div>
      </div>
    </UserProvider>
  );
}

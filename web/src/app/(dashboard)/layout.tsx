import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

/**
 * Dashboard shell layout.
 * Applied to all routes inside (dashboard) group.
 * Replace the auth guard comment with real session check once auth is wired up.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Add server-side session check here.
  // Example with NextAuth:
  //   const session = await getServerSession(authOptions);
  //   if (!session) redirect('/login');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — fixed left column */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

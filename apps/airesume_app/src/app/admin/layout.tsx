import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'Admin · AIResume',
  robots: { index: false, follow: false },
};

/**
 * Admin shell. Server-side guard: only sessions with an admin/superadmin role
 * (or an AdminAuth-backed session) reach the admin pages. Client pages still
 * hit admin APIs which re-check via requireAdmin — this guard is just the
 * first gate so non-admins never see the shell.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authConfig);
  const user = session?.user as any;

  const isAdmin = !!user && (user.type === 'admin' || user.role === 'admin' || user.role === 'superadmin');
  if (!isAdmin) {
    redirect('/sign-in?callbackUrl=/admin');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <AdminSidebar
        user={{ name: user.name || user.email || 'Admin', email: user.email || '' }}
      />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}

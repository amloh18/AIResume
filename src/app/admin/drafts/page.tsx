'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DraftManagement from '@/components/admin/DraftManagement';

export default function AdminDraftsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Extract admin user from session
  const user = session?.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    // Redirect if not authenticated or not an admin
    if (status === 'unauthenticated') {
      router.push('/admin/signin');
      return;
    }

    if (status === 'authenticated' && !isAdmin) {
      console.error('User is not an admin');
      router.push('/sign-in');
      return;
    }
  }, [status, isAdmin, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin drafts...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!user || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <DraftManagement />
      </div>
    </div>
  );
}


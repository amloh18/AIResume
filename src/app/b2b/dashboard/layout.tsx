import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import B2BSidebar from '@/components/b2b/B2BSidebar';
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext';

export const metadata = {
  title: 'B2B Dashboard - CVCircle',
  description: 'Manage your B2B account, API keys, and sandbox.',
};

export default async function B2BDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authResult = await getAuthenticatedUser();

  if (!authResult) {
    redirect('/b2b/login');
  }

  // Check if user has B2B access
  const user = authResult.user;
  if (!user.b2b || !user.b2b.tenantId) {
    // If not a B2B user, redirect to main dashboard
    redirect('/dashboard');
  }

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen bg-[#f3f2ee] dark:bg-[#1a230f]">
        <B2BSidebar userRole={user.b2b.role} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-black/50 p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}

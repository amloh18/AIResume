import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import B2BSidebar from '@/components/b2b/B2BSidebar';
import { MobileSidebarProvider } from '@/contexts/MobileSidebarContext';
import B2BMobileHeader from '@/components/b2b/B2BMobileHeader';

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
  const isGlobalAdmin = user.role === 'admin' || user.role === 'superadmin';
  
  if (!isGlobalAdmin && (!user.b2b || !user.b2b.tenantId)) {
    // If not a B2B user and not an admin, redirect to main dashboard
    redirect('/dashboard');
  }

  // Check if B2B admin needs to complete onboarding
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const needsOnboarding = user.b2b && !user.b2b.setupComplete;
  
  if (isAdmin && needsOnboarding && user.b2b?.tenantId) {
    redirect('/b2b/onboarding');
  }

  const b2bRole = user.b2b?.role || (isGlobalAdmin ? 'admin' : 'member');

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen bg-[#f3f2ee] dark:bg-[#1a230f]">
        <B2BSidebar userRole={b2bRole} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <B2BMobileHeader userRole={b2bRole} />
          <main className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-black/50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}

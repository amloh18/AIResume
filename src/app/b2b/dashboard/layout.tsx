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
  const hasB2bData = !!user.b2b;
  const isSetupComplete = !!user.b2b?.setupComplete;
  
  console.log('🔍 Dashboard Layout Debug:', {
    email: user.email,
    isAdmin,
    hasB2bData,
    isSetupComplete,
    b2bObject: user.b2b ? { ...user.b2b, tenantId: String(user.b2b.tenantId) } : 'none'
  });

  // Only redirect to onboarding if user is an admin with a B2B record that isn't complete
  if (isAdmin && hasB2bData && !isSetupComplete && user.b2b?.tenantId) {
    console.log('🔄 Dashboard Layout: Redirecting to onboarding (Setup incomplete)');
    redirect('/b2b/onboarding');
  }

  const b2bRole = user.b2b?.role || (isGlobalAdmin ? 'admin' : 'member');

  // Sanitize user data for Client Components (Sidebar/Header)
  // This prevents MongoDB ObjectId buffer errors
  const sanitizedUser = {
    id: String(user._id),
    name: user.name || user.firstName || 'User',
    email: user.email,
    role: user.role,
    b2b: user.b2b ? {
      tenantId: String(user.b2b.tenantId),
      role: user.b2b.role,
      setupComplete: !!user.b2b.setupComplete
    } : undefined
  };

  return (
    <MobileSidebarProvider>
      <div className="flex h-screen bg-[#0d1209] text-white">
        <B2BSidebar userRole={sanitizedUser.b2b?.role || 'member'} />
        
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#80FF00]/5 rounded-full blur-[120px] pointer-events-none" />
          
          <B2BMobileHeader userRole={sanitizedUser.b2b?.role || 'member'} />
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 relative z-10">
            <div className="max-w-[1400px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}

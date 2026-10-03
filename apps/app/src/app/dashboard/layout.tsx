import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authConfig from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { userRepository } from '@/lib/repositories/user-repository';
import ClientLayout from './ClientLayout';
import { geistFont } from '@/lib/fonts';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=/dashboard/jobs');
  }

  // Centralized Server-Side Onboarding Redirection
  await getConnection();
  const user = await userRepository.findById(session.user.id);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  if (!isAdmin && user?.onboarding) {
    const activationStatus = user.onboarding.activation_status;
    const activationRoute = user.onboarding.activation_route;
    
    // Never redirect to /editor from dashboard layout (prevents trapping users from Home/Dashboard)
    // Only redirect truly pending, un-onboarded NEW users to legitimate onboarding routes
    if (
      activationStatus === 'pending' &&
      activationRoute &&
      !activationRoute.startsWith('/editor') &&
      user.userLifecycleState === 'NEW'
    ) {
      redirect(activationRoute);
    }
  }

  return (
    <div className={`${geistFont.variable} geist-ui`}>
      <ClientLayout>{children}</ClientLayout>
    </div>
  );
}

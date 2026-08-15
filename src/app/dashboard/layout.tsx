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
    redirect('/sign-in?callbackUrl=/dashboard');
  }

  // Centralized Server-Side Onboarding Redirection
  await getConnection();
  const user = await userRepository.findById(session.user.id);
  
  if (user?.onboarding) {
    const activationStatus = user.onboarding.activation_status;
    const activationRoute = user.onboarding.activation_route;
    
    // If onboarding is incomplete, redirect immediately to prevent Flash of Un-onboarded Content
    if (activationStatus === 'pending' && activationRoute) {
      redirect(activationRoute);
    }
  }

  return (
    <div className={`${geistFont.variable} geist-ui`}>
      <ClientLayout>{children}</ClientLayout>
    </div>
  );
}

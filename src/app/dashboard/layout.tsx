import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authConfig from '@/lib/auth-config';
import { getConnection } from '@/lib/database/connection-manager';
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

  await getConnection();
  
  const onboardingStatus = (session.user as any).onboarding?.activation_status;
  const onboardingRoute = (session.user as any).onboarding?.activation_route;
  
  if (onboardingStatus === 'pending' && onboardingRoute) {
    redirect(onboardingRoute);
  }

  return (
    <div className={`${geistFont.variable} geist-ui`}>
      <ClientLayout session={session}>{children}</ClientLayout>
    </div>
  );
}

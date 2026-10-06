import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authConfig from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { userRepository } from '@/lib/repositories/user-repository';
import ClientLayout from './ClientLayout';
import { geistFont } from '@/lib/fonts';
import type { Metadata } from 'next';

/**
 * The entire authenticated app is noindex.
 *
 * These routes already redirect anonymous visitors to /sign-in, but a redirect is not a ranking
 * signal. `robots.txt` is not sufficient either: a Disallow only prevents *crawling* — it does not
 * prevent a URL discovered from a link elsewhere being indexed, and it cannot express per-route
 * intent. A `noindex` tag is the reliable signal, and declaring it once here covers every child
 * route (Next replaces `robots` only where a descendant declares its own).
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

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

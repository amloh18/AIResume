import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authConfig from '@/lib/auth';
import { getConnection } from '@/lib/database/connection-manager';
import { userRepository } from '@/lib/repositories/user-repository';
import CV from '@/models/CV';
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
      /* …and only when the account genuinely has nothing to work with.
       *
       * `activation_status`/`userLifecycleState` are written by the onboarding
       * wizard, so a user who created their profile through any other entry
       * point (AI career report, upload, template flow, an older session) can
       * still carry a stale 'pending' + 'NEW' pair while owning a perfectly
       * good CV. Redirecting on those two flags alone ambushed those users into
       * onboarding every time they opened the dashboard.
       *
       * The CV record is the source of truth: if a CV exists for this user there
       * is a profile to show, so the dashboard is where they belong. The query
       * is a single indexed lookup and only runs for the narrow pending+NEW set.
       * It is wrapped because a database hiccup must not lock the user out of
       * their dashboard — in doubt, show the app, not the wizard. */
      let hasCv = true;
      try {
        hasCv = Boolean(await CV.exists({ userId: user._id }));
      } catch (error) {
        // In doubt, show the app. A failed lookup is not a missing profile, and
        // this must never be the reason someone is pushed into a wizard again.
        console.error('Dashboard onboarding guard: CV lookup failed, allowing access', error);
        hasCv = true;
      }
      if (!hasCv) {
        redirect(activationRoute);
      }
    }
  }

  return (
    <div className={`${geistFont.variable} geist-ui`}>
      <ClientLayout>{children}</ClientLayout>
    </div>
  );
}

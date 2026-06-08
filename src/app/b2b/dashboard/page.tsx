import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import B2BDashboardClient from '@/components/b2b/B2BDashboardClient';

export default async function B2BDashboardPage() {
  const authResult = await getAuthenticatedUser();
  if (!authResult) redirect('/b2b/login');

  const user = authResult.user;
  const isGlobalAdmin = user.role === 'admin' || user.role === 'superadmin';

  if (!isGlobalAdmin && (!user.b2b || !user.b2b.tenantId)) {
    redirect('/dashboard');
  }

  return <B2BDashboardClient userName={user.name || user.email?.split('@')[0] || 'User'} />;
}

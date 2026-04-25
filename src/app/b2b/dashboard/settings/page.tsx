import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ATSIntegrationsManager from '@/components/b2b/ATSIntegrationsManager';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default async function SettingsPage() {
  const authResult = await getAuthenticatedUser();
  if (!authResult) redirect('/sign-in');

  const user = authResult.user;
  if (!user.b2b || !user.b2b.tenantId) {
    redirect('/dashboard');
  }

  if (user.b2b.role !== 'admin') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Only Tenant Administrators can manage B2B Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Settings
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Manage your tenant configuration and team members.
          </p>
        </div>
      </div>

      <div className="mt-8 mb-4">
        <h2 className="text-2xl font-bold tracking-tight">ATS Integrations</h2>
        <p className="text-muted-foreground mt-1 mb-6">Connect your Applicant Tracking Systems to automatically parse and score incoming candidates.</p>
        <ATSIntegrationsManager />
      </div>

      <Card className={glassCard}>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Invite and manage users who have access to this B2B dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Team management functionality will be available soon.
          </p>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80" disabled>
            Invite Member
          </button>
        </CardContent>
      </Card>

      <Card className={glassCard}>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for your tenant account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">Suspend Account</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Temporarily pause all API access. You will not be billed while suspended.
              </p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
              Suspend
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

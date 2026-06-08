import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ATSIntegrationsManager from '@/components/b2b/ATSIntegrationsManager';
import TeamManagement from '@/components/b2b/TeamManagement';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default async function SettingsPage() {
  const authResult = await getAuthenticatedUser();
  if (!authResult) redirect('/sign-in');

  const user = authResult.user;
  const isGlobalAdmin = user.role === 'admin' || user.role === 'superadmin';

  if (!isGlobalAdmin && (!user.b2b || !user.b2b.tenantId)) {
    redirect('/dashboard');
  }

  if (!isGlobalAdmin && user.b2b.role !== 'admin') {
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
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase text-white">
            PLATFORM <span className="text-[#80FF00]">SETTINGS</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium max-w-xl">
            Manage your tenant configuration, team permissions, and enterprise-grade integrations.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        <div className="bg-white/5 border border-white/10 rounded-[40px] p-10">
          <h2 className="text-2xl font-black tracking-tight uppercase text-white mb-2">ATS Integrations</h2>
          <p className="text-gray-500 font-medium mb-8">Connect your Applicant Tracking Systems to automatically parse and score incoming candidates.</p>
          <ATSIntegrationsManager />
        </div>

        <TeamManagement />

        <div className="bg-red-500/5 border border-red-500/10 rounded-[40px] p-10">
          <h3 className="text-2xl font-black tracking-tight uppercase text-red-500 mb-2">Danger Zone</h3>
          <p className="text-gray-500 font-medium mb-8">Irreversible actions for your tenant account.</p>
          <div className="flex justify-between items-center p-8 border border-red-500/20 rounded-3xl bg-red-500/5">
            <div>
              <h4 className="font-bold text-red-400 uppercase tracking-tight">Suspend Account</h4>
              <p className="text-sm text-gray-500 mt-1">
                Temporarily pause all API access. You will not be billed while suspended.
              </p>
            </div>
            <button className="px-8 py-4 bg-red-600/20 text-red-500 border border-red-500/20 rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-red-600 hover:text-white transition-all">
              Suspend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

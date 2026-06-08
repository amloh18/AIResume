import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import ApiKey from '@/models/b2b/ApiKey';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import ApiKeysManager from '@/components/b2b/ApiKeysManager';
import WebhookConfig from '@/components/b2b/WebhookConfig';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default async function APIKeysPage() {
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
          Only Tenant Administrators can manage API Keys and Webhooks.
        </p>
      </div>
    );
  }

  await getConnection();
  const tenantId = user.b2b?.tenantId;
  const apiKeys = tenantId ? await ApiKey.find({ tenantId }).lean() as any[] : [];
  const tenant = tenantId ? await Tenant.findById(tenantId).lean() as any : null;

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase text-white">
            API & <span className="text-[#80FF00]">INTEGRATIONS</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium max-w-xl">
            Manage your API credentials and webhook configurations for custom platform integrations.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <ApiKeysManager 
          initialApiKeys={JSON.parse(JSON.stringify(apiKeys))} 
          apiUsageCount={tenant?.apiUsageCount || 0} 
        />

        <WebhookConfig 
          initialUrl={tenant?.settings?.webhookUrl || ''} 
          initialSecret={tenant?.settings?.webhookSecret || ''} 
        />
      </div>
    </div>
  );
}

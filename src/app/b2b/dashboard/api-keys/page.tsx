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
  if (!user.b2b || !user.b2b.tenantId) {
    redirect('/dashboard');
  }

  if (user.b2b.role !== 'admin') {
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
  const apiKeys = await ApiKey.find({ tenantId: user.b2b.tenantId }).lean() as any[];
  const tenant = await Tenant.findById(user.b2b.tenantId).lean() as any;

  return (
    <div className="space-y-8 pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            API Keys & Webhooks
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Manage your API credentials and webhook configurations for integrations.
          </p>
        </div>
      </div>

      <ApiKeysManager 
        initialApiKeys={JSON.parse(JSON.stringify(apiKeys))} 
        apiUsageCount={tenant?.apiUsageCount || 0} 
      />

      <WebhookConfig 
        initialUrl={tenant?.settings?.webhookUrl || ''} 
        initialSecret={tenant?.settings?.webhookSecret || ''} 
      />
    </div>
  );
}

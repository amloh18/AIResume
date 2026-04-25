import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import ApiKey from '@/models/b2b/ApiKey';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import ApiKeysManager from '@/components/b2b/ApiKeysManager';

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

      <Card className={glassCard}>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>Configure where we should send asynchronous event updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL</label>
            <div className="flex gap-2">
              <input 
                type="url" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                placeholder="https://your-domain.com/webhooks/cvcircle"
                defaultValue={tenant?.settings?.webhookUrl || ''}
              />
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80">
                Save
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be a valid HTTPS URL that can accept POST requests.
            </p>
          </div>
          
          <div className="pt-4 border-t">
            <label className="text-sm font-medium">Webhook Secret</label>
            <div className="mt-1 flex items-center gap-2">
              <code className="px-3 py-2 bg-muted rounded text-sm flex-1 truncate">
                {tenant?.settings?.webhookSecret || 'Not configured'}
              </code>
              <button className="px-3 py-2 border rounded-md text-sm hover:bg-muted">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this secret to verify that webhook requests are coming from CVCircle.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React from 'react';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import ApiKey from '@/models/b2b/ApiKey';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, CreditCard, Clock, Users, Timer } from 'lucide-react';
import { redirect } from 'next/navigation';
import { AnalyticsIllustration } from '@/components/b2b/Illustrations';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default async function B2BDashboardPage() {
  const authResult = await getAuthenticatedUser();
  if (!authResult) redirect('/sign-in');

  const user = authResult.user;
  if (!user.b2b || !user.b2b.tenantId) {
    redirect('/dashboard');
  }

  await getConnection();
  const tenant = await Tenant.findById(user.b2b.tenantId).lean() as any;
  if (!tenant) {
    return <div>Tenant not found.</div>;
  }

  const apiKeys = await ApiKey.find({ tenantId: tenant._id }).lean() as any[];
  
  const maxRequests = tenant.subscriptionTier === 'free' ? 1000 : 
                      tenant.subscriptionTier === 'pro' ? 10000 : 100000;
  
  // Use actual API usage
  const currentUsage = tenant.apiUsageCount || 0; 
  const usagePercent = Math.min((currentUsage / maxRequests) * 100, 100);

  // Phase 3: Analytics & ROI Tracking
  // Assume each CV takes 3 minutes (0.05 hours) to screen manually
  const hoursSaved = Math.floor(currentUsage * 0.05);
  // Assume a 1.2% rediscovery rate for qualified candidates from dark data
  const rediscoveredCandidates = Math.floor(currentUsage * 0.012);

  return (
    <div className="space-y-8 pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Overview & Analytics
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Monitor your API usage, billing details, and tenant information.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 md:opacity-80 pointer-events-none transform translate-x-1/4 translate-y-1/4 md:translate-x-12 md:-translate-y-8 w-64 md:w-96 text-primary">
          <AnalyticsIllustration />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className={glassCard}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CVs Processed</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              / {maxRequests.toLocaleString()} limit
            </p>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hours Saved</CardTitle>
            <Timer className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {hoursSaved.toLocaleString()}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manual screening time saved
            </p>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dark Data Resurfaced</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {rediscoveredCandidates.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Qualified past candidates found
            </p>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiKeys.filter(k => k.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {apiKeys.length} total keys
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
            <CardDescription>Your API quota for the current billing cycle.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">API Calls</span>
                <span className="text-muted-foreground">{usagePercent.toFixed(1)}%</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              If you need higher limits, please upgrade your subscription tier.
            </p>
          </CardContent>
        </Card>

        <Card className={glassCard}>
          <CardHeader>
            <CardTitle>Tenant Details</CardTitle>
            <CardDescription>Basic information about your B2B account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Tenant Name</span>
              <span className="text-sm text-muted-foreground">{tenant.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Contact Email</span>
              <span className="text-sm text-muted-foreground">{tenant.contactEmail}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={tenant.isActive ? 'default' : 'destructive'}>
                {tenant.isActive ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Joined</span>
              <span className="text-sm text-muted-foreground">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Settings, LogOut, ArrowLeft, BarChart3, Mail, DollarSign, MessageSquare, Activity, Crown, FileText, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import RecentActivityPanel from '@/components/admin/RecentActivityPanel';

// Import admin components
import AdminKPIs from '@/components/admin/AdminKPIs';
import CVJourneyKPIs from '@/components/admin/CVJourneyKPIs';
import TemplateManager from '@/components/admin/TemplateManager';
import UserManagement from '@/components/admin/UserManagement';
import EmailCampaignManager from '@/components/admin/EmailCampaignManager';
import SystemHealth from '@/components/admin/SystemHealth';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import TestimonialManager from '@/components/admin/TestimonialManager';
import AIAnalytics from '@/components/admin/AIAnalytics';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  type: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        const data = await response.json();

        if (data.success) {
          setUser(data.user);
        } else {
          router.push('/admin/signin');
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        router.push('/admin/signin');
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
    fetchActivityCount();
  }, [router]);

  const fetchActivityCount = async () => {
    try {
      const response = await fetch('/api/admin/activity?limit=1');
      if (response.ok) {
        const data = await response.json();
        setActivityCount(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching activity count:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      setActivitiesError(null);
      setActivitiesLoading(true);
      const response = await fetch('/api/admin/activity?limit=15');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setActivityCount(data.total || 0);
      } else {
        const errorData = await response.json();
        setActivitiesError(`Failed to fetch activities: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivitiesError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleSignOut = () => {
    document.cookie = 'admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/admin/signin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-300">Administrative Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => {
                  if (!isActivityPanelOpen) {
                    fetchActivities();
                  }
                  setIsActivityPanelOpen(!isActivityPanelOpen);
                }}
                variant={isActivityPanelOpen ? "default" : "outline"}
                size="sm"
                className={isActivityPanelOpen 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }
              >
                <Activity className="h-4 w-4 mr-2" />
                Activity
                {activityCount > 0 && (
                  <div className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
                    {activityCount > 99 ? '99+' : activityCount}
                  </div>
                )}
                {isActivityPanelOpen && (
                  <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </Button>
              <Link 
                href="/" 
                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Main Site
              </Link>
              <Badge variant="outline" className="text-sm bg-gray-700 border-gray-600 text-white">
                {user.role}
              </Badge>
              <span className="text-sm text-gray-300">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Admin Panel with Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-9 bg-gray-800 border-gray-700">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <Activity className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="journey" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <FileText className="h-4 w-4 mr-2" />
                Journey
              </TabsTrigger>
              <TabsTrigger value="templates" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <Mail className="h-4 w-4 mr-2" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="pricing" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <DollarSign className="h-4 w-4 mr-2" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <MessageSquare className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                <Settings className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <AdminKPIs />
            </TabsContent>

            {/* AI Analytics Tab */}
            <TabsContent value="analytics" className="mt-6">
              <AIAnalytics />
            </TabsContent>

            {/* Journey Tab */}
            <TabsContent value="journey" className="mt-6">
              <CVJourneyKPIs />
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-6">
              <TemplateManager />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="mt-6">
              <EmailCampaignManager />
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-6">
              <PricingPlanManager />
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-6">
              <TestimonialManager />
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="mt-6">
              <SystemHealth />
            </TabsContent>
          </Tabs>

          {/* User Info Card */}
          <div className="mt-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Admin Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Current admin user details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Email</p>
                    <p className="text-sm text-white">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Role</p>
                    <p className="text-sm text-white">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Type</p>
                    <p className="text-sm text-white">{user.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">User ID</p>
                    <p className="text-sm text-white">{user.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Recent Activity Overlay Panel */}
      {isActivityPanelOpen && (
        <RecentActivityPanel 
          isOpen={isActivityPanelOpen} 
          onClose={() => setIsActivityPanelOpen(false)}
          activities={activities}
          loading={activitiesLoading}
          error={activitiesError}
          onRefresh={fetchActivities}
        />
      )}
    </div>
  );
}
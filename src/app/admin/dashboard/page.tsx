'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Settings, LogOut, ArrowLeft, BarChart3, Mail, DollarSign, MessageSquare, Activity, Crown, FileText, LayoutTemplate, ChevronDown, User, Sparkles, Bell } from 'lucide-react';
import Link from 'next/link';
import RecentActivityPanel from '@/components/admin/RecentActivityPanel';

// Import admin components
import AdminKPIs from '@/components/admin/AdminKPIs';
import CVJourneyKPIs from '@/components/admin/CVJourneyKPIs';
import TemplateManager from '@/components/admin/TemplateManager';
import UserManagement from '@/components/admin/UserManagement';
import EmailCampaignManager from '@/components/admin/EmailCampaignManager';
import NotificationManager from '@/components/admin/NotificationManager';
import SystemHealth from '@/components/admin/SystemHealth';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import TestimonialManager from '@/components/admin/TestimonialManager';
import AIAnalytics from '@/components/admin/AIAnalytics';
import LogsViewer from '@/components/admin/LogsViewer';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Track if we've already verified to prevent duplicate calls
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate verification calls
    if (hasVerifiedRef.current) {
      return;
    }
    hasVerifiedRef.current = true;

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

    // Run both in parallel for better performance
    Promise.all([verifyAdmin(), fetchActivityCount()]);
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Don't show loading spinner - render content immediately
  // Components will handle their own loading states

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 mb-0">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">CVCircle</h1>
                <p className="text-sm text-gray-300">Admin Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Consolidated Admin Menu */}
              <div className="relative" ref={menuRef}>
                <Button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <User className="h-4 w-4 mr-2" />
                  {user.email}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-sm bg-gray-700 border-gray-600 text-white">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Main Site
                      </Link>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Button */}
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
            </div>
          </div>
        </div>
      </header>

      {/* Admin Panel with Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        {/* Navbar Tabs - Full Width */}
        <div className="bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="flex w-max min-w-full bg-transparent border-0 md:grid md:w-full md:grid-cols-4">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 flex-shrink-0 md:flex-shrink">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 flex-shrink-0 md:flex-shrink">
                  <Activity className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="management" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 flex-shrink-0 md:flex-shrink">
                  <Users className="h-4 w-4 mr-2" />
                  Management
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 flex-shrink-0 md:flex-shrink">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pricing
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <AdminKPIs />
            </TabsContent>

            {/* Analytics Tab with Sub-tabs */}
            <TabsContent value="analytics" className="mt-6">
              <Tabs defaultValue="ai" className="w-full">
                <TabsList className="bg-transparent border-b border-gray-700 rounded-none p-0 h-auto w-full justify-start">
                  <TabsTrigger value="ai" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI
                  </TabsTrigger>
                  <TabsTrigger value="journey" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <FileText className="h-4 w-4 mr-2" />
                    Journey
                  </TabsTrigger>
                  <TabsTrigger value="content" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Logs
                  </TabsTrigger>
                  <TabsTrigger value="system" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Settings className="h-4 w-4 mr-2" />
                    System
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="mt-6">
                  <AIAnalytics />
                </TabsContent>

                <TabsContent value="journey" className="mt-6">
                  <CVJourneyKPIs />
                </TabsContent>

                <TabsContent value="content" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Content Management</h2>
                      <p className="text-gray-400">Manage templates and testimonials</p>
                    </div>
                    <TemplateManager />
                    <div className="mt-8">
                      <TestimonialManager />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                  <LogsViewer />
                </TabsContent>

                <TabsContent value="system" className="mt-6">
                  <SystemHealth />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Management Tab with Sub-tabs */}
            <TabsContent value="management" className="mt-6">
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="bg-transparent border-b border-gray-700 rounded-none p-0 h-auto w-full justify-start">
                  <TabsTrigger value="users" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </TabsTrigger>
                  <TabsTrigger value="campaigns" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Mail className="h-4 w-4 mr-2" />
                    Campaigns
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6">
                  <UserManagement />
                </TabsContent>

                <TabsContent value="campaigns" className="mt-6">
                  <EmailCampaignManager />
                </TabsContent>

                <TabsContent value="notifications" className="mt-6">
                  <NotificationManager />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-6">
              <PricingPlanManager />
            </TabsContent>

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
      </Tabs>

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
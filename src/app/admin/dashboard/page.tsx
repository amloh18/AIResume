'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Settings, LogOut, ArrowLeft, BarChart3, Mail, DollarSign, MessageSquare, Activity, Crown, FileText, LayoutTemplate, ChevronDown, User, Sparkles, Bell, Database } from 'lucide-react';
import Link from 'next/link';
import RecentActivityPanel from '@/components/admin/RecentActivityPanel';

// Import admin components
import AdminKPIs from '@/components/admin/AdminKPIs';
import CVJourneyKPIs from '@/components/admin/CVJourneyKPIs';
import TemplateManager from '@/components/admin/TemplateManager';
import UserManagement from '@/components/admin/UserManagement';
import EmailCampaignManager from '@/components/admin/EmailCampaignManager';
import DraftManagement from '@/components/admin/DraftManagement';
import UnifiedNotificationManager from '@/components/admin/UnifiedNotificationManager';
import SystemHealth from '@/components/admin/SystemHealth';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import TestimonialManager from '@/components/admin/TestimonialManager';
import AIAnalytics from '@/components/admin/AIAnalytics';
import LogsViewer from '@/components/admin/LogsViewer';
import ContentAnalytics from '@/components/admin/ContentAnalytics';
import SponsorshipManager from '@/components/admin/SponsorshipManager';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);

  // Extract admin user from session
  const user = session?.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';

  // Hash-based navigation state
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'management' | 'pricing'>('overview');
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  // Parse hash from URL on mount and on hash change
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (!hash) {
        setActiveTab('overview');
        setActiveSubTab('');
        return;
      }

      // Parse format: section or section-subsection
      const parts = hash.split('-');
      const section = parts[0] as 'overview' | 'analytics' | 'management' | 'pricing';
      const subsection = parts.slice(1).join('-') || '';

      if (['overview', 'analytics', 'management', 'pricing'].includes(section)) {
        setActiveTab(section);
        setActiveSubTab(subsection);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tab: 'overview' | 'analytics' | 'management' | 'pricing', subTab?: string) => {
    const hash = subTab ? `${tab}-${subTab}` : tab;
    window.location.hash = hash;
    setActiveTab(tab);
    setActiveSubTab(subTab || '');
  };

  useEffect(() => {
    // Redirect if not authenticated or not an admin
    if (status === 'unauthenticated') {
      router.push('/admin/signin');
      return;
    }

    if (status === 'authenticated' && !isAdmin) {
      console.warn('Non-admin user attempted to access admin dashboard', {
        userType: user?.type,
        userRole: user?.role,
        userId: user?.id
      });
      router.push('/admin/signin');
      return;
    }

    // Prevent duplicate calls
    if (hasFetchedRef.current || status === 'loading' || !isAdmin) {
      return;
    }
    hasFetchedRef.current = true;

    // Fetch activity count only if authenticated and admin
    if (status === 'authenticated' && isAdmin) {
      fetchActivityCount();
    }
  }, [status, isAdmin, router]);

  const fetchActivityCount = async () => {
    try {
      const response = await fetch('/api/admin/activity?limit=1');
      if (response.ok) {
        // Check content-type before parsing JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setActivityCount(data.total || 0);
        } else {
          // Response is not JSON (might be HTML error page)
          console.warn('Activity count API returned non-JSON response:', contentType);
          setActivityCount(0);
        }
      } else {
        // Handle non-OK responses gracefully
        console.warn('Failed to fetch activity count:', response.status, response.statusText);
        setActivityCount(0);
      }
    } catch (error) {
      // Only log if it's a real error, not an Event object
      if (error instanceof Error) {
        // Check if it's a JSON parsing error
        if (error.message.includes('JSON') || error.message.includes('DOCTYPE')) {
          console.warn('Activity count API returned invalid JSON (likely HTML error page)');
        } else {
          console.error('Error fetching activity count:', error.message);
        }
      } else if (error && typeof error === 'object' && !('target' in error)) {
        // Only log if it's not an Event object
        const errorStr = String(error);
        if (errorStr.includes('JSON') || errorStr.includes('DOCTYPE')) {
          console.warn('Activity count API returned invalid response format');
        } else {
          console.error('Error fetching activity count:', errorStr);
        }
      }
      setActivityCount(0);
    }
  };

  const fetchActivities = async () => {
    try {
      setActivitiesError(null);
      setActivitiesLoading(true);
      const response = await fetch('/api/admin/activity?limit=15');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setActivities(data.activities || []);
          setActivityCount(data.total || 0);
        } else {
          // Response is not JSON (might be HTML error page)
          setActivitiesError('Invalid response format from server');
        }
      } else {
        // Try to parse error, but handle non-JSON responses
        try {
          const errorData = await response.json();
          setActivitiesError(`Failed to fetch activities: ${errorData.error || 'Unknown error'}`);
        } catch {
          setActivitiesError(`Failed to fetch activities: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      // Only log if it's a real error, not an Event object
      if (error instanceof Error) {
        console.error('Error fetching activities:', error.message);
        setActivitiesError(`Network error: ${error.message}`);
      } else if (error && typeof error === 'object' && !('target' in error && 'preventDefault' in error)) {
        // Only log if it's not an Event object
        const errorMessage = String(error);
        console.error('Error fetching activities:', errorMessage);
        setActivitiesError(`Network error: ${errorMessage}`);
      } else {
        setActivitiesError('An unexpected error occurred');
      }
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/admin/signin', redirect: true });
    } catch (error) {
      console.error('Sign out error:', error);
      router.push('/admin/signin');
    }
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

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!user || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
          <div className="flex justify-between items-center py-6 mb-0 gap-4">
            {/* Logo Section */}
            <div className="flex items-center flex-shrink-0">
              <Shield className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">CVCircle</h1>
                <p className="text-sm text-gray-300">Admin Panel</p>
              </div>
            </div>

            {/* Navigation Chips */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
              <button
                onClick={() => handleTabChange('overview')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'overview'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                Overview
              </button>
              <button
                onClick={() => handleTabChange('analytics')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                Analytics
              </button>
              <button
                onClick={() => handleTabChange('management')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'management'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                Management
              </button>
              <button
                onClick={() => handleTabChange('pricing')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'pricing'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                Pricing
              </button>
            </div>

            {/* User & Activity Buttons */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {/* Consolidated Admin Menu */}
              <div className="relative" ref={menuRef}>
                <Button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden tablet:inline">{user.email}</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-sm bg-gray-700 border-gray-600 text-white">
                          {user.role || 'admin'}
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
                className={isActivityPanelOpen
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }
              >
                <Activity className="h-4 w-4 mr-2" />
                <span className="hidden tablet:inline">Activity</span>
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

      {/* Mobile Navigation - Below Header */}
      <div className="md:hidden bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleTabChange('overview')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabChange('analytics')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'analytics'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Analytics
            </button>
            <button
              onClick={() => handleTabChange('management')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'management'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Management
            </button>
            <button
              onClick={() => handleTabChange('pricing')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'pricing'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Pricing
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 tablet:px-6 desktop:px-8">
        <div className="px-4 tablet:px-0">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="mt-0">
              <AdminKPIs />
            </div>
          )}

          {/* Analytics Tab with Sub-tabs */}
          {activeTab === 'analytics' && (
            <div>
              <Tabs value={activeSubTab || 'ai'} onValueChange={(value) => handleTabChange('analytics', value)} className="w-full">
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
                  <ContentAnalytics />
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                  <LogsViewer />
                </TabsContent>

                <TabsContent value="system" className="mt-6">
                  <SystemHealth />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Management Tab with Sub-tabs */}
          {activeTab === 'management' && (
            <div>
              <Tabs value={activeSubTab || 'users'} onValueChange={(value) => handleTabChange('management', value)} className="w-full">
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
                  <TabsTrigger value="drafts" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <FileText className="h-4 w-4 mr-2" />
                    CV Drafts
                  </TabsTrigger>
                  <TabsTrigger value="sponsorships" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300 rounded-none px-6 py-3">
                    <Database className="h-4 w-4 mr-2" />
                    Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6">
                  <UserManagement />
                </TabsContent>

                <TabsContent value="campaigns" className="mt-6">
                  <EmailCampaignManager />
                </TabsContent>

                <TabsContent value="notifications" className="mt-6 space-y-6">
                  <UnifiedNotificationManager />
                </TabsContent>

                <TabsContent value="drafts" className="mt-6">
                  <DraftManagement />
                </TabsContent>

                <TabsContent value="sponsorships" className="mt-6">
                  <SponsorshipManager />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="w-full min-h-[400px]">
                <PricingPlanManager />
              </div>
            </div>
          )}

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
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Email</p>
                    <p className="text-sm text-white">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Role</p>
                    <p className="text-sm text-white">{user.role || 'admin'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Type</p>
                    <p className="text-sm text-white">{user.type || 'admin'}</p>
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
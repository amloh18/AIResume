'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3 as DashboardIcon,
  Users as People,
  FileText,
  Settings,
  BarChart3 as Analytics,
  LayoutTemplate as Template,
  LogOut,
  Menu,
  X as Close,
  Activity,
  Sun,
  Moon,
  ExternalLink,
  Database,
  Cloud,
  Server
} from 'lucide-react';
import AdminKPIs from '@/components/admin/AdminKPIs';
import TemplateManager from '@/components/admin/TemplateManager';
import UserManagement from '@/components/admin/UserManagement';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import AIAnalytics from '@/components/admin/AIAnalytics';
import SystemHealth from '@/components/admin/SystemHealth';
import RecentActivity from '@/components/admin/RecentActivity';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface AdminPageProps {}

const AdminPage: React.FC<AdminPageProps> = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('kpis');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log('🔍 Admin Page Debug:');
    console.log('Session:', session);
    console.log('User role:', session?.user?.role);
    console.log('User email:', session?.user?.email);
    
    if (!session) {
      console.log('❌ No session, redirecting to login');
      router.push('/auth/login?callbackUrl=/admin');
      return;
    }

    // Check if user has admin role
    if (session.user?.role !== 'admin') {
      console.log('❌ User is not admin, redirecting to dashboard');
      console.log('Expected: admin, Got:', session.user?.role);
      router.push('/dashboard');
      return;
    }
    
    console.log('✅ User is admin, showing admin dashboard');
  }, [session, status, router]);

  const menuItems = [
    { id: 'kpis', label: 'KPIs & Analytics', icon: Analytics },
    { id: 'templates', label: 'Template Manager', icon: Template },
    { id: 'users', label: 'User Management', icon: People },
    { id: 'pricing', label: 'Pricing Plans', icon: FileText },
    { id: 'ai', label: 'AI Analytics', icon: DashboardIcon },
    { id: 'system', label: 'System Health', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'kpis':
        return <AdminKPIs />;
      case 'templates':
        return <TemplateManager />;
      case 'users':
        return <UserManagement />;
      case 'pricing':
        return <PricingPlanManager />;
      case 'ai':
        return <AIAnalytics />;
      case 'system':
        return <SystemHealth />;
      default:
        return <AdminKPIs />;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile overlays */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {activityOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 xl:hidden"
          onClick={() => setActivityOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:h-screen flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h1 className="text-xl font-bold">
            <span className="text-gray-900 dark:text-white">CV</span>
            <span className="text-lime-500">Circle</span>
            <span className="text-gray-900 dark:text-white"> Dashboard</span>
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <Close size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={20} className="mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* External Services Links */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4">
            External Services
          </h3>
          <div className="space-y-2">
            <a
              href="https://cloud.mongodb.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors group"
            >
              <Database size={18} className="mr-3 text-green-500" />
              <span>MongoDB Atlas</span>
              <ExternalLink size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors group"
            >
              <Cloud size={18} className="mr-3 text-blue-500" />
              <span>Vercel</span>
              <ExternalLink size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <a
              href="https://appwrite.io"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors group"
            >
              <Server size={18} className="mr-3 text-purple-500" />
              <span>AppWrite</span>
              <ExternalLink size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>

        {/* Back to App Button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Back to App
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0 flex">
        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col h-screen">
          {/* Top bar */}
          <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between h-16 px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <Menu size={20} />
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {session.user?.name || 'Admin'}
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={() => setActivityOpen(true)}
                  className="xl:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <Activity size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </main>
        </div>

        {/* Recent Activity - Third column */}
        <div className="hidden xl:block w-80 flex-shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            <RecentActivity />
          </div>
        </div>

        {/* Mobile Activity Panel */}
        {activityOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out xl:hidden">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              <button
                onClick={() => setActivityOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <Close size={20} />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-4rem)]">
              <RecentActivity />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage; 
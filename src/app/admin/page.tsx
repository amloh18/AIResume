'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3 as DashboardIcon,
  Users as People,
  FileText,
  Settings,
  LayoutTemplate as Template,
  LogOut,
  Menu,
  X as Close,
  Activity,
  ExternalLink,
  Database,
  Cloud,
  Server,
  CreditCard,
  Wallet,
  Bell
} from 'lucide-react';
import AdminKPIs from '@/components/admin/AdminKPIs';
import CVJourneyKPIs from '@/components/admin/CVJourneyKPIs';
import TemplateManager from '@/components/admin/TemplateManager';
import UserManagement from '@/components/admin/UserManagement';
import PricingPlanManager from '@/components/admin/PricingPlanManager';
import AIAnalytics from '@/components/admin/AIAnalytics';
import SystemHealth from '@/components/admin/SystemHealth';
import RecentActivity from '@/components/admin/RecentActivity';
import TestimonialManager from '@/components/admin/TestimonialManager';
import { useTheme } from '@/lib/contexts/ThemeContext';
import UserIcon from '@/components/ui/UserIcon';

interface AdminPageProps {}

const AdminPage: React.FC<AdminPageProps> = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('kpis');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleCheckLoading, setRoleCheckLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (status === 'loading') return;

    console.log('🔍 Admin Page Debug:');
    console.log('Session:', JSON.stringify(session, null, 2));
    console.log('Session user:', session?.user);
    console.log('User role:', session?.user?.role);
    console.log('User ID:', session?.user?.id);
    console.log('User email:', session?.user?.email);

    if (!session) {
      console.log('❌ No session, redirecting to signin');
      router.push('/sign-in?redirect_url=/admin');
      return;
    }

    // Check if user has admin role from session
    if (session.user?.role === 'admin') {
      console.log('✅ User is admin (from session), showing admin dashboard');
      setUserRole('admin');
      return;
    }

    // If role is not in session, check via API
    if (!session.user?.role && !roleCheckLoading) {
      console.log('🔍 Role not in session, checking via API...');
      setRoleCheckLoading(true);
      
      fetch('/api/admin/check-user-role')
        .then(response => response.json())
        .then(data => {
          setRoleCheckLoading(false);
          if (data.success && data.user.role === 'admin') {
            console.log('✅ User is admin (from API), showing admin dashboard');
            setUserRole('admin');
          } else {
            console.log('❌ User is not admin (from API), redirecting to dashboard');
            router.push('/dashboard');
          }
        })
        .catch(error => {
          console.error('❌ Error checking user role:', error);
          setRoleCheckLoading(false);
          router.push('/dashboard');
        });
      return;
    }

    // If we have a role but it's not admin
    if (session.user?.role && session.user.role !== 'admin') {
      console.log('❌ User is not admin, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [session, status, router, roleCheckLoading]);

  const handleLogout = async () => {
    try {
      console.log('🔍 Starting admin logout process...');
      
      // Clear localStorage
      localStorage.removeItem('user');
      console.log('✅ Cleared localStorage');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');
      
      // Check if user is from Firebase (has user data in localStorage)
      const userData = localStorage.getItem('user');
      if (userData) {
        console.log('🔍 Firebase user detected, signing out from Firebase...');
        // Firebase user - sign out from Firebase
        try {
          const { signOut: signOutFirebase } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          await signOutFirebase(auth);
          console.log('✅ Signed out from Firebase');
        } catch (error) {
          console.error('❌ Error signing out from Firebase:', error);
        }
      }
      
      // Sign out from NextAuth
      console.log('🔍 Signing out from NextAuth...');
      await signOut({ 
        redirect: true,
        callbackUrl: '/'
      });
      console.log('✅ Signed out from NextAuth');
      
    } catch (error) {
      console.error('❌ Error during admin logout:', error);
      // Fallback - clear storage and redirect
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const menuItems = [
    { id: 'kpis', label: 'General KPIs', icon: DashboardIcon },
    { id: 'cv-journey-kpis', label: 'CV Journey KPIs', icon: DashboardIcon },
    { id: 'templates', label: 'Template Manager', icon: Template },
    { id: 'users', label: 'User Management', icon: People },
    { id: 'pricing', label: 'Pricing Plans', icon: FileText },
    { id: 'ai', label: 'AI Analytics', icon: DashboardIcon },
    { id: 'testimonials', label: 'Testimonials', icon: Bell },
    { id: 'system', label: 'System Health', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'kpis':
        return <AdminKPIs />;
      case 'cv-journey-kpis':
        return <CVJourneyKPIs />;
      case 'templates':
        return <TemplateManager />;
      case 'users':
        return <UserManagement />;
      case 'pricing':
        return <PricingPlanManager />;
      case 'ai':
        return <AIAnalytics />;
      case 'testimonials':
        return <TestimonialManager />;
      case 'system':
        return <SystemHealth />;
      default:
        return <AdminKPIs />;
    }
  };

  if (status === 'loading' || roleCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Loading session...' : 'Checking admin access...'}
          </p>
        </div>
      </div>
    );
  }

  if (!session || (userRole !== 'admin' && session.user?.role !== 'admin')) {
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
      
      {notificationsOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setNotificationsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:h-screen flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h1 className="text-xl font-bold">
            <span className="text-lime-500">CV</span>
            <span className="text-gray-900 dark:text-white">Circle</span>
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
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors group"
            >
              <CreditCard size={18} className="mr-3 text-blue-600" />
              <span>Stripe Dashboard</span>
              <ExternalLink size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <a
              href="https://dashboard.razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors group"
            >
              <Wallet size={18} className="mr-3 text-indigo-600" />
              <span>Razorpay Dashboard</span>
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
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  Welcome, {session?.user?.name || 'Admin'}
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center space-x-2">
                <UserIcon 
                  user={{
                    name: session?.user?.name || 'Admin',
                    email: session?.user?.email || 'admin@example.com',
                    profilePhoto: session?.user?.image,
                    designation: 'System Administrator'
                  }}
                />
                
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors relative"
                  title="Notifications"
                >
                  <Bell size={20} />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-red-500/25"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Notifications Panel */}
      {notificationsOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <button
              onClick={() => setNotificationsOpen(false)}
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
  );
};

export default AdminPage;

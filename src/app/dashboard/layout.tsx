'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import { Bell, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { useCVSetup } from '@/lib/hooks/useCVSetup';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasCV, isChecking } = useCVSetup();
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

  const [user, setUser] = useState({
    name: 'User',
    email: 'user@example.com',
    username: undefined,
    progress: 60,
    profilePhoto: '',
    cvsCreated: 3,
    jobsApplied: 2,
    coverLetters: 1,
    subscription: {
      planName: 'Free Plan',
      status: 'active',
      credits: 20
    }
  });

  // Fetch user data including subscription and username
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile data
        const userResponse = await fetch('/api/user');
        const userData = await userResponse.json();
        
        if (userData.success) {
          setUser(prev => ({
            ...prev,
            username: userData.user.username,
            subscription: prev.subscription // Keep existing subscription data
          }));
        }

        // Fetch subscription data
        const subscriptionResponse = await fetch('/api/user/subscription');
        const subscriptionData = await subscriptionResponse.json();
        if (subscriptionData.success) {
          setUser(prev => ({
            ...prev,
            subscription: subscriptionData.subscription
          }));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Check authentication and handle onboarding flow
  useEffect(() => {
    if (status === 'loading' || isChecking) {
      console.log('🔍 Dashboard Layout - Still loading, waiting...', { status, isChecking });
      return; // Still loading
    }

    if (status === 'unauthenticated') {
      // If user is not authenticated, redirect to home page
      console.log('🔄 Dashboard Layout - User not authenticated, redirecting to home');
      router.push('/');
      return;
    }

    // Check if user just completed onboarding - this takes priority
    const fromOnboarding = sessionStorage.getItem('fromOnboarding') === 'true';
    
    // If user just completed onboarding, don't redirect back
    if (fromOnboarding) {
      console.log('🎉 Dashboard Layout - User completed onboarding, staying on dashboard');
      // Handle welcome animation
      setShowWelcomeAnimation(true);
      // Clear the flag after using it
      sessionStorage.removeItem('fromOnboarding');
      return;
    }
    
    // Only redirect to onboarding if user is authenticated but has no CVs
    // AND we're not in a loading state AND there's no fromOnboarding flag
    if (status === 'authenticated' && !hasCV && !isChecking) {
      const needsCVSetup = sessionStorage.getItem('needsCVSetup') === 'true';
      console.log('🔄 Dashboard Layout - Redirect check', { status, hasCV, isChecking, needsCVSetup });
      
      if (needsCVSetup) {
        console.log('🔄 Dashboard Layout - needsCVSetup is true, redirecting to onboarding');
        router.push('/onboarding');
        return;
      }
    }

    // Handle welcome animation from registration, login, or onboarding
    const isFromRegistration = sessionStorage.getItem('fromRegistration');
    const isFromLogin = sessionStorage.getItem('fromLogin');
    
    if (isFromRegistration || isFromLogin) {
      setShowWelcomeAnimation(true);
      sessionStorage.removeItem('fromRegistration');
      sessionStorage.removeItem('fromLogin');
    }
  }, [status, hasCV, isChecking, router]);

  // Update user data from session
  useEffect(() => {
    if (session?.user) {
      setUser(prev => ({
        ...prev,
        name: session.user.firstName || session.user.name || 'User',
        email: session.user.email || prev.email,
        profilePhoto: session.user.avatar || session.user.profilePhoto || ''
      }));
    }
  }, [session]);

  // Get active section from pathname
  const getActiveSection = () => {
    if (pathname === '/dashboard') return 'analytics';
    const pathSegments = pathname.split('/');
    return pathSegments[2] || 'analytics'; // /dashboard/[section]
  };

  const handleSectionChange = (section: string) => {
    setSidebarOpen(false); // Close sidebar on mobile when section changes
    if (section === 'analytics' || section === 'pulse') {
      router.push('/dashboard', { scroll: false });
    } else {
      router.push(`/dashboard/${section}`, { scroll: false });
    }
  };

  const isSettingsPage = pathname === '/dashboard/settings';

  const getPageInfo = () => {
    const section = getActiveSection();
    switch (section) {
      case 'analytics': return { title: 'Analytics', description: 'Progress tracking and insights' };
      case 'pipeline': return { title: 'Job Tracker', description: 'Track applications and manage career progress' };
      case 'canvas': return { title: 'CV Studio', description: 'Create, edit, and manage professional CVs' };
      case 'inkpad': return { title: 'Cover Letters', description: 'Generate personalized cover letters' };
      case 'vault': return { title: 'Saved Forms', description: 'Store and manage form data' };
      case 'quillbox': return { title: 'Snippets', description: 'Content library and templates' };
      case 'settings': return { title: 'Settings', description: 'Account preferences and configuration' };
      default: return { title: 'Dashboard', description: 'Overview and quick actions' };
    }
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        {/* Welcome Animation Overlay */}
        <AnimatePresence>
          {showWelcomeAnimation && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center backdrop-optimized"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ willChange: 'opacity' }}
              onClick={() => setShowWelcomeAnimation(false)}
            >
              <motion.div
                className="text-center space-y-8 p-8"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{ willChange: 'transform' }}
              >
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
                >
                  <Sparkles size={48} className="text-black" />
                </motion.div>
                
                <motion.h1
                  className="text-4xl font-bold text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  Welcome to Your Dashboard!
                </motion.h1>
                
                <motion.p
                  className="text-xl text-white/60 max-w-md mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  Your CV toolkit is ready. Start building your career success!
                </motion.p>
                
                <motion.div
                  className="flex items-center justify-center gap-2 text-lime-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                >
                  <motion.div
                    className="w-2 h-2 bg-lime-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-lime-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-lime-400 rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu Toggle */}
        <div className="xl:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <DashboardNavigation
            activeSection={getActiveSection()}
            onSectionChange={handleSectionChange}
            onMembershipClick={() => {}}
            user={user}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main Dashboard Area */}
          <main className="flex-1 p-2 pt-20 xl:pt-10">
            <div className="max-w-full mx-auto">
              {/* Top Header */}
              <div className="sticky top-0 z-30 -mt-2 xl:-mt-0 mb-6 px-2 xl:px-0 bg-gradient-to-br from-black/70 via-gray-900/70 to-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/40 rounded-xl border border-white/10">
                <div className="flex items-center justify-between py-4 px-4">
                  {/* Title and Description */}
                  <div>
                    <h1 className="text-lg xl:text-xl font-semibold text-white">{getPageInfo().title}</h1>
                    <p className="text-xs xl:text-sm text-white/60 mt-1">{getPageInfo().description}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                      <Bell size={18} />
                    </button>
                    {/* Theme Toggle */}
                    <button aria-label="Toggle Theme" onClick={toggleTheme} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    {/* Settings (hide on settings page) */}
                    {!isSettingsPage && (
                      <button onClick={() => router.push('/dashboard/settings')} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                        <Settings size={18} />
                      </button>
                    )}
                    {/* Profile compact */}
                    <div className="flex items-center gap-2 pl-2 ml-1 border-l border-white/10">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-lime-400 to-lime-500 flex items-center justify-center text-black text-xs font-bold">
                        {(user.name || 'U').slice(0,1).toUpperCase()}
                      </div>
                      <div className="hidden sm:block leading-tight">
                        <div className="text-white text-sm">{user.name}</div>
                        <div className="text-white/50 text-[10px]">{user.email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  );
};

export default DashboardLayout;

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import { Bell, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getPageBackground } from '@/lib/utils/themeUtils';
import ThemeToggle from '@/components/ui/ThemeToggle';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { useCVSetup } from '@/lib/hooks/useCVSetup';
import { JobJourneyProvider } from '@/contexts/JobJourneyContext';
import JourneyStatusBanner from '@/components/JourneyStatusBanner';

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
    designation: 'Software Developer',
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
        // Check if user is authenticated via Firebase
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            if (parsedUser.firebaseUid) {
              // Use Firebase user data
              setUser(prev => ({
                ...prev,
                name: parsedUser.firstName + ' ' + parsedUser.lastName,
                email: parsedUser.email,
                username: parsedUser.username
              }));
              
              // Fetch subscription data for Firebase user
              const subscriptionResponse = await fetch('/api/user/subscription', {
                headers: {
                  'x-firebase-user-id': parsedUser.firebaseUid
                }
              });
              const subscriptionData = await subscriptionResponse.json();
              if (subscriptionData.success) {
                setUser(prev => ({
                  ...prev,
                  subscription: subscriptionData.subscription
                }));
              }
              return;
            }
          } catch (error) {
            console.error('Error parsing Firebase user data:', error);
          }
        }

        // Fallback to NextAuth user data
        if (session?.user) {
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
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [session]);

  // Check authentication and handle onboarding flow
  useEffect(() => {
    if (status === 'loading' || isChecking) {
      console.log('🔍 Dashboard Layout - Still loading, waiting...', { status, isChecking });
      return; // Still loading
    }

    // Check for Firebase authentication first
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.firebaseUid) {
          console.log('🔍 Dashboard Layout - Firebase user found:', parsedUser);
          // User is authenticated via Firebase, allow access
          return;
        }
      } catch (error) {
        console.error('Error parsing Firebase user data:', error);
      }
    }

    // Check NextAuth session
    if (status === 'unauthenticated') {
      // If user is not authenticated via either method, redirect to home page
      console.log('🔄 Dashboard Layout - User not authenticated via NextAuth or Firebase, redirecting to home');
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
        profilePhoto: session.user.image || ''
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



  return (
    <RouteGuard requireAuth={true}>
      <JobJourneyProvider>
        <div className={getPageBackground('dashboard')}>
          <JourneyStatusBanner />
        {/* Welcome Animation Overlay */}
        <AnimatePresence>
          {showWelcomeAnimation && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 dark:bg-black/90 backdrop-blur-xl flex items-center justify-center backdrop-optimized"
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
            className="p-2 bg-white/80 dark:bg-gray-800 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
          <main className="flex-1 px-6 sm:px-8 lg:px-12 py-2 pt-16 xl:pt-8">
            <div className="max-w-[1500px] mx-auto">
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
      </JobJourneyProvider>
    </RouteGuard>
  );
};

export default DashboardLayout;

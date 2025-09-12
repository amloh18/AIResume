'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import { Bell, Sun, Moon, Settings } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { getPageBackground } from '@/lib/utils/themeUtils';
import DashboardNavigation from '@/components/dashboard/DashboardNavigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { useCVSetup } from '@/lib/hooks/useCVSetup';
import { JobJourneyProvider, useJobJourney } from '@/contexts/JobJourneyContext';
import JourneyStatusBanner from '@/components/JourneyStatusBanner';
import PostOnboardingTour from '@/components/onboarding-universal/PostOnboardingTour';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Inner component that can access JobJourney context
const DashboardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [showTour, setShowTour] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasCV, isChecking } = useCVSetup();

  // Check for tour parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tour') === 'true') {
      setShowTour(true);
      // Remove tour parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const { state } = useJobJourney();
  const isBannerVisible = state.isJourneyActive;

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

  // Listen for user profile updates
  useEffect(() => {
    const handleUserProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail.user;
      setUser(prev => ({
        ...prev,
        name: updatedUser.firstName + ' ' + updatedUser.lastName,
        email: updatedUser.email,
        username: updatedUser.username,
        profilePhoto: updatedUser.avatar || updatedUser.profilePhoto
      }));
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    };
  }, []);

  // Fetch user data including subscription and username
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (session?.user?.email) {
          console.log('🔍 Dashboard Layout - Fetching user data for:', session.user.email);
          
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const userData = await response.json();
            console.log('🔍 Dashboard Layout - User data fetched:', userData);
            
            if (userData.success && userData.user) {
              setUser(prev => ({
                ...prev,
                name: userData.user.firstName + ' ' + userData.user.lastName,
                email: userData.user.email,
                username: userData.user.username,
                profilePhoto: userData.user.avatar || userData.user.profilePhoto,
                subscription: userData.user.subscription || prev.subscription
              }));
            }
          } else {
            console.log('🔍 Dashboard Layout - Failed to fetch user data, status:', response.status);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [session?.user?.email]);

  // Handle authentication and redirects
  useEffect(() => {
    const handleAuthAndRedirects = async () => {
      // Check if user is authenticated
      if (status === 'loading' || isChecking) {
        console.log('🔍 Dashboard Layout - Still loading, waiting...', { status, isChecking });
        return; // Still loading
      }

      if (status === 'unauthenticated') {
        console.log('🔍 Dashboard Layout - User not authenticated');
        
        // Check if there's a Firebase user in sessionStorage
        try {
          const firebaseUser = sessionStorage.getItem('firebaseUser');
          if (firebaseUser) {
            console.log('🔍 Dashboard Layout - Firebase user found');
            const parsedUser = JSON.parse(firebaseUser);
            console.log('🔍 Dashboard Layout - Firebase user found:', parsedUser);
            // User is authenticated via Firebase, allow access
            return;
          }
        } catch (error) {
          console.log('🔍 Dashboard Layout - Error parsing Firebase user:', error);
        }

        console.log('🔄 Dashboard Layout - User not authenticated, redirecting to auth');
        router.push('/auth');
        return;
      }

      // Check if user just completed onboarding
      const fromOnboarding = sessionStorage.getItem('fromOnboarding');
      if (fromOnboarding === 'true') {
        console.log('🎉 Dashboard Layout - User completed onboarding, showing welcome animation');
        setShowWelcomeAnimation(true);
        
        // Clear the flag after using it
        sessionStorage.removeItem('fromOnboarding');
        return;
      }
      
      console.log('🔍 Dashboard Layout - Checking CV setup...', { hasCV, isChecking });
      
      // Check if user needs to complete CV setup
      if (!isChecking && !hasCV) {
        console.log('🔍 Dashboard Layout - User needs CV setup');
        
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const userData = await response.json();
            if (userData.success && userData.user) {
              const needsCVSetup = userData.user.needsCVSetup;
              console.log('🔍 Dashboard Layout - User needs CV setup:', needsCVSetup);
              
              if (needsCVSetup) {
                console.log('🔄 Dashboard Layout - needsCVSetup is true, redirecting to onboarding');
                router.push('/onboarding');
                return;
              }
            }
          }
        } catch (error) {
          console.error('🔍 Dashboard Layout - Error checking CV setup:', error);
        }
      }
    };

    handleAuthAndRedirects();
  }, [status, hasCV, isChecking, router]);

  // Get active section from pathname
  const getActiveSection = () => {
    if (pathname === '/dashboard') return 'analytics';
    const pathSegments = pathname.split('/');
    return pathSegments[2] || 'analytics'; // /dashboard/[section]
  };

  const handleSectionChange = (section: string) => {
    console.log('🔄 Dashboard Layout - Section change requested:', section);
    if (section === 'analytics') {
      router.push('/dashboard', { scroll: false });
    } else {
      router.push(`/dashboard/${section}`, { scroll: false });
    }
  };

  return (
    <div className={getPageBackground('dashboard')}>
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
                className="text-lg text-white/80 max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                Your personalized CV creation journey starts here. Let's build something amazing together!
              </motion.p>
              
              <motion.button
                onClick={() => setShowWelcomeAnimation(false)}
                className="px-8 py-3 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-xl transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Get Started
              </motion.button>
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


      {/* Journey Status Banner - Full Width Above Everything */}
      <JourneyStatusBanner />
      
      {/* Post-Onboarding Tour */}
      <PostOnboardingTour 
        isActive={showTour} 
        onComplete={() => setShowTour(false)} 
      />
      
      <div className={`flex min-h-screen transition-all duration-300 ${isBannerVisible ? 'pt-16' : 'pt-0'}`}>
        {/* Sidebar */}
        <DashboardNavigation
          activeSection={getActiveSection()}
          onSectionChange={handleSectionChange}
          onMembershipClick={() => {}}
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isBannerVisible={isBannerVisible}
        />

        {/* Main Dashboard Area */}
        <main className="flex-1 xl:ml-80 transition-all duration-300 ease-in-out">
          <div className="p-4 xl:p-6">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="max-w-[1400px] mx-auto"
              data-tour="welcome"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <RouteGuard requireAuth={true}>
      <JobJourneyProvider>
        <DashboardContent children={children} />
      </JobJourneyProvider>
    </RouteGuard>
  );
};

export default DashboardLayout;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  BarChart3, Target, FileText,
  Sparkles, Bell, Sun, Moon, Menu, X, Shield, Settings, LogOut, User, ChevronDown, Clock, Zap, AlertCircle
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
import { useRoutePreloader } from '@/lib/services/routePreloader';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import UserAvatar from '@/components/ui/UserAvatar';
import { comprehensiveSignOut } from '@/lib/utils/signout';

const OptimizedNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isMobileMenuOpen, toggleSidebar, setIsOpen } = useMobileSidebar();
  const { userData } = useUserData();
  const { preloadOnHover } = useRoutePreloader();
  const [activeSection, setActiveSection] = useState('analytics');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [creditInfo, setCreditInfo] = useState<{ remaining: number; limit: number } | null>(null);
  const [creditInfoLoading, setCreditInfoLoading] = useState(true);
  
  // Update time every minute for day pass countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch credit information for free and day pass plan users
  useEffect(() => {
    const fetchCreditInfo = async () => {
      const planKey = userData?.currentPlanKey || 'free';
      
      // Only fetch credits for free and day_pass plans
      if ((planKey === 'free' || planKey === 'day_pass') && userData?.id) {
        setCreditInfoLoading(true);
        try {
          // Fetch credit status from the new credit system
          const response = await fetch('/api/user/usage-limits');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.credits) {
              // Only set credit info if we have actual data from API
              const limit = data.credits.limit;
              const remaining = data.credits.remaining;
              
              // Verify we have valid credit data (not fallback values)
              if (limit !== undefined && remaining !== undefined) {
                setCreditInfo({ remaining, limit });
                setCreditInfoLoading(false);
              } else {
                // Invalid data, don't show card
                setCreditInfo(null);
                setCreditInfoLoading(false);
              }
            } else {
              // No credit data in response, don't show card
              setCreditInfo(null);
              setCreditInfoLoading(false);
            }
          } else {
            // API error, don't show card
            setCreditInfo(null);
            setCreditInfoLoading(false);
          }
        } catch (error) {
          console.error('Error fetching credit info:', error);
          // Don't show card on error
          setCreditInfo(null);
          setCreditInfoLoading(false);
        }
      } else if (planKey !== 'free' && planKey !== 'day_pass') {
        // Clear credit info for pro plans (unlimited)
        setCreditInfo(null);
        setCreditInfoLoading(false);
      } else {
        // No user data yet, still loading
        setCreditInfoLoading(true);
      }
    };

    fetchCreditInfo();
  }, [userData?.currentPlanKey, userData?.id]);

  // Check if user is admin
  const isAdmin = userData?.role === 'admin';

  // Prefetch routes on mount for faster navigation
  useEffect(() => {
    const routesToPrefetch = [
      '/dashboard',
      '/dashboard/career-report',
      '/dashboard/application-tracker',
      '/dashboard/canvas',
      '/dashboard/settings'
    ];
    
    // Prefetch all dashboard routes for instant navigation
    routesToPrefetch.forEach(route => {
      router.prefetch(route);
    });
  }, [router]);

  // Update active section based on current path
  useEffect(() => {
    if (pathname === '/dashboard') {
      setActiveSection('analytics');
    } else if (pathname.includes('/career-report')) {
      setActiveSection('career-report');
    } else if (pathname.includes('/application-tracker')) {
      setActiveSection('application-tracker');
    } else if (pathname.includes('/canvas')) {
      setActiveSection('canvas');
    } else if (pathname.includes('/settings')) {
      setActiveSection('settings');
    }
  }, [pathname]);

  // Immediate navigation without waiting for content
  const handleNavigation = useCallback((sectionId: string) => {
    // Update active section immediately for instant feedback
    setActiveSection(sectionId);
    
    // Close mobile sidebar if open
    if (isMobileMenuOpen) {
      setIsOpen(false);
    }
    
    // Navigate immediately
    const routes = {
      'analytics': '/dashboard',
      'career-report': '/dashboard/career-report',
      'application-tracker': '/dashboard/application-tracker',
      'canvas': '/dashboard/canvas',
      'settings': '/dashboard/settings'
    };
    
    const targetRoute = routes[sectionId as keyof typeof routes];
    if (targetRoute) {
      // Prefetch route if not already prefetched
      router.prefetch(targetRoute);
      // Use replace to avoid back button issues and ensure immediate navigation
      router.replace(targetRoute);
    }
  }, [router, isMobileMenuOpen, setIsOpen]);

  // Handle sign out
  const handleSignOut = async () => {
    if (isMobileMenuOpen) {
      setIsOpen(false);
    }
    await comprehensiveSignOut();
  };

  // Handle settings navigation
  const handleSettingsClick = () => {
    if (isMobileMenuOpen) {
      setIsOpen(false);
    }
    router.push('/dashboard/settings');
  };

  // Handle profile navigation
  const handleProfileClick = () => {
    if (isMobileMenuOpen) {
      setIsOpen(false);
    }
    router.push('/dashboard/settings?tab=account');
  };

  const sections = [
    { 
      id: 'analytics', 
      name: 'Analytics', 
      icon: BarChart3, 
      description: 'Progress Tracking',
      route: '/dashboard'
    },
    { 
      id: 'career-report', 
      name: 'Career Report', 
      icon: Sparkles, 
      description: 'AI Career Insights',
      route: '/dashboard/career-report'
    },
    { 
      id: 'application-tracker', 
      name: 'Application Tracker', 
      icon: Target, 
      description: 'Manage jobs with integrated CV journeys',
      route: '/dashboard/application-tracker'
    },
    { 
      id: 'canvas', 
      name: 'CV Studio', 
      icon: FileText, 
      description: 'Saved CV/Cover Letters',
      route: '/dashboard/canvas'
    }
  ];

  return (
    <div className="flex flex-col h-full m-0 lg:m-1 2xl:m-2 bg-white dark:bg-[#141810] rounded-none lg:rounded-2xl shadow-none lg:shadow-lg overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between p-6 lg:p-4 lg:justify-center 2xl:p-6 2xl:justify-start border-b border-gray-200 dark:border-gray-700 lg:border-b-0">
        <motion.button
          onClick={() => {
            if (isMobileMenuOpen) {
              setIsOpen(false);
            }
            router.push('/dashboard');
          }}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Logo Icon */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg bg-white dark:bg-[#1a2015] p-1">
            <Image 
              src="/images/logo.png" 
              alt="CVCircle Logo" 
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
              unoptimized
            />
          </div>
          {/* Logo Text - Hidden on lg/xl, visible on sm/md (hamburger) and 2xl+ */}
          <div className="flex items-center lg:hidden 2xl:flex">
            <span className="text-2xl font-bold text-lime-500 dark:text-[rgb(129,255,0)]">CV</span><span className="text-2xl font-bold text-gray-600 dark:text-gray-300">Circle</span>
          </div>
        </motion.button>
        
        {/* Close Button - Only visible on mobile */}
        <motion.button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors p-2 -mr-2"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-2 lg:p-2 lg:space-y-1 2xl:p-4 2xl:space-y-1 overflow-y-auto">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <motion.button
              key={section.id}
              onClick={() => handleNavigation(section.id)}
              onMouseEnter={() => {
                // Prefetch route and preload component on hover for instant navigation
                router.prefetch(section.route);
                preloadOnHover(section.id);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 lg:px-3 lg:py-3 rounded-xl transition-all duration-200 text-left lg:justify-center 2xl:px-4 2xl:justify-start ${
                isActive
                  ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0 lg:hidden 2xl:block">
                <div className="text-base lg:text-sm font-medium truncate flex items-baseline gap-1">
                  {section.name}
                  {section.id === 'career-report' && (
                    <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 leading-none align-super">(beta)</span>
                  )}
                </div>
                <div className="text-sm lg:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {section.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Admin Button - Only show for admin users */}
      {isAdmin && (
        <div className="px-6 pb-4 lg:px-2 2xl:px-4">
          <motion.button
            onClick={() => {
              if (isMobileMenuOpen) {
                setIsOpen(false);
              }
              router.push('/admin');
            }}
            className="w-full flex items-center gap-4 px-5 py-4 lg:px-3 lg:py-3 rounded-xl transition-all duration-200 text-left lg:justify-center 2xl:px-4 2xl:justify-start bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Shield className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0 lg:hidden 2xl:block">
              <div className="text-base lg:text-sm font-medium truncate">Switch to Admin</div>
              <div className="text-sm lg:text-xs text-purple-600 dark:text-purple-300 truncate mt-0.5">
                Access admin dashboard
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Membership Card - Persistent for free and day pass only */}
      <div className="px-4 pb-3">
        {(() => {
          const currentPlan = userData?.subscription?.planKey || userData?.currentPlanKey || 'free';
          const planStatus = userData?.subscription?.status || 'active';
          
          // Only show for free and day_pass plans
          if (currentPlan !== 'free' && currentPlan !== 'day_pass') {
            return null;
          }
          
          // Don't show card if credit info is still loading or not available
          if (creditInfoLoading || !creditInfo) {
            return null;
          }
          
          // Calculate time remaining for day pass (updates with currentTime state)
          const getTimeRemaining = () => {
            if (currentPlan !== 'day_pass') return null;
            
            const accessExpiresAt = userData?.subscription?.accessExpiresAt;
            if (!accessExpiresAt) return null;
            
            const expiryDate = new Date(accessExpiresAt);
            const diffTime = expiryDate.getTime() - currentTime.getTime();
            
            if (diffTime <= 0) return { hours: 0, minutes: 0 };
            
            const hours = Math.floor(diffTime / (1000 * 60 * 60));
            const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
            
            return { hours, minutes };
          };
          
          const timeRemaining = getTimeRemaining();
          const isDayPass = currentPlan === 'day_pass';
          const isExpired = isDayPass && timeRemaining && timeRemaining.hours === 0 && timeRemaining.minutes === 0;
          
          // Urgency indicators
          const isUrgent = isDayPass && timeRemaining && timeRemaining.hours < 3;
          
          // Free plan card
          if (currentPlan === 'free') {
            const remaining = creditInfo.remaining;
            const limit = creditInfo.limit;
            const isUnlimited = limit === -1;
            const hasCredits = isUnlimited || remaining > 0;
            
            return (
              <div className="hidden 2xl:block rounded-2xl p-3 text-white border-2 border-white/20" style={{ backgroundColor: '#603a86' }}>
                <div className="text-sm font-semibold mb-2">
                  Your Free Plan
                </div>
                
                <div className="text-xs text-white/95 mb-3">
                  {isUnlimited ? (
                    <span>You have <span className="font-bold">Unlimited</span> job credits.</span>
                  ) : (
                    <span>You have <span className="font-bold">{remaining}</span> of <span className="font-bold">{limit}</span> job credit{limit !== 1 ? 's' : ''} left this month.</span>
                  )}
                </div>
                
                {!hasCredits && (
                  <div className="text-xs text-yellow-300 mb-2 font-medium">
                    ⚠️ Credits exhausted. Upgrade to continue creating jobs.
                  </div>
                )}
                
                <div className="text-xs font-semibold mb-1.5">
                  Go Pro to get:
                </div>
                
                <ul className="text-xs text-white/90 space-y-0.5 mb-3">
                  <li>• Unlimited job creation</li>
                  <li>• Unlimited CVs & cover letters</li>
                  <li>• Unlimited ATS checks per job</li>
                  <li>• Premium templates</li>
                  <li>• Priority support</li>
                </ul>
                
                <motion.button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Zap className="w-3 h-3" />
                  Upgrade
                </motion.button>
              </div>
            );
          }
          
          // Day pass card
          const dayPassRemaining = creditInfo.remaining;
          const dayPassLimit = creditInfo.limit;
          const dayPassIsUnlimited = dayPassLimit === -1;
          const dayPassHasCredits = dayPassIsUnlimited || dayPassRemaining > 0;
          
          return (
            <motion.div 
              className={`bg-gradient-to-r ${isUrgent ? 'from-red-500 to-red-600' : 'from-orange-500 to-orange-600'} rounded-2xl p-3 text-white border-2 ${isUrgent ? 'border-red-300' : 'border-white/20'}`}
              animate={isUrgent ? { 
                boxShadow: ['0 0 0px rgba(239, 68, 68, 0.4)', '0 0 12px rgba(239, 68, 68, 0.6)', '0 0 0px rgba(239, 68, 68, 0.4)']
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {isUrgent && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
                  <div className="text-sm font-semibold">
                    Day Pass
                  </div>
                </div>
                {timeRemaining && (
                  <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                    isUrgent ? 'bg-red-400/30' : 'bg-white/20'
                  }`}>
                    <Clock className="w-3 h-3" />
                    <span>
                      {isExpired ? 'Expired' : `${timeRemaining.hours}h ${timeRemaining.minutes}m`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-white/95 mb-2 leading-relaxed">
                {dayPassIsUnlimited ? (
                  <span>You have <span className="font-bold">Unlimited</span> job credits.</span>
                ) : (
                  <span>You have <span className="font-bold">{dayPassRemaining}</span> of <span className="font-bold">{dayPassLimit}</span> job credit{dayPassLimit !== 1 ? 's' : ''} left.</span>
                )}
              </div>
              
              {!dayPassHasCredits && !isExpired && (
                <div className="text-xs text-yellow-200 mb-2 font-medium">
                  ⚠️ Credits exhausted. Upgrade to continue.
                </div>
              )}
              
              <div className="text-xs text-white/95 mb-2.5 leading-relaxed">
                {isUrgent ? (
                  <span className="font-medium">⚠️ Running out! Upgrade now for unlimited access</span>
                ) : (
                  <span>Upgrade for: Unlimited jobs, CVs, ATS checks & exports</span>
                )}
              </div>
              
              <motion.button
                onClick={() => setShowSubscriptionModal(true)}
                className={`w-full text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  isUrgent 
                    ? 'bg-white text-red-600 hover:bg-red-50 shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Zap className="w-3 h-3" />
                {isUrgent ? 'Upgrade Now' : 'Upgrade'}
              </motion.button>
            </motion.div>
          );
        })()}
      </div>

      {/* User Profile Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 overflow-visible relative">
        {/* Mobile: Individual buttons for Settings, Theme, and Sign Out */}
        <div className="lg:hidden p-6 space-y-2">
          {/* Settings Button */}
          <motion.button
            onClick={handleSettingsClick}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Settings className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium truncate">Settings</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                Manage your account
              </div>
            </div>
          </motion.button>

          {/* Theme Toggle Button */}
          <motion.button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {theme === 'dark' ? (
              <Sun className="w-6 h-6 flex-shrink-0" />
            ) : (
              <Moon className="w-6 h-6 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium truncate">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                Switch theme
              </div>
            </div>
          </motion.button>

          {/* Sign Out Button */}
          <motion.button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-base font-medium truncate">Sign Out</div>
              <div className="text-sm text-red-500 dark:text-red-400 truncate mt-0.5">
                Log out of your account
              </div>
            </div>
          </motion.button>
        </div>

        {/* Desktop xl+: Collapsible menu above avatar */}
        <div className="hidden lg:block">
          {/* Menu Items - Above Avatar */}
          <AnimatePresence>
            {isUserMenuExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2 xl:p-3 2xl:p-4 space-y-1">
                  {/* View Profile - Only show on 2xl+ */}
                  <motion.button
                    onClick={handleProfileClick}
                    className="hidden 2xl:flex w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">View Profile</div>
                    </div>
                  </motion.button>

                  {/* Settings */}
                  <motion.button
                    onClick={handleSettingsClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 xl:justify-center 2xl:justify-start rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 hidden 2xl:block">
                      <div className="text-sm font-medium truncate">Settings</div>
                    </div>
                  </motion.button>

                  {/* Theme - Icon button for xl, toggle for 2xl+ */}
                  {/* xl: Icon button only */}
                  <motion.button
                    onClick={toggleTheme}
                    className="xl:flex 2xl:hidden w-full items-center gap-3 px-3 py-2.5 xl:justify-center rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <Moon className="w-5 h-5 flex-shrink-0" />
                    )}
                  </motion.button>
                  
                  {/* 2xl+: Toggle switch */}
                  <div className="hidden 2xl:flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      ) : (
                        <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-lime-500' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      type="button"
                      aria-label="Toggle theme"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sign Out */}
                  <motion.button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 xl:justify-center 2xl:justify-start rounded-xl transition-all duration-200 text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 hidden 2xl:block">
                      <div className="text-sm font-medium truncate">Sign Out</div>
                    </div>
                  </motion.button>
        </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Avatar - At the bottom, clickable to toggle menu */}
          <div className="p-4 xl:p-3 2xl:p-4">
            <motion.button
              onClick={() => setIsUserMenuExpanded(!isUserMenuExpanded)}
              className="w-full flex items-center gap-3 lg:justify-center lg:gap-0 xl:justify-start xl:gap-3 focus:outline-none rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserAvatar
                src={getUserAvatar(userData)}
                name={getUserDisplayName(userData)}
                size="md"
                className="cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all flex-shrink-0 lg:mx-auto xl:mx-0"
              />
              {/* User Info - Show on xl+ */}
              <div className="flex-1 min-w-0 hidden xl:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getUserDisplayName(userData)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userData?.email || ''}
                </div>
              </div>
              {/* Chevron Icon */}
              <motion.div
                animate={{ rotate: isUserMenuExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 hidden xl:block"
              >
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </motion.div>
            </motion.button>
        </div>
        </div>
      </div>

      {/* Subscription Modal */}
      <UniversalPaymentModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentUserPlan={userData?.subscription?.planKey || 'free'}
      />
    </div>
  );
};

export default OptimizedNavigation;

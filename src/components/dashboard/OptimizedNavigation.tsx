// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import {
  BarChart3, Target, FileText,
  Bell, Sun, Moon, Menu, X, Shield, Settings, LogOut, User, ChevronDown, ChevronRight, ChevronLeft, Clock, Zap, AlertCircle, Briefcase, ExternalLink, Star, PenTool, Wand2, Mic, Linkedin
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
import { useRoutePreloader } from '@/lib/services/routePreloader';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import UserAvatar from '@/components/ui/UserAvatar';
import { comprehensiveSignOut } from '@/lib/utils/signout';
import PaymentPastDueBanner from './PaymentPastDueBanner';
import { getPlanName } from '@/lib/utils/userPlanUtils';
import { useBillingData } from '@/lib/hooks/useBillingData';
import { usePricingPlans } from '@/lib/hooks/usePricingPlans';

const OptimizedNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isMobileMenuOpen, toggleSidebar, setIsOpen, isDesktopExpanded, toggleDesktopSidebar } = useMobileSidebar();
  const { userData } = useUserData();
  const { data: billingData, refetch: refetchBillingData } = useBillingData();
  const { preloadOnHover } = useRoutePreloader();
  // Use pricing plans hook to pass data to modal (avoid duplicate API calls)
  const pricingHookResult = usePricingPlans({ excludeFree: true });
  const [activeSection, setActiveSection] = useState('analytics');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [preselectedPlanKey, setPreselectedPlanKey] = useState<string | undefined>(undefined);
  const [isUserMenuExpanded, setIsUserMenuExpanded] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [creditInfo, setCreditInfo] = useState<{
    remaining: number;
    limit: number;
    used?: number;
    totalCreated?: number;
    planKey?: string;
    nextResetDate?: string | Date;
    resetSchedule?: string;
  } | null>(null);
  const [creditInfoLoading, setCreditInfoLoading] = useState(true);
  const [isAnyPaymentModalOpen, setIsAnyPaymentModalOpen] = useState(false);

  // Update time every minute for annual countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Handle hover to open user menu
  const handleUserMenuMouseEnter = () => {
    // Clear any pending close timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsUserMenuExpanded(true);
  };

  const handleUserMenuMouseLeave = () => {
    // Add a small delay before closing to allow moving mouse to menu
    hoverTimeoutRef.current = setTimeout(() => {
      setIsUserMenuExpanded(false);
    }, 200);
  };

  const handleMenuContentMouseEnter = () => {
    // Clear timeout when mouse enters menu content
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleMenuContentMouseLeave = () => {
    // Close menu when mouse leaves menu content
    setIsUserMenuExpanded(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Check if any UniversalPaymentModal is open (from sidebar or settings)
  useEffect(() => {
    const checkModalOpen = () => {
      // Check for the modal backdrop/overlay - UniversalPaymentModal uses z-[99999]
      // Look for elements with z-index 99999 or the specific backdrop classes
      const modalBackdrop =
        document.querySelector('[class*="z-[99999]"]') ||
        document.querySelector('[class*="z-[9999]"]') ||
        document.querySelector('[style*="z-index: 9999"]') ||
        document.querySelector('[style*="z-index:9999"]') ||
        // Also check for the specific backdrop blur class used by UniversalPaymentModal
        (document.querySelector('.backdrop-blur-sm') &&
          document.querySelector('.fixed.inset-0')?.getAttribute('style')?.includes('z-index: 9999'));

      setIsAnyPaymentModalOpen(!!modalBackdrop);
    };

    // Check immediately
    checkModalOpen();

    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Also check periodically as a fallback (every 200ms to reduce overhead)
    const interval = setInterval(checkModalOpen, 200);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Fetch credit information for membership card
  const fetchCreditInfo = useCallback(async () => {
    if (!userData?.id) {
      setCreditInfo(null);
      setCreditInfoLoading(false);
      return;
    }

    setCreditInfoLoading(true);

    try {
      const response = await fetch('/api/user/usage-limits');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.credits) {
          setCreditInfo(data.credits);
        } else {
          setCreditInfo(null);
        }
      } else {
        setCreditInfo(null);
      }
    } catch (error) {
      console.error('Error fetching credit info:', error);
      setCreditInfo(null);
    } finally {
      setCreditInfoLoading(false);
    }
  }, [userData?.id]);

  // Initial fetch only on mount and when subscription plan changes (not on every userData change)
  useEffect(() => {
    fetchCreditInfo();
  }, [fetchCreditInfo]); // Removed userData dependencies - only fetch on mount and when explicitly requested

  // Listen for credit update events (real-time updates when credits are used)
  useEffect(() => {
    const handleCreditUpdate = () => {
      console.log('🔄 OptimizedNavigation - Credit update event received, refreshing credit info');
      fetchCreditInfo();
    };

    window.addEventListener('creditsUpdated', handleCreditUpdate);

    return () => {
      window.removeEventListener('creditsUpdated', handleCreditUpdate);
    };
  }, [fetchCreditInfo]);

  // Poll for credit updates every 30 seconds when tab is visible
  useEffect(() => {
    if (!userData?.id) return;

    const isDocumentVisible = () => !document.hidden;
    const POLL_INTERVAL = 30000; // 30 seconds

    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (pollInterval) return;

      pollInterval = setInterval(() => {
        if (isDocumentVisible()) {
          fetchCreditInfo();
        }
      }, POLL_INTERVAL);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (isDocumentVisible()) {
        startPolling();
        fetchCreditInfo(); // Immediate fetch when tab becomes visible
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData?.id, fetchCreditInfo]);

  // Check if user is admin
  const isAdmin = userData?.role === 'admin';

  // Prefetch routes on mount for faster navigation
  useEffect(() => {
    const routesToPrefetch = [
      '/dashboard',
      '/dashboard/jobs',
      '/dashboard/settings'
    ];

    // Prefetch all dashboard routes for instant navigation
    routesToPrefetch.forEach(route => {
      router.prefetch(route);
    });
  }, [router]);

  // Update active section based on current path
  useEffect(() => {
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard?')) {
      setActiveSection('analytics');
    } else if (pathname.includes('/jobs')) {
      setActiveSection('jobs-dashboard');
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
      'jobs': '/dashboard/jobs',
      'jobs-dashboard': '/dashboard/jobs',
      'settings': '/dashboard/settings',
      'resume-enhancer': '/editor',
      'cover-letter-generator': '/editor?tab=cover-letters',
      'interview-coach': '/dashboard/interview',
      'linkedin-enhancer': '/linkedin-enhancer',
      'ats-resume-checker': '/ats-resume-checker'
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
      description: 'Tracker, Documents & Analytics',
      route: '/dashboard'
    },
    {
      id: 'jobs-dashboard',
      name: 'Jobs',
      icon: Zap,
      description: 'Job matching & automation (Beta)',
      route: '/dashboard/jobs',
      badge: 'BETA'
    },
  ];

  const toolSections = [
    {
      id: 'resume-enhancer',
      name: 'Editor',
      icon: Target,
      description: 'AI-powered CV optimization',
      route: '/editor'
    },
    {
      id: 'cover-letter-generator',
      name: 'Cover Letter Generator',
      icon: PenTool,
      description: 'Create custom cover letters',
      route: '/editor?tab=cover-letters'
    },
    {
      id: 'interview-coach',
      name: 'Interview Coach',
      icon: Mic,
      description: 'AI interview preparation',
      route: '/dashboard/interview'
    },
    {
      id: 'linkedin-enhancer',
      name: 'LinkedIn Enhancer',
      icon: Linkedin,
      description: 'Optimize your LinkedIn profile',
      route: '/linkedin-enhancer',
      badge: 'NEW'
    },
    {
      id: 'extension',
      name: 'Chrome Extension',
      icon: ExternalLink,
      description: 'Save jobs from any site',
      route: 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=item-share-cb',
      external: true
    }
  ];

  return (
    <div className={`flex flex-col h-full m-0 bg-transparent rounded-none shadow-none overflow-visible pointer-events-auto relative`}>
      {/* Desktop Toggle Button - Positioned exactly on the right border */}
      <button
        onClick={toggleDesktopSidebar}
        className="hidden lg:flex absolute -right-[13px] top-6 bg-white dark:bg-[#141810] border border-gray-200 dark:border-gray-700 rounded-full p-1 z-50 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-transform hover:scale-110"
        aria-label={isDesktopExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isDesktopExpanded ? <ChevronLeft className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>

      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 lg:border-b-0 ${isDesktopExpanded ? 'lg:p-6 lg:justify-start' : 'lg:p-4 lg:justify-center'} relative`}>
        <motion.button
          onClick={() => {
            handleNavigation('analytics');
          }}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Home Dashboard"
        >
          {/* Logo Icon & Text */}
          <div className="flex items-center">
            <div className={`flex items-center ${!isDesktopExpanded ? 'lg:hidden' : ''}`}>
              <Logo size="md" />
            </div>
            <div className={`hidden ${!isDesktopExpanded ? 'lg:flex' : ''}`}>
              <Logo size="md" />
            </div>
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
      <nav className={`flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide ${isDesktopExpanded ? 'lg:p-4 lg:space-y-1' : 'lg:p-2 lg:space-y-1'}`}>
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const isExternal = (section as any).external === true;

          const Component = isExternal ? motion.a : motion.button;
          const componentProps = isExternal
            ? {
              href: section.route,
              target: '_blank',
              rel: 'noopener noreferrer',
              onClick: () => {
                if (isMobileMenuOpen) {
                  setIsOpen(false);
                }
              }
            }
            : {
              onClick: () => handleNavigation(section.id),
              onMouseEnter: () => {
                // Prefetch route and preload component on hover for instant navigation (only for internal routes)
                if (!isExternal && section.route.startsWith('/')) {
                  router.prefetch(section.route);
                  preloadOnHover(section.id);
                }
              }
            };

          return (
            <Component
              key={section.id}
              {...componentProps}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left outline-none focus:outline-none focus:ring-0 focus:shadow-none hover:shadow-none !shadow-none ${isDesktopExpanded ? 'lg:px-4 lg:py-3 lg:justify-start' : 'lg:px-3 lg:py-3 lg:justify-center'} ${isActive
                ? 'bg-[#1a230f] dark:bg-[#1a230f] border border-[rgb(129,255,0)] text-[rgb(129,255,0)]'
                : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              style={{ outline: 'none', boxShadow: 'none' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className={`w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0 ${isActive ? 'text-[rgb(129,255,0)]' : ''}`} />
              <div className={`flex-1 min-w-0 ${!isDesktopExpanded ? 'lg:hidden' : ''}`}>
                <div className="text-base lg:text-sm font-medium truncate flex items-baseline gap-1">
                  {section.name}
                  {isExternal && <ExternalLink className="w-3 h-3 opacity-60" />}
                </div>
                <div className={`text-sm lg:text-[11px] truncate mt-0.5 ${isActive
                  ? 'text-[rgb(129,255,0)]/70'
                  : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {section.description}
                </div>
              </div>
            </Component>
          );
        })}


        {/* Tools Section */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 px-2">
          <div className={`px-3 mb-2 ${!isDesktopExpanded ? 'hidden lg:hidden' : 'lg:block'}`}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tools
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {toolSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isExternal = (section as any).external === true;

              const Component = isExternal ? motion.a : motion.button;
              const componentProps = isExternal
                ? {
                  href: section.route,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  onClick: () => {
                    if (isMobileMenuOpen) {
                      setIsOpen(false);
                    }
                  }
                }
                : {
                  onClick: () => handleNavigation(section.id),
                  onMouseEnter: () => {
                    if (!isExternal && section.route.startsWith('/')) {
                      router.prefetch(section.route);
                      preloadOnHover(section.id);
                    }
                  }
                };

              return (
                <Component
                  key={section.id}
                  {...componentProps}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left relative outline-none focus:outline-none focus:ring-0 focus:shadow-none hover:shadow-none !shadow-none ${isDesktopExpanded ? 'lg:px-4 lg:py-3 lg:justify-start' : 'lg:px-3 lg:py-3 lg:justify-center'} ${isActive
                    ? 'bg-[#1a230f] dark:bg-[#1a230f] border border-[rgb(129,255,0)] text-[rgb(129,255,0)]'
                    : 'bg-white dark:bg-[#1f2916] text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
                    }`}
                  style={{ outline: 'none', boxShadow: 'none' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* NEW Badge */}
                  {(section as any).badge && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-lime-500 dark:bg-[#80FF00] text-black rounded-full">
                      {(section as any).badge}
                    </span>
                  )}
                  <Icon className={`w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0 ${isActive ? 'text-[rgb(129,255,0)]' : 'text-gray-500 dark:text-gray-400'}`} />
                  <div className={`flex-1 min-w-0 ${!isDesktopExpanded ? 'lg:hidden' : ''}`}>
                    <div className="text-base lg:text-sm font-medium truncate flex items-baseline gap-1">
                      {section.name}
                      {isExternal && <ExternalLink className="w-3 h-3 opacity-60" />}
                    </div>
                    <div className={`text-sm lg:text-[11px] truncate mt-0.5 ${isActive
                      ? 'text-[rgb(129,255,0)]/70'
                      : 'text-gray-500 dark:text-gray-400'
                      }`}>
                      {section.description}
                    </div>
                  </div>
                </Component>
              );
            })}
          </div>
        </div>
      </nav>

      {/* HR Dashboard Button - Show for B2B users and Admins */}
      {(userData?.b2b?.tenantId || userData?.isB2b || isAdmin) && (
        <div className={`px-6 pb-2 ${isDesktopExpanded ? 'lg:px-4' : 'lg:px-2'}`}>
          <motion.button
            onClick={() => {
              if (isMobileMenuOpen) {
                setIsOpen(false);
              }
              router.push('/b2b/dashboard');
            }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left ${isDesktopExpanded ? 'lg:px-4 lg:justify-start' : 'lg:px-3 lg:py-3 lg:justify-center'} bg-[rgb(129,255,0)]/10 text-[#4C9900] dark:text-[rgb(129,255,0)] hover:bg-[rgb(129,255,0)]/20`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={!isDesktopExpanded ? 'HR Dashboard' : undefined}
          >
            <Briefcase className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
            <div className={`flex-1 min-w-0 ${!isDesktopExpanded ? 'lg:hidden' : ''}`}>
              <div className="text-base lg:text-sm font-medium truncate">HR Dashboard</div>
              <div className="text-sm lg:text-xs opacity-80 truncate mt-0.5">
                Switch to Business Portal
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Admin Button - Only show for admin users */}
      {isAdmin && (
        <div className={`px-6 pb-4 ${isDesktopExpanded ? 'lg:px-4' : 'lg:px-2'}`}>
          <motion.button
            onClick={() => {
              if (isMobileMenuOpen) {
                setIsOpen(false);
              }
              router.push('/admin/dashboard');
            }}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left ${isDesktopExpanded ? 'lg:px-4 lg:justify-start' : 'lg:px-3 lg:py-3 lg:justify-center'} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Shield className="w-6 h-6 lg:w-5 lg:h-5 flex-shrink-0" />
            <div className={`flex-1 min-w-0 ${!isDesktopExpanded ? 'lg:hidden' : ''}`}>
              <div className="text-base lg:text-sm font-medium truncate">Switch to Admin</div>
              <div className="text-sm lg:text-xs text-purple-600 dark:text-purple-300 truncate mt-0.5">
                Access admin dashboard
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Payment Past Due Banner - Show for past_due/unpaid subscriptions */}
      {(() => {
        const planStatus = userData?.subscription?.status || 'active';
        const isPastDue = planStatus === 'past_due' || planStatus === 'unpaid';

        if (isPastDue) {
          return (
            <div className="px-4 pb-3">
              <PaymentPastDueBanner
                amount={userData?.subscription?.purchasePrice}
                currency={userData?.subscription?.purchaseCurrency || 'USD'}
                dueDate={userData?.subscription?.endDate}
              />
            </div>
          );
        }
        return null;
      })()}

      {/* Membership Card - Show for all users on expanded desktop */}
      {!showSubscriptionModal && !isAnyPaymentModalOpen && (
        <div className="px-4 pb-3">
          {(() => {
            // Use billing data subscription as source of truth, fallback to userData
            const subscription = billingData?.subscription;
            const currentPlan = subscription?.planKey || userData?.subscription?.planKey || userData?.currentPlanKey || 'free';
            const planStatus = subscription?.status || userData?.subscription?.status || 'active';

            // Don't show membership card if subscription is past_due (PaymentPastDueBanner handles that)
            if (planStatus === 'past_due' || planStatus === 'unpaid') {
              return null;
            }

            // Don't show card if credit info is still loading or not available
            if (creditInfoLoading || !creditInfo) {
              return null;
            }

            // Calculate time remaining for annual pass (updates with currentTime state)
            const getTimeRemaining = () => {
              if (currentPlan !== 'pro_yearly' && currentPlan !== 'pro_lifetime') return null;

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
            const isAnnual = currentPlan === 'pro_yearly' || currentPlan === 'pro_lifetime';
            const isExpired = isAnnual && timeRemaining && timeRemaining.hours === 0 && timeRemaining.minutes === 0;

            // Urgency indicators
            const isUrgent = isAnnual && timeRemaining && timeRemaining.hours < 3;

            // Use the utility function to get plan display name
            const planDisplayName = (planKey: string) => {
              return getPlanName(planKey as any);
            };

            // Common usage data
            const remaining = creditInfo.remaining;
            const limit = creditInfo.limit;
            const isUnlimited = limit === -1;
            const hasCredits = isUnlimited || remaining > 0;
            const used = creditInfo.used !== undefined
              ? creditInfo.used
              : Math.max(0, (limit > -1 ? limit - remaining : 0));
            const totalCreated = creditInfo.totalCreated ?? used ?? 0;
            const progressPercent = !isUnlimited && limit > 0
              ? Math.min(100, (used / limit) * 100)
              : 0;
            const nextReset = creditInfo.nextResetDate ? new Date(creditInfo.nextResetDate) : null;

            // Free plan card
            if (currentPlan === 'free') {
              // Determine what user can do based on credits
              const canCreateMasterCV = true; // Master CV is always free
              const canAddJob = hasCredits; // Based on job credits
              const canCreateStandaloneCV = true; // Standalone CVs are free (unlimited for free tier)

              return (
                <div className={`hidden ${isDesktopExpanded ? 'lg:block' : ''} rounded-2xl p-3 text-white border-2 border-white/20`} style={{ backgroundColor: '#603a86' }}>
                  <div className="text-sm font-semibold mb-2">
                    Your Free Plan
                  </div>

                  {!isUnlimited && limit > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] text-white/80 mb-1">
                        <span>Job usage</span>
                        <span>{used}/{limit}</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-2 bg-white rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {!hasCredits && (
                    <div className="text-xs text-yellow-300 mb-2 font-medium">
                      ⚠️ Job Tracker requires Pro membership. Upgrade to track jobs.
                    </div>
                  )}

                  <div className="text-xs font-semibold mb-1.5">
                    What you can do:
                  </div>

                  <ul className="text-xs text-white/90 space-y-0.5 mb-3">
                    <li className="flex items-center gap-1.5">
                      {canCreateMasterCV ? '✓' : '✗'}
                      <span className={canCreateMasterCV ? '' : 'opacity-50'}>Create Master CV (Free Forever)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      {canAddJob ? '✓' : '✗'}
                      <span className={canAddJob ? '' : 'opacity-50'}>Add {remaining} more tracked {remaining === 1 ? 'job' : 'jobs'}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      {canCreateStandaloneCV ? '✓' : '✗'}
                      <span className={canCreateStandaloneCV ? '' : 'opacity-50'}>Create 1 standalone CV</span>
                    </li>
                  </ul>

                  <div className="space-y-2">
                    <motion.button
                      onClick={() => {
                        setPreselectedPlanKey('pro_yearly');
                        setShowSubscriptionModal(true);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Star className="w-3 h-3" />
                      Go Yearly
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        setPreselectedPlanKey('pro_monthly');
                        setShowSubscriptionModal(true);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Zap className="w-3 h-3" />
                      Go Monthly
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        setPreselectedPlanKey(undefined);
                        setShowSubscriptionModal(true);
                      }}
                      className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Zap className="w-3 h-3" />
                      View All Plans
                    </motion.button>
                  </div>
                </div>
              );
            }

            // Yearly plan card
            if (currentPlan === 'pro_yearly') {
              return (
                <motion.div
                  className={`hidden ${isDesktopExpanded ? 'lg:block' : ''} bg-gradient-to-r ${isUrgent ? 'from-red-500 to-red-600' : 'from-purple-500 to-purple-600'} rounded-2xl p-3 text-white border-2 ${isUrgent ? 'border-red-300' : 'border-white/20'}`}
                  animate={isUrgent ? {
                    boxShadow: ['0 0 0px rgba(239, 68, 68, 0.4)', '0 0 12px rgba(239, 68, 68, 0.6)', '0 0 0px rgba(239, 68, 68, 0.4)']
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {isUrgent && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
                      <div className="text-sm font-semibold">
                        Yearly Plan
                      </div>
                    </div>
                    {timeRemaining && (
                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isUrgent ? 'bg-red-400/30' : 'bg-white/20'
                        }`}>
                        <Clock className="w-3 h-3" />
                        <span>
                          {isExpired ? 'Expired' : `${timeRemaining.hours}h ${timeRemaining.minutes}m`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-white/95 mb-2 leading-relaxed">
                    <span>We have created tailored CVs/CLs for <span className="font-bold">{totalCreated}</span> {totalCreated === 1 ? 'job' : 'jobs'} for you.</span>
                  </div>

                  {!isUnlimited && limit > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] text-white/85 mb-1">
                        <span>Feature usage</span>
                        <span>{used}/{limit}</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-2 bg-white rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {!hasCredits && !isExpired && (
                    <div className="text-xs text-yellow-200 mb-2 font-medium">
                      ⚠️ Feature limit reached. Upgrade to continue.
                    </div>
                  )}

                  <div className="text-xs text-white/95 mb-2.5 leading-relaxed">
                    {isUrgent ? (
                      <span className="font-medium">Your yearly plan is about to expire. Upgrade to lifetime for permanent access.</span>
                    ) : (
                      <span>Enjoying your yearly access? Upgrade to lifetime to never worry about renewals again!</span>
                    )}
                  </div>

                  <motion.button
                    onClick={() => setShowSubscriptionModal(true)}
                    className={`w-full text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${isUrgent
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
            }

            // Monthly plan card (with upsell)
            if (currentPlan === 'pro_monthly') {
              return (
                <div className={`hidden ${isDesktopExpanded ? 'lg:block' : ''} rounded-2xl p-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-2 border-white/20`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold">Monthly Plan</div>
                      <div className="text-xs text-white/80">Pro subscriber</div>
                    </div>
                    {nextReset && (
                      <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
                        Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/15 rounded-xl p-3 mb-2">
                    <div className="text-xs text-white/80 mb-0.5">
                      Jobs created this month
                    </div>
                    <div className="text-xl font-bold">
                      {totalCreated}
                    </div>
                    <div className="text-[10px] text-white/70 mt-0.5">
                      Unlimited access
                    </div>
                  </div>

                  <div className="text-xs text-white/90 mb-2.5 leading-relaxed">
                    <span className="font-medium">💡 Save up to 40% with quarterly or yearly plans!</span>
                  </div>

                  <motion.button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Zap className="w-3 h-3" />
                    Upgrade & Save
                  </motion.button>
                </div>
              );
            }

            // Quarterly plan card (no upsell)
            if (currentPlan === 'pro_quarterly') {
              return (
                <div className={`hidden ${isDesktopExpanded ? 'lg:block' : ''} rounded-2xl p-3 bg-gradient-to-br from-green-500 to-green-600 text-white border-2 border-white/20`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold">Quarterly Plan</div>
                      <div className="text-xs text-white/80">Pro subscriber</div>
                    </div>
                    {nextReset && (
                      <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
                        Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/15 rounded-xl p-3 mb-2">
                    <div className="text-xs text-white/80 mb-0.5">
                      Jobs created this quarter
                    </div>
                    <div className="text-xl font-bold">
                      {totalCreated}
                    </div>
                    <div className="text-[10px] text-white/70 mt-0.5">
                      Unlimited access
                    </div>
                  </div>

                  <div className="text-xs text-white/90 leading-relaxed">
                    <span>Quarterly plan • Unlimited job creation & CV/CL generation</span>
                  </div>
                </div>
              );
            }

            // Yearly plan card (no upsell, best value badge)
            if (currentPlan === 'pro_lifetime') {
              return (
                <div className={`hidden ${isDesktopExpanded ? 'lg:block' : ''} rounded-2xl p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white border-2 border-amber-300/50 relative overflow-hidden`}>
                  {/* Best Value Badge */}
                  <div className="absolute -right-8 top-2 bg-white/20 text-white text-[9px] font-bold px-8 py-0.5 rotate-45 transform">
                    BEST VALUE
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold">Yearly Plan</div>
                      <div className="text-xs text-white/80">Pro subscriber</div>
                    </div>
                    {nextReset && (
                      <div className="text-[10px] text-white/70 bg-white/10 px-2 py-1 rounded-full">
                        Renews {nextReset.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/15 rounded-xl p-3 mb-2">
                    <div className="text-xs text-white/80 mb-0.5">
                      Jobs created this year
                    </div>
                    <div className="text-xl font-bold">
                      {totalCreated}
                    </div>
                    <div className="text-[10px] text-white/70 mt-0.5">
                      Unlimited access
                    </div>
                  </div>

                  <div className="text-xs text-white/90 leading-relaxed">
                    <span>Annual plan • Best value with unlimited access all year</span>
                  </div>
                </div>
              );
            }

            // Fallback for any other plan types
            return null;
          })()}
        </div>
      )}

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
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 outline-none focus:outline-none focus:ring-0 focus:shadow-none hover:shadow-none !shadow-none"
            style={{ outline: 'none', boxShadow: 'none' }}
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
            className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200 text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 outline-none focus:outline-none focus:ring-0 focus:shadow-none hover:shadow-none !shadow-none"
            style={{ outline: 'none', boxShadow: 'none' }}
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
                onMouseEnter={handleMenuContentMouseEnter}
                onMouseLeave={handleMenuContentMouseLeave}
              >
                <div className={`p-2 xl:p-3 ${isDesktopExpanded ? 'lg:p-4' : ''} space-y-1`}>
                  {/* View Profile - Only show on expanded desktop */}
                  <motion.button
                    onClick={handleProfileClick}
                    className={`hidden ${isDesktopExpanded ? 'lg:flex' : ''} w-full items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50`}
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
                    className={`w-full flex items-center gap-3 px-3 py-2.5 ${isDesktopExpanded ? 'lg:justify-start' : 'lg:justify-center'} rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    <div className={`flex-1 min-w-0 hidden ${isDesktopExpanded ? 'lg:block' : ''}`}>
                      <div className="text-sm font-medium truncate">Settings</div>
                    </div>
                  </motion.button>

                  {/* B2B Dashboard (Removed from here, now in bottom section) */}
                  
                  {/* Theme - Icon button for xl, toggle for expanded desktop */}
                  {/* xl: Icon button only */}
                  <motion.button
                    onClick={toggleTheme}
                    className={`lg:flex ${isDesktopExpanded ? 'lg:hidden' : ''} w-full items-center gap-3 px-3 py-2.5 lg:justify-center rounded-xl transition-all duration-200 text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50`}
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

                  {/* expanded desktop: Toggle switch */}
                  <div className={`hidden ${isDesktopExpanded ? 'lg:flex' : ''} items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
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
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 cursor-pointer ${theme === 'dark'
                        ? 'bg-lime-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      type="button"
                      aria-label="Toggle theme"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Sign Out */}
                  <motion.button
                    onClick={handleSignOut}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 ${isDesktopExpanded ? 'lg:justify-start' : 'lg:justify-center'} rounded-xl transition-all duration-200 text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <div className={`flex-1 min-w-0 hidden ${isDesktopExpanded ? 'lg:block' : ''}`}>
                      <div className="text-sm font-medium truncate">Sign Out</div>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Avatar - At the bottom, clickable to toggle menu */}
          <div className={`p-4 xl:p-3 ${isDesktopExpanded ? 'lg:p-4' : ''}`}>
            <motion.button
              onClick={() => setIsUserMenuExpanded(!isUserMenuExpanded)}
              onMouseEnter={handleUserMenuMouseEnter}
              onMouseLeave={handleUserMenuMouseLeave}
              className={`w-full flex items-center focus:outline-none rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors p-2 ${isDesktopExpanded ? 'lg:justify-start lg:gap-3 gap-3' : 'lg:justify-center lg:gap-0 gap-3'}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserAvatar
                src={getUserAvatar(userData)}
                name={getUserDisplayName(userData)}
                size="sm"
                className={`cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all flex-shrink-0 ${isDesktopExpanded ? 'lg:mx-0' : 'lg:mx-auto'}`}
              />
              {/* User Info - Only show when sidebar is fully expanded */}
              <div className={`flex-1 min-w-0 hidden ${isDesktopExpanded ? 'lg:block' : ''}`}>
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getUserDisplayName(userData)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userData?.email || ''}
                </div>
              </div>
              {/* Chevron Icon - Only show when sidebar is fully expanded */}
              <motion.div
                animate={{ rotate: isUserMenuExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className={`flex-shrink-0 hidden ${isDesktopExpanded ? 'lg:block' : ''}`}
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
        onClose={() => {
          setShowSubscriptionModal(false);
          setPreselectedPlanKey(undefined);
        }}
        preselectedPlanKey={preselectedPlanKey}
        // Use billing data subscription as source of truth, fallback to userData
        currentUserPlan={billingData?.subscription?.planKey || userData?.subscription?.planKey || userData?.currentPlanKey || 'free'}
        onSuccess={() => {
          setShowSubscriptionModal(false);
          setPreselectedPlanKey(undefined);
          refetchBillingData();
          // Refresh user data to update plan info
          if (userData) {
            window.dispatchEvent(new CustomEvent('userProfileUpdated', {
              detail: { refreshUserData: true }
            }));
          }
        }}
        // Pass pricing data to avoid duplicate API calls
        plans={pricingHookResult.plans}
        promotionalOffers={pricingHookResult.promotionalOffers}
        locationData={pricingHookResult.locationData}
        regionalPricing={pricingHookResult.regionalPricing}
        getRegionalPrice={pricingHookResult.getRegionalPrice}
        getMonthlyEquivalent={pricingHookResult.getMonthlyEquivalent}
        getCurrencySymbol={pricingHookResult.getCurrencySymbol}
        getEffectivePrice={pricingHookResult.getEffectivePrice}
        hasPromotionalPricing={pricingHookResult.hasPromotionalPricing}
      />
    </div>
  );
};

export default OptimizedNavigation;

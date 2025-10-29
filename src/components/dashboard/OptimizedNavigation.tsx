'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BarChart3, Target, Route, FileText,
  Sparkles, Bell, Sun, Moon, Menu, X, Shield
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
import { useRoutePreloader } from '@/lib/services/routePreloader';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

const OptimizedNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData } = useUserData();
  const { preloadOnHover } = useRoutePreloader();
  const [activeSection, setActiveSection] = useState('analytics');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Check if user is admin
  const isAdmin = userData?.role === 'admin';

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
    } else if (pathname.includes('/application-journey')) {
      setActiveSection('application-journey');
    } else if (pathname.includes('/settings')) {
      setActiveSection('settings');
    }
  }, [pathname]);

  // Immediate navigation without waiting for content
  const handleNavigation = useCallback((sectionId: string) => {
    // Update active section immediately for instant feedback
    setActiveSection(sectionId);
    
    // Navigate immediately
    const routes = {
      'analytics': '/dashboard',
      'career-report': '/dashboard/career-report',
      'application-tracker': '/dashboard/application-tracker',
      'canvas': '/dashboard/canvas',
      'application-journey': '/dashboard/application-journey',
      'settings': '/dashboard/settings'
    };
    
    const targetRoute = routes[sectionId as keyof typeof routes];
    if (targetRoute) {
      // Use replace to avoid back button issues and ensure immediate navigation
      router.replace(targetRoute);
    }
  }, [router]);

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
      id: 'application-journey', 
      name: 'Application Journey', 
      icon: Route, 
      description: 'Guided Application Process',
      route: '/dashboard/application-journey'
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
    <div className="flex flex-col h-full m-4 bg-white dark:bg-[#141810] rounded-2xl shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-start p-6">
        <motion.button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Logo Icon */}
          <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
              <path d="M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
            </svg>
          </div>
          {/* Logo Text */}
          <div className="flex items-center">
            <span className="text-2xl font-bold text-lime-500">CV</span><span className="text-2xl font-bold text-gray-400">Circle</span>
          </div>
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <motion.button
              key={section.id}
              onClick={() => handleNavigation(section.id)}
              onMouseEnter={() => preloadOnHover(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                isActive
                  ? 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-400'
                  : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{section.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {section.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* Admin Button - Only show for admin users */}
      {isAdmin && (
        <div className="px-4 pb-4">
          <motion.button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">Switch to Admin</div>
              <div className="text-xs text-purple-600 dark:text-purple-300 truncate">
                Access admin dashboard
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* Membership Card */}
      <div className="p-4">
        {(() => {
          const currentPlan = userData?.subscription?.planKey || 'free';
          const planName = userData?.subscription?.planName || 'Free Plan';
          const planStatus = userData?.subscription?.status || 'active';
          const endDate = userData?.subscription?.endDate;
          const isPaidPlan = currentPlan !== 'free';
          
          // Calculate days until expiry for monthly plans
          const getDaysUntilExpiry = (endDate: string) => {
            if (!endDate) return null;
            const expiryDate = new Date(endDate);
            const now = new Date();
            const diffTime = expiryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
          };
          
          const daysUntilExpiry = endDate ? getDaysUntilExpiry(endDate) : null;
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
          
          // Don't show card for yearly plans (they're stable)
          if (currentPlan === 'pro_yearly') {
            return null;
          }
          
          // Don't show card for inactive free plans (they should upgrade)
          if (currentPlan === 'free' && planStatus !== 'active') {
            return null;
          }
          
          // Get plan-specific styling and upgrade suggestions
          const getPlanStyling = (planKey: string, isExpiring: boolean) => {
            switch (planKey) {
              case 'pro_monthly':
                return {
                  gradient: isExpiring ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600',
                  buttonText: isExpiring ? 'Upgrade to Yearly' : 'Manage Plan',
                  description: isExpiring 
                    ? `Expires in ${daysUntilExpiry} days - Save 20% with yearly plan!`
                    : 'Professional features unlocked'
                };
              case 'pro_quarterly':
                return {
                  gradient: isExpiring ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600',
                  buttonText: isExpiring ? 'Upgrade to Yearly' : 'Manage Plan',
                  description: isExpiring 
                    ? `Expires in ${daysUntilExpiry} days - Save 20% with yearly plan!`
                    : 'Professional features unlocked'
                };
              case 'day_pass':
                const hoursRemaining = daysUntilExpiry ? Math.max(0, daysUntilExpiry * 24) : 24;
                return {
                  gradient: 'from-orange-500 to-orange-600',
                  buttonText: 'Upgrade to Pro',
                  description: `${Math.floor(hoursRemaining)} hours remaining - Upgrade for unlimited access!`
                };
              case 'free':
                return {
                  gradient: 'from-lime-500 to-lime-600',
                  buttonText: 'Upgrade to Pro',
                  description: 'Unlock unlimited CVs, ATS optimization, and premium features'
                };
              default:
                return {
                  gradient: 'from-lime-500 to-lime-600',
                  buttonText: 'Upgrade Plan',
                  description: 'Upgrade to unlock premium features'
                };
            }
          };
          
          const planStyling = getPlanStyling(currentPlan, isExpiringSoon);
          
          return (
            <div className={`bg-gradient-to-r ${planStyling.gradient} rounded-xl p-4 text-white`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{planName}</div>
                <div className={`text-xs ${planStatus === 'active' ? 'bg-white/20' : 'bg-red-500/50'} px-2 py-1 rounded-full`}>
                  {planStatus === 'active' ? 'Active' : planStatus}
                </div>
              </div>
              <div className="text-xs text-white/80 mb-3">
                {planStyling.description}
              </div>
              <motion.button
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {planStyling.buttonText}
              </motion.button>
            </div>
          );
        })()}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
            {getUserAvatar(userData) ? (
              <img 
                src={getUserAvatar(userData)} 
                alt={getUserDisplayName(userData)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{ display: getUserAvatar(userData) ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
              {getUserDisplayName(userData).charAt(0)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {getUserDisplayName(userData)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {userData?.email}
            </div>
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

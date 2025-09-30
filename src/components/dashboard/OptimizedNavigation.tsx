'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BarChart3, Target, Route, FileText, MessageSquare, Settings,
  Sparkles, Bell, Sun, Moon, Menu, X
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';
import { useRoutePreloader } from '@/lib/services/routePreloader';

const OptimizedNavigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData } = useUserData();
  const { preloadOnHover } = useRoutePreloader();
  const [activeSection, setActiveSection] = useState('analytics');

  // Update active section based on current path
  useEffect(() => {
    if (pathname === '/dashboard') {
      setActiveSection('analytics');
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
    },
    { 
      id: 'quillbox', 
      name: 'Snippets', 
      icon: MessageSquare, 
      description: 'Content Library',
      route: '/dashboard/quillbox'
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: Settings, 
      description: 'Account & preferences',
      route: '/dashboard/settings'
    }
  ];

  return (
    <div className="flex flex-col h-full m-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-lime-500">CV</span>
          <span className="text-2xl font-bold text-gray-400">Circle</span>
        </div>
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
                  ? 'bg-gradient-to-r from-lime-100 to-lime-200 dark:from-lime-400/20 dark:to-lime-500/20 border border-lime-300 dark:border-lime-400/30 text-lime-700 dark:text-lime-400 shadow-lg'
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

      {/* Membership Card */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-lime-500 to-lime-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Free Plan</div>
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">Active</div>
          </div>
          <div className="text-xs text-lime-100 mb-3">
            Upgrade to unlock premium features
          </div>
          <motion.button
            className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Upgrade Plan
          </motion.button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white text-sm font-medium">
            {getUserDisplayName(userData).charAt(0)}
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
    </div>
  );
};

export default OptimizedNavigation;

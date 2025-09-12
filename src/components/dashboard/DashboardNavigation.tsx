'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Briefcase, 
  MessageSquare, 
  BarChart3,
  Shield,
  Route,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { getSidebarClasses } from '@/lib/utils/themeUtils';

interface DashboardNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMembershipClick: () => void;
  user: {
    name: string;
    email: string;
    username?: string;
    progress: number;
    profilePhoto?: string;
    subscription?: {
      planName: string;
      status: string;
      credits: number;
      endDate?: string;
      planKey?: string;
    };
  };
  isOpen?: boolean;
  onClose?: () => void;
  isBannerVisible?: boolean;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeSection,
  onSectionChange,
  onMembershipClick,
  user,
  isOpen = true,
  onClose,
  isBannerVisible = false
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [cvJourneyCount, setCvJourneyCount] = useState(0);
  
  // Check if user is admin
  const isAdmin = (session as any)?.user?.role === 'admin';

  // Fetch subscription data and CV journey count
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email) return;
      
      try {
        // Fetch subscription data
        const subscriptionResponse = await fetch('/api/user/subscription');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setSubscription(subscriptionData.subscription);
        }

        // Fetch CV journey count (completed CVs)
        const cvsResponse = await fetch(`/api/cvs?userId=${user.id}&type=cv`);
        if (cvsResponse.ok) {
          const cvsData = await cvsResponse.json();
          setCvJourneyCount(cvsData.cvs?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [session, user.id]);

  const sections = [
    { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Progress Tracking' },
    { id: 'pipeline', name: 'Job Tracker', icon: Briefcase, description: 'Track Applications', tourId: 'job-tracker' },
    { id: 'cv-journey', name: 'CV Journey', icon: Route, description: 'Guided CV Creation', tourId: 'cv-journey' },
    { id: 'canvas', name: 'CV Studio', icon: FileText, description: 'Saved CV/Cover Letters', tourId: 'cv-studio' },
    { id: 'quillbox', name: 'Snippets', icon: MessageSquare, description: 'Content Library' }
  ];

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  const refreshSubscriptionData = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the page to get latest data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Detect screen size for responsive behavior
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1280) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSidebarContainerClasses = () => {
    const baseClasses = 'fixed z-40 transition-all duration-300 ease-in-out';
    const topOffset = isBannerVisible ? 'top-20' : 'top-4';
    
    switch (screenSize) {
      case 'mobile':
        return `${baseClasses} inset-y-0 left-0 w-80 ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50`;
      
      case 'tablet':
        return `${baseClasses} ${topOffset} left-4 bottom-4 w-20 ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'} 
                bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 
                rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/20`;
      
      case 'desktop':
      default:
        return `${baseClasses} ${topOffset} left-4 bottom-4 w-72 ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'} 
                bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 
                rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/20`;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && screenSize === 'mobile' && (
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={getSidebarContainerClasses()}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="text-center mb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-2xl font-bold mb-2 hover:opacity-90 transition-opacity"
          >
            {screenSize === 'tablet' ? (
              <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
                <CheckCircle size={20} className="text-white" />
              </div>
            ) : (
              <>
                <span className="text-lime-600 dark:text-lime-400 drop-shadow-lg">CV</span>
                <span className="text-gray-800 dark:text-white">CIRCLE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 pb-20 mt-8">
        <div className="space-y-2">
          {/* Section Navigation */}
          {sections.map((section, index) => (
            <motion.button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              data-tour={section.tourId}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-lime-100 to-lime-200 dark:from-lime-400/20 dark:to-lime-500/20 border border-lime-300 dark:border-lime-400/30 text-lime-700 dark:text-lime-400 shadow-lg'
                  : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/60'
              }`}
              whileHover={{ x: screenSize === 'tablet' ? 0 : 5, scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              title={screenSize === 'tablet' ? section.name : undefined}
            >
              <section.icon 
                size={20} 
                className={`transition-colors ${
                  activeSection === section.id ? 'text-lime-600 dark:text-lime-400' : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white'
                }`}
              />
              {screenSize !== 'tablet' && (
                <div className="text-left">
                  <div className="text-sm font-semibold">{section.name}</div>
                  <div className="text-xs opacity-70">{section.description}</div>
                </div>
              )}
            </motion.button>
          ))}
        </div>


      </nav>

      {/* Footer Actions - Fixed at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
        {/* Membership Card */}
        {screenSize !== 'tablet' && (
        <motion.div
          className="bg-gradient-to-br from-lime-500/90 to-lime-600/90 rounded-xl p-6 text-white relative overflow-hidden group cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            boxShadow: "0 4px 20px rgba(132, 204, 22, 0.3)"
          }}
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0 8px 30px rgba(132, 204, 22, 0.4)",
            y: -2
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ delay: 0.1 }}
          onClick={onMembershipClick}
        >
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut"
            }}
          />
          
          {/* Subtle Pulse Animation */}
          <motion.div
            className="absolute inset-0 bg-white/5 rounded-xl"
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.02, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <motion.div 
                  className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center"
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 5,
                    ease: "easeInOut"
                  }}
                >
                  <span className="text-xs font-bold">
                    {user.subscription?.planName === 'Pro' || user.subscription?.planName === 'Premium' || user.subscription?.planName === 'Professional' || user.subscription?.planName === 'Pro Monthly' || user.subscription?.planName === 'Pro Quarterly' || user.subscription?.planName === 'Pro Yearly' ? '⭐' : '✨'}
                  </span>
                </motion.div>
                <span className="text-sm font-semibold">
                  {user.subscription?.planName === 'Pro' || user.subscription?.planName === 'Premium' || user.subscription?.planName === 'Professional' || user.subscription?.planName === 'Pro Monthly' || user.subscription?.planName === 'Pro Quarterly' || user.subscription?.planName === 'Pro Yearly' ? 'Pro Member' : 'Unlock AI Power'}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Debug: Show actual subscription data - temporarily visible */}
              <div className="text-sm bg-white/10 border border-white/20 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">Subscription Status</span>
                  <button
                    onClick={refreshSubscriptionData}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="Refresh subscription data"
                  >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/80">Plan:</span>
                    <span className="text-lime-300 font-medium">{user.subscription?.planName || 'No Plan'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">Status:</span>
                    <span className="text-green-300 font-medium">{user.subscription?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">End Date:</span>
                    <span className="text-blue-300 font-medium">{user.subscription?.endDate || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              {subscription?.planKey && subscription.planKey !== 'free' ? (
                // Premium User Content
                <>
                  <div className="text-sm opacity-90">
                    All Pro features unlocked! 🚀
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-300">✓</span>
                      <span>Unlimited AI CV Analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-300">✓</span>
                      <span>Instant Cover Letters</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-300">✓</span>
                      <span>ATS Optimization</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-blue-300">📊</span>
                      <span>{cvJourneyCount} CV Journey{cvJourneyCount !== 1 ? 's' : ''} Completed</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/dashboard/canvas');
                    }}
                    className="w-full bg-white text-lime-600 hover:bg-gray-100 text-sm py-2 rounded-lg transition-colors font-medium"
                  >
                    Use AI Now
                  </button>
                </>
              ) : (
                // Free User Content
                <>
                  <div className="text-sm opacity-90">
                    Stop staring at blank pages. Unlock AI-powered summaries, unlimited ATS checks, and instant cover letters.
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-300">🔒</span>
                      <span>AI-powered summaries</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-300">🔒</span>
                      <span>Unlimited ATS checks</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-yellow-300">🔒</span>
                      <span>Instant cover letters</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/dashboard/settings?tab=membership');
                      }}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-sm py-2 rounded-lg transition-colors"
                    >
                      Learn more
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMembershipClick();
                      }}
                      className="flex-1 bg-white text-lime-600 hover:bg-gray-100 text-sm py-2 rounded-lg transition-colors font-medium"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
        )}

        {/* Admin Button - Only show for admin users */}
        {isAdmin && (
          <motion.button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20"
            whileHover={{ x: screenSize === 'tablet' ? 0 : 5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            title={screenSize === 'tablet' ? 'Admin' : undefined}
          >
            <Shield size={20} />
            {screenSize !== 'tablet' && (
              <div className="text-left">
                <div className="text-base font-medium">Admin</div>
                <div className="text-sm opacity-60">System Management</div>
              </div>
            )}
          </motion.button>
        )}

      </div>
      </div>
    </>
  );
};

export default DashboardNavigation; 
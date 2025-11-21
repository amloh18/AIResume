'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  FileText, 
  Cookie, 
  HelpCircle, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Logo from '@/components/ui/Logo';
import PrivacyPolicyContent from './PrivacyPolicyContent';
import TermsContent from './TermsContent';
import CookiePolicyContent from './CookiePolicyContent';
import SupportContent from './SupportContent';

type TabType = 'privacy' | 'terms' | 'cookies' | 'support';

const LegalCenter: React.FC = () => {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('privacy');
  const isLoading = status === 'loading';

  // Handle hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['privacy', 'terms', 'cookies', 'support'].includes(hash)) {
      setActiveTab(hash as TabType);
    }
  }, []);

  const tabs = [
    {
      id: 'privacy' as TabType,
      label: 'Privacy Policy',
      icon: Shield,
      description: 'How we collect, use, and protect your data'
    },
    {
      id: 'terms' as TabType,
      label: 'Terms & Conditions',
      icon: FileText,
      description: 'Terms of service and user agreement'
    },
    {
      id: 'cookies' as TabType,
      label: 'Cookie Policy',
      icon: Cookie,
      description: 'How we use cookies and tracking technologies'
    },
    {
      id: 'support' as TabType,
      label: 'Support',
      icon: HelpCircle,
      description: 'Get help and contact our support team'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'privacy':
        return <PrivacyPolicyContent />;
      case 'terms':
        return <TermsContent />;
      case 'cookies':
        return <CookiePolicyContent />;
      case 'support':
        return <SupportContent />;
      default:
        return <PrivacyPolicyContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Logo size="md" className="text-white" />
            </Link>
            <div className="flex items-center space-x-4">
              {/* User Authentication Section */}
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-white/20">
                {isLoading ? (
                  <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/sign-in"
                      className="px-4 py-2 text-white/80 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Tabs Navigation */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-2 mb-8 border border-white/10">
            <div className="grid grid-cols-1 tablet:grid-cols-4 gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      window.history.replaceState(null, '', `#${tab.id}`);
                    }}
                    className={`
                      flex items-center justify-between p-4 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-lime-500/20 border border-lime-500/50 text-lime-400' 
                        : 'hover:bg-white/5 text-white/70 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-lime-400' : 'text-white/60'}`} />
                      <div className="text-left">
                        <div className={`font-medium ${isActive ? 'text-lime-400' : 'text-white'}`}>
                          {tab.label}
                        </div>
                        <div className="text-xs text-white/50 mt-0.5">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="w-5 h-5 text-lime-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default LegalCenter;


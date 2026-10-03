'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  FileText, 
  Cookie, 
  HelpCircle, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { navLinks } from '@/data/navigation';
import PrivacyPolicyContent from './PrivacyPolicyContent';
import TermsContent from './TermsContent';
import CookiePolicyContent from './CookiePolicyContent';
import SupportContent from './SupportContent';

export type TabType = 'privacy' | 'terms' | 'cookies' | 'support';

interface LegalCenterProps {
  defaultTab?: TabType;
}

export default function LegalCenter({ defaultTab = 'privacy' }: LegalCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Handle hash navigation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['privacy', 'terms', 'cookies', 'support'].includes(hash)) {
        setActiveTab(hash as TabType);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const tabs = [
    {
      id: 'privacy' as TabType,
      label: 'Privacy Policy',
      icon: Shield,
      description: 'Data protection, privacy rights & security'
    },
    {
      id: 'terms' as TabType,
      label: 'Terms of Service',
      icon: FileText,
      description: 'Platform usage agreement & service terms'
    },
    {
      id: 'cookies' as TabType,
      label: 'Cookie Policy',
      icon: Cookie,
      description: 'Cookie usage, telemetry & preferences'
    },
    {
      id: 'support' as TabType,
      label: 'Support & Help',
      icon: HelpCircle,
      description: 'Customer service, FAQs & inquiries'
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
    <div className="min-h-screen bg-[#141810] text-white relative overflow-hidden flex flex-col justify-between selection:bg-lime-400 selection:text-black">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-lime-500/10 via-emerald-950/15 to-transparent rounded-full blur-[160px]" />
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-lime-600/5 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1">
        {/* Navigation Bar */}
        <CardNav
          logo="AIResume"
          links={navLinks}
        />

        {/* Hero Banner Section */}
        <section className="pt-32 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Lock className="w-3.5 h-3.5" />
              <span>Trust, Compliance & Legal Center</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
              Transparency & <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-300 to-lime-500">Legal Policies</span>
            </h1>

            <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              We hold our platform to the highest standards of data security, privacy protection, and transparent user agreements.
            </p>
          </motion.div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Tabs Navigation */}
            <div className="bg-[#101712]/80 backdrop-blur-xl rounded-2xl p-2.5 mb-10 border border-white/10 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                        flex items-center justify-between p-4 rounded-xl transition-all duration-200 text-left
                        ${isActive 
                          ? 'bg-lime-500/15 border border-lime-500/40 text-lime-400 shadow-[0_0_20px_rgba(132,204,22,0.12)]' 
                          : 'hover:bg-white/5 border border-transparent text-white/70 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-lime-500/20 text-lime-400' : 'bg-white/5 text-white/60'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-sm truncate ${isActive ? 'text-lime-400' : 'text-white'}`}>
                            {tab.label}
                          </div>
                          <div className="text-xs text-white/50 mt-0.5 truncate">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content Container */}
            <div className="bg-[#101712]/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 lg:p-12 border border-white/10 shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

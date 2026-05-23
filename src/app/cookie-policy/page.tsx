'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, Shield, Eye, BarChart3, Target, Lock, RefreshCcw, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { clearCookiePreferences } from '@/lib/utils/cookieUtils';

const CookiePolicy: React.FC = () => {
  const handleResetConsent = () => {
    clearCookiePreferences();
    window.location.reload();
  };

  const sections = [
    {
      title: "Essential Cookies",
      icon: <Lock className="w-6 h-6 text-[#81ff00]" />,
      description: "These are strictly necessary for the website to function. They enable core features like security, session management, and accessibility.",
      cookies: [
        "next-auth.session-token (Session management)",
        "csrf-token (Security protection)",
        "cookieConsent (Stores your preferences)"
      ]
    },
    {
      title: "Analytics Cookies",
      icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
      description: "Help us understand how visitors interact with our website by collecting and reporting information anonymously.",
      cookies: [
        "_ga / _gid (Google Analytics tracking)",
        "PostHog (Product usage analysis)"
      ]
    },
    {
      title: "Marketing Cookies",
      icon: <Target className="w-6 h-6 text-purple-400" />,
      description: "Used to track visitors across websites to display ads that are relevant and engaging for the individual user.",
      cookies: [
        "FB Pixel (Ad targeting)",
        "LinkedIn Insight Tag (Conversion tracking)"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#1a230f] py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#81ff00]/10 rounded-2xl mb-6">
            <Cookie className="w-8 h-8 text-[#81ff00]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
            Cookie Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            We value your privacy. This policy explains how and why we use cookies to improve your CVCircle experience.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <Info className="text-[#81ff00] w-6 h-6 shrink-0" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Want to change your current cookie choices? You can reset them here and the banner will reappear.
            </p>
          </div>
          <Button 
            onClick={handleResetConsent}
            variant="outline"
            className="shrink-0 border-[#81ff00]/30 hover:bg-[#81ff00]/10 text-[#81ff00]"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reset My Choices
          </Button>
        </motion.div>

        {/* Content Sections */}
        <div className="space-y-8 mb-16">
          {sections.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  {section.icon}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {section.description}
              </p>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Examples
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {section.cookies.map(cookie => (
                    <li key={cookie} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#81ff00]" />
                      {cookie}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center space-y-8"
        >
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-2">
              <Shield className="text-blue-400 w-5 h-5" />
              Your Privacy Matters
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Cookies are just one part of how we protect your data. For a complete picture of how we handle your information, please read our 
              <Link href="/privacy-policy" className="text-blue-400 hover:underline mx-1">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <p className="text-sm text-gray-500">
            Last updated: May 23, 2026
          </p>

          <Link href="/">
            <Button variant="ghost" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiePolicy;

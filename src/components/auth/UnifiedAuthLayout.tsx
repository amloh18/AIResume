'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UnifiedAuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  backHref?: string;
  backText?: string;
}

export default function UnifiedAuthLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref = '/',
  backText = 'Back to Home'
}: UnifiedAuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#141810]">
      {/* Back Button */}
      {showBackButton && (
        <div className="absolute top-8 left-8">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{backText}</span>
          </Link>
        </div>
      )}

      {/* Main Content - Card Container */}
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-[#222B22] rounded-2xl border border-white/10 shadow-2xl p-8"
        >
          {/* Card Header with Logo */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img 
                src="/images/Logo.png" 
                alt="CVCircle Logo" 
                className="w-10 h-10 object-contain"
              />
              <div className="text-3xl font-bold">
                <span className="text-[#80FF00]">CV</span><span className="text-white">Circle</span>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="text-center">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

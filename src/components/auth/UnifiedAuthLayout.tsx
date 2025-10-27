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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1a2414' }}>
      {/* Back Button */}
      {showBackButton && (
        <div className="absolute top-8 left-8">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{backText}</span>
          </Link>
        </div>
      )}

      {/* Main Content - Centered */}
      <div className="w-full max-w-md text-center">
        {children}
      </div>
    </div>
  );
}

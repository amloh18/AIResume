'use client';

import React from 'react';
import Logo from '@/components/ui/Logo';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Anton } from 'next/font/google';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

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
  backText = 'Back to Home',
  isModal = false
}: UnifiedAuthLayoutProps & { isModal?: boolean }) {
  if (isModal) {
    return (
      <div className="w-full p-6 sm:p-8 bg-[#141810]">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" showText={true} theme="light" />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#141810]">
      {/* Left Side - 50% - Bright Color Panel */}
      <div className="hidden lg:flex basis-1/2 shrink-0 grow-0 relative overflow-hidden">
        {/* Vibrant Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#80FF00] via-[#6DD400] to-[#5AB300]" />

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col w-full p-12">
          {/* Logo in Top Left */}
          <div className="flex items-center gap-3 mb-auto drop-shadow-lg">
            <Logo size="lg" showText={true} theme="dark" />
          </div>

          {/* Center Text Highlight Heading */}
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-2xl"
            >
              <h1 className={`text-9xl font-bold leading-tight mb-6 tracking-tight ${anton.className}`}>
                <span className="text-black">MASTER</span>
                <br />
                <span className="text-black">YOUR</span>
                <br />
                <span className="text-black">CAREER</span>
                <br />
                <span className="relative inline-block">
                  <span className="text-black">JOURNEY.</span>
                </span>
              </h1>
              <p className="text-xl text-black/80 font-medium">
                Your first step to land your dream job... or at least pay the bills
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side - 50% - Auth Form */}
      <div className="w-full lg:basis-1/2 lg:shrink-0 lg:grow-0 flex items-center justify-center px-4 py-12 relative">
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
            {/* Card Header with Logo - Only show on mobile */}
            <div className="mb-8 lg:hidden flex justify-center">
              <Logo size="md" showText={true} theme="dark" />
            </div>

            {/* Card Content */}
            <div className="text-center">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

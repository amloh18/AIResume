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
  isModal = false,
  variant = 'default'
}: UnifiedAuthLayoutProps & { isModal?: boolean, variant?: 'default' | 'b2b' | 'admin' }) {
  if (isModal) {
    return (
      <div className="w-full p-6 sm:p-8 bg-white dark:bg-[#141810]">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        {children}
      </div>
    );
  }

  if (variant === 'admin') {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-slate-900">
        {/* Left Side - 50% - Admin Branding */}
        <div className="hidden lg:flex basis-1/2 shrink-0 grow-0 relative overflow-hidden bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-white/5 items-center justify-center">
          {/* Cyber grid / technical background accent */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-50" />
          
          <div className="relative z-10 flex flex-col w-full p-12 max-w-2xl">
            <div className="flex items-center gap-3 mb-16 drop-shadow-sm">
              <Logo size="lg" />
              <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
                System Admin
              </span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
                Central <br/>
                <span className="text-indigo-600 dark:text-indigo-400">Command Center.</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">
                Manage users, monitor metrics, and control system health.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:basis-1/2 lg:shrink-0 lg:grow-0 flex items-center justify-center px-4 py-12 relative">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl p-8"
            >
              <div className="mb-8 lg:hidden flex items-center justify-center gap-3">
                <Logo size="md" />
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
                  System Admin
                </span>
              </div>
              <div className="text-center">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'b2b') {
    return (
      <div className="min-h-screen flex bg-[#0d1209] selection:bg-[#80FF00] selection:text-black">
        {/* Left Side - 50% - B2B Branding */}
        <div className="hidden lg:flex basis-1/2 shrink-0 grow-0 relative overflow-hidden bg-black items-center justify-center border-r border-white/5">
          {/* Dynamic background elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#80FF00]/10 rounded-full blur-[120px]" />

          <div className="relative z-10 flex flex-col w-full p-20 max-w-2xl">
            <div className="flex items-center gap-3 mb-24">
              <Logo size="lg" />
              <span className="px-3 py-1 text-[10px] font-black tracking-[0.2em] bg-[#80FF00] text-black rounded-full uppercase">
                Enterprise
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-6xl font-black tracking-tighter text-white mb-8 leading-[0.9]">
                INFRASTRUCTURE <br/>
                FOR <span className="text-[#80FF00]">TALENT.</span>
              </h1>
              <p className="text-xl text-gray-500 font-medium leading-relaxed">
                Visual dashboard and API-first screening infrastructure for modern recruitment platforms.
              </p>
            </motion.div>
          </div>
        </div>
        {/* Right Side - Auth Form */}
        <div className="w-full lg:basis-1/2 lg:shrink-0 lg:grow-0 flex items-center justify-center px-4 py-12 relative overflow-hidden">
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[100px]" />
          
          {showBackButton && (
            <div className="absolute top-12 left-12">
              <Link
                href={backHref}
                className="flex items-center gap-2 text-gray-500 hover:text-[#80FF00] transition-colors duration-300 font-black text-[10px] tracking-widest uppercase"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{backText}</span>
              </Link>
            </div>
          )}

          <div className="w-full max-w-md relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/5 backdrop-blur-3xl rounded-[40px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] p-12"
            >
              <div className="mb-12 lg:hidden flex flex-col items-center gap-4">
                <Logo size="md" />
                <span className="px-3 py-1 text-[8px] font-black tracking-[0.2em] bg-[#80FF00] text-black rounded-full uppercase">
                  Enterprise Gateway
                </span>
              </div>
              <div className="text-center text-white">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-[#141810] ${!isModal ? 'dark' : ''}`}>
      {/* Left Side - 50% - Bright Color Panel */}
      <div className="hidden lg:flex basis-1/2 shrink-0 grow-0 relative overflow-hidden">
        {/* Vibrant Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#80FF00] via-[#6DD400] to-[#5AB300]" />

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-none blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-none blur-3xl animate-pulse delay-700" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col w-full p-12">
          {/* Logo in Top Left */}
          <div className="flex items-center gap-3 mb-auto drop-shadow-lg">
            <Logo size="lg" />
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
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white transition-colors duration-200"
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
            className="bg-white dark:bg-[#141810] rounded-md border border-gray-100 dark:border-white/10 shadow-2xl p-8"
          >
            {/* Card Header with Logo - Only show on mobile */}
            <div className="mb-8 lg:hidden flex justify-center">
              <Logo size="md" />
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

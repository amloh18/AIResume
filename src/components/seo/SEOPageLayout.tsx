'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface SEOPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: { text: string; color: string };
  gradient?: string;
}

export default function SEOPageLayout({ 
  children, 
  title, 
  subtitle, 
  badge,
  gradient = 'from-green-600 to-emerald-600'
}: SEOPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0d1209]">
      {/* Navigation - Same as landing */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1209]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Logo size="md" />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
              <Link href="/templates" className="text-gray-400 hover:text-white transition-colors text-sm">Templates</Link>
              <Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">Blog</Link>
              <Link 
                href="/sign-up" 
                className="bg-[#81ff00] hover:bg-[#6dd600] text-black px-4 py-2 rounded-full font-bold text-sm transition-all hover:scale-105"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-green-600/20 to-transparent rounded-full blur-[100px]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`inline-block px-4 py-2 ${badge.color} rounded-full text-sm font-medium mb-6`}
            >
              {badge.text}
            </motion.div>
          )}
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
          >
            {title}
          </motion.h1>
          
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </section>

      {/* Content */}
      {children}

      {/* CTA Section */}
      <section className={`py-16 px-4 bg-gradient-to-r ${gradient}`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 mb-8">
            Join thousands of job seekers who landed their dream jobs with CVCircle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-all hover:scale-105"
            >
              Start for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all"
            >
              View Templates
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-12 px-4 bg-[#141810]">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Popular Resume Pages</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/resume/data-analyst" className="text-gray-400 hover:text-[#81ff00] transition-colors text-sm">
              Data Analyst Resume
            </Link>
            <Link href="/resume/software-engineer" className="text-gray-400 hover:text-[#81ff00] transition-colors text-sm">
              Software Engineer Resume
            </Link>
            <Link href="/resume/frontend-developer" className="text-gray-400 hover:text-[#81ff00] transition-colors text-sm">
              Frontend Developer Resume
            </Link>
            <Link href="/ai-resume-builder" className="text-gray-400 hover:text-[#81ff00] transition-colors text-sm">
              AI Resume Builder
            </Link>
            <Link href="/ats-resume-checker" className="text-gray-400 hover:text-[#81ff00] transition-colors text-sm">
              ATS Checker
            </Link>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#81ff00] rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs">CV</span>
            </div>
            <span className="text-gray-500 text-sm">© 2026 CVCircle. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-white text-sm transition-colors">Privacy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-white text-sm transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Animation variants for staggered content
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4 }
};

// Card component for consistency
interface SEOCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function SEOCard({ children, className = '', delay = 0 }: SEOCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-[#1a1f1a] border border-white/5 rounded-xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Button component matching landing page
interface SEOButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export function SEOButton({ children, href, variant = 'primary', className = '' }: SEOButtonProps) {
  const baseStyles = 'inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all hover:scale-105';
  
  const variants = {
    primary: 'bg-[#81ff00] text-black hover:bg-[#6dd600]',
    secondary: 'bg-white/10 text-white hover:bg-white/20',
    outline: 'border-2 border-white text-white hover:bg-white/10'
  };
  
  return (
    <Link href={href} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

// Feature list item
export function SEOFeature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex gap-4"
    >
      <div className="text-2xl">{icon}</div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </motion.div>
  );
}

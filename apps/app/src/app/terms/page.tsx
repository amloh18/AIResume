'use client';

import React from 'react';
import { motion } from 'framer-motion';
import CardNav from '@/components/landing/CardNav';
import Footer from '@/components/landing/Footer';
import { navLinks } from '@/data/navigation';
import TermsContent from '@/app/legal/TermsContent';
import { FileText, Shield } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
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

        {/* Hero Section */}
        <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <FileText className="w-3.5 h-3.5" />
              <span>Legal Agreement</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-300 to-lime-500">Service</span>
            </h1>

            <p className="text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
              Please read these Terms of Service carefully before using the AIResume platform.
            </p>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/50">
              <Link href="/privacy-policy" className="hover:text-lime-400 transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="/legal#cookies" className="hover:text-lime-400 transition-colors">Cookie Policy</Link>
              <span>•</span>
              <Link href="/legal#support" className="hover:text-lime-400 transition-colors">Support</Link>
            </div>
          </motion.div>
        </section>

        {/* Content Section */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-[#101712]/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 lg:p-12 border border-white/10 shadow-2xl"
          >
            <TermsContent />
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

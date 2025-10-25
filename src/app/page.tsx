'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import ChromeExtension from '@/components/landing/ChromeExtension';
import Testimonials from '@/components/landing/Testimonials';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import CardNav from '@/components/landing/CardNav';
import { motion } from 'framer-motion';

function LandingPageContent() {
  const searchParams = useSearchParams();
  
  // Handle logout cleanup
  useEffect(() => {
    const logoutParam = searchParams.get('logout');
    
    if (logoutParam === 'success' || logoutParam === 'fallback') {
      console.log('🔍 Landing page detected logout, ensuring session is cleared...');
      
      // Force NextAuth signout (without redirect to avoid loop)
      signOut({ redirect: false }).catch((error) => {
        console.error('⚠️ Error during NextAuth signout on landing:', error);
      });
      
      // Clear any remaining localStorage/sessionStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('auth-session');
          localStorage.removeItem('user');
          sessionStorage.clear();
          console.log('✅ Landing page cleared all session storage');
        } catch (error) {
          console.error('⚠️ Error clearing storage on landing:', error);
        }
      }
      
      // Clean up URL by removing logout parameter
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('logout');
        url.searchParams.delete('_t');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);
  
  const navLinks = [
    { label: 'Features', href: '#features', ariaLabel: 'View features section' },
    { label: 'Extension', href: '#chrome-extension', ariaLabel: 'View Chrome extension section' },
    { label: 'How It Works', href: '#how-it-works', ariaLabel: 'View how it works section' },
    { label: 'Pricing', href: '#pricing', ariaLabel: 'View pricing section' }
  ];

  const handleCtaClick = () => {
    window.location.href = '/sign-in';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Navigation */}
      <CardNav 
        logo="CVCircle"
        links={navLinks}
        onCtaClick={handleCtaClick}
      />
      
      {/* Hero Section */}
      <Hero />
      
      {/* How It Works Section */}
      <HowItWorks />
      
      {/* Features Section */}
      <Features />
      
      {/* Chrome Extension Section */}
      <ChromeExtension />
      
      {/* Testimonials Section */}
      <Testimonials />
      
      {/* Pricing Section */}
      <Pricing onPlanSelect={(plan) => {
        // Redirect to sign-up with plan selection
        window.location.href = `/sign-up?plan=${encodeURIComponent(plan.name)}`;
      }} />
      
      {/* FAQ Section */}
      <FAQ />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lime-400 text-xl">Loading...</div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
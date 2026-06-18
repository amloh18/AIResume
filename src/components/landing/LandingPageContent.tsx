'use client';

import React, { useEffect } from 'react';
import Hero from '@/components/landing/Hero';
import CardNav from '@/components/landing/CardNav';
import { TestimonialSnippet } from '@/components/landing/Testimonials';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { navLinks } from '@/data/navigation';

// Lazy load non-critical sections
const Features = dynamic(() => import('@/components/landing/Features'), { ssr: true });
const ChromeExtension = dynamic(() => import('@/components/landing/ChromeExtension'), { ssr: true });
const Testimonials = dynamic(() => import('@/components/landing/Testimonials'), { ssr: true });
const CompetitorComparison = dynamic(() => import('@/components/landing/CompetitorComparison'), { ssr: true });
const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks'), { ssr: true });
const Pricing = dynamic(() => import('@/components/landing/Pricing'), { ssr: true });
const BlogSection = dynamic(() => import('@/components/landing/BlogSection'), { ssr: true });
const FAQ = dynamic(() => import('@/components/landing/FAQ'), { ssr: true });
const Footer = dynamic(() => import('@/components/landing/Footer'), { ssr: true });

export default function LandingPageContent() {
  const router = useRouter();
  
  // Handle logout cleanup - client-side only
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const logoutComplete = sessionStorage.getItem('logout-complete');
    if (logoutComplete) {
      sessionStorage.removeItem('logout-complete');
      const url = new URL(window.location.href);
      if (url.searchParams.has('_t')) {
        url.searchParams.delete('_t');
        window.history.replaceState({}, '', url.toString());
      }
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const logoutInProgress = sessionStorage.getItem('logout-in-progress');

    if (logoutInProgress) {
      sessionStorage.removeItem('logout-in-progress');
      const url = new URL(window.location.href);
      url.searchParams.delete('_t');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleCtaClick = () => {
    router.push('/sign-in');
  };

  return (
    <div className="min-h-screen bg-[#141810] relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-to-b from-purple-900/30 via-pink-900/20 to-transparent rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <CardNav
          logo="CVCircle"
          links={navLinks}
          onCtaClick={handleCtaClick}
        />

        <Hero />
        <TestimonialSnippet index={0} />
        <HowItWorks />
        <TestimonialSnippet index={1} />
        <Features />
        <TestimonialSnippet index={2} />
        <ChromeExtension />
        <Testimonials />

        <CompetitorComparison />

        <div className="dark">
          <Pricing onPlanSelect={(plan) => {
            window.location.href = `/sign-up?plan=${encodeURIComponent(plan.name)}`;
          }} />
        </div>

        <BlogSection />

        <FAQ />
        <Footer />
      </div>
    </div>
  );
}

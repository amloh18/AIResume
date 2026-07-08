'use client';

import React, { useEffect, useState } from 'react';
import Hero from '@/components/landing/Hero';
import CardNav from '@/components/landing/CardNav';
import { TestimonialSnippet } from '@/components/landing/Testimonials';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { navLinks } from '@/data/navigation';
import { Skeleton } from '@/components/ui/SkeletonLoader';

const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks'), { ssr: true });

// Below-the-fold sections are deferred to avoid competing with the app shell and above-fold paint.
// They load in two tiers to smooth the network waterfall.
// Tier 1 loads shortly after mount, tier 2 after a small additional delay.
const Features = dynamic(() => import('@/components/landing/Features'), {
  ssr: true,
  loading: () => <Skeleton className="h-[400px] w-full rounded-2xl" />
});
const ChromeExtension = dynamic(() => import('@/components/landing/ChromeExtension'), {
  ssr: true,
  loading: () => <Skeleton className="h-[380px] w-full rounded-2xl" />
});
const Testimonials = dynamic(() => import('@/components/landing/Testimonials'), {
  ssr: true,
  loading: () => <Skeleton className="h-[360px] w-full rounded-2xl" />
});
const CompetitorComparison = dynamic(() => import('@/components/landing/CompetitorComparison'), {
  ssr: true,
  loading: () => <Skeleton className="h-[500px] w-full rounded-2xl" />
});
const Pricing = dynamic(() => import('@/components/landing/Pricing'), {
  ssr: true,
  loading: () => <Skeleton className="h-[600px] w-full rounded-2xl" />
});
const BlogSection = dynamic(() => import('@/components/landing/BlogSection'), {
  ssr: true,
  loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />
});
const FAQ = dynamic(() => import('@/components/landing/FAQ'), {
  ssr: true,
  loading: () => <Skeleton className="h-[380px] w-full rounded-2xl" />
});
const Footer = dynamic(() => import('@/components/landing/Footer'), { ssr: true });

export default function LandingPageContent() {
  const router = useRouter();
  const [layer1, setLayer1] = useState(false);
  const [layer2, setLayer2] = useState(false);

  useEffect(() => {
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
      window.history.replaceState({} as any, '', url.toString());
    }

    // Stagger below-the-fold sections to smooth first paint and chunk load waterfall.
    const layer1Timer = setTimeout(() => setLayer1(true), 50);
    const layer2Timer = setTimeout(() => setLayer2(true), 300);

    return () => {
      clearTimeout(layer1Timer);
      clearTimeout(layer2Timer);
    };
  }, []);

  const handleCtaClick = () => {
    router.push('/sign-in');
  };

  return (
    <div className="min-h-screen bg-[#141810] relative overflow-hidden">
      <CardNav
        logo="CVCircle"
        links={navLinks}
        onCtaClick={handleCtaClick}
      />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-to-b from-purple-900/30 via-pink-900/20 to-transparent rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative">
        {/* Above-the-fold: render immediately */}
        <Hero />
        <TestimonialSnippet index={0} />
        <HowItWorks />
        <TestimonialSnippet index={1} />

        {/* Layer 1: just after above-the-fold */}
        {layer1 && (
          <>
            <TestimonialSnippet index={2} />
            <Features />
            <ChromeExtension />
            <Testimonials />
          </>
        )}

        {/* Layer 2: deeper sections */}
        {layer2 && (
          <>
            <CompetitorComparison />

            <div className="dark">
              <Pricing onPlanSelect={(plan) => {
                window.location.href = `/sign-up?plan=${encodeURIComponent(plan.name)}`;
              }} />
            </div>

            <BlogSection />

            <FAQ />
            <Footer />
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import CardNav from '@/components/landing/CardNav';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import RouteGuard from '@/components/auth/RouteGuard';

export default function Home() {
  const navLinks = [
    { label: 'How It Works', href: '#how-it-works', ariaLabel: 'View how it works section' },
    { label: 'Features', href: '#features', ariaLabel: 'View features section' },
    { label: 'Testimonials', href: '#testimonials', ariaLabel: 'View testimonials section' },
    { label: 'Pricing', href: '#pricing', ariaLabel: 'View pricing section' }
  ];

  const handleCtaClick = () => {
    window.location.href = '/onboarding';
  };

  const handlePlanSelect = (plan: any, pricingData: any) => {
    // Handle plan selection - you can customize this based on your needs
    console.log('Plan selected:', plan, pricingData);
    // For now, redirect to onboarding
    window.location.href = '/onboarding';
  };

  return (
    <RouteGuard requireAuth={false}>
      <main className="relative">
        <CardNav
          logo="CVCircle"
          links={navLinks}
          onCtaClick={handleCtaClick}
        />
        <Hero />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Pricing onPlanSelect={handlePlanSelect} />
        <FAQ />
        <Footer />
      </main>
    </RouteGuard>
  );
} 
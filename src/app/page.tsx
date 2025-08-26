'use client';

import React from 'react';
import Navigation from '@/components/landing/Navigation';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Testimonials from '@/components/landing/Testimonials';
import DynamicPricing from '@/components/pricing/DynamicPricing';
import Footer from '@/components/landing/Footer';
import RouteGuard from '@/components/auth/RouteGuard';
import PageTitle from '@/components/ui/PageTitle';

export default function Home() {
  return (
    <RouteGuard requireAuth={false}>
      <PageTitle />
      <main className="relative">
        <Navigation />
        <Hero />
        <Features />
        <Testimonials />
        <DynamicPricing />
        <Footer />
      </main>
    </RouteGuard>
  );
} 
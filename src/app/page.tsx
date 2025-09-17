'use client';

import React from 'react';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Testimonials from '@/components/landing/Testimonials';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import CardNav from '@/components/landing/CardNav';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const navLinks = [
    { label: 'Features', href: '#features', ariaLabel: 'View features section' },
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
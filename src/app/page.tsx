'use client';

import React, { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { FileText, Sparkles, Layout, PenTool, CheckCircle, Briefcase, Chrome, Globe, LayoutDashboard } from 'lucide-react';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import ProductVideo from '@/components/landing/ProductVideo';
import ChromeExtension from '@/components/landing/ChromeExtension';
import PremiumTemplates from '@/components/landing/PremiumTemplates';
import Testimonials from '@/components/landing/Testimonials';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import CardNav from '@/components/landing/CardNav';
import { useRouter } from 'next/navigation';


function LandingPageContent() {
  const router = useRouter();
  
  // Handle logout cleanup - client-side only
  // Using window.location.search instead of useSearchParams to avoid hook issues
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if logout was already completed to prevent re-signout
    const logoutComplete = sessionStorage.getItem('logout-complete');
    if (logoutComplete) {
      console.log('✅ Logout already complete, skipping cleanup');
      sessionStorage.removeItem('logout-complete');

      // Clean up URL
      const url = new URL(window.location.href);
      if (url.searchParams.has('_t')) {
        url.searchParams.delete('_t');
        window.history.replaceState({}, '', url.toString());
      }
      return;
    }

    // Get logout param from URL directly (avoids useSearchParams hook issues)
    const urlParams = new URLSearchParams(window.location.search);
    const logoutInProgress = sessionStorage.getItem('logout-in-progress');

    if (logoutInProgress) {
      console.log('🔍 Logout in progress, clearing flag...');
      sessionStorage.removeItem('logout-in-progress');

      // Clean up URL by removing logout parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('_t');
      window.history.replaceState({}, '', url.toString());
    }
  }, []); // Empty deps - only run once on mount

  const navLinks = [
    { 
      label: 'Products', 
      href: '#features', 
      ariaLabel: 'View products section',
      submenu: [
        { 
          label: 'AI Resume Builder', 
          description: 'Create ATS-friendly resumes in minutes with AI assistance.', 
          href: '#features', 
          ariaLabel: 'AI-powered resume builder',
          icon: <Sparkles className="w-6 h-6 text-lime-400" />,
          snapshot: 'bg-gradient-to-br from-lime-500/20 to-green-600/20 border-lime-500/30'
        },
        { 
          label: 'ATS Scanner', 
          description: 'Test your resume against job descriptions for better match rates.', 
          href: '#features', 
          ariaLabel: 'ATS compatibility check',
          icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
          snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30'
        },
        { 
          label: 'Premium Templates', 
          description: 'Beautiful, professional templates designed by experts.', 
          href: '#premium-templates', 
          ariaLabel: 'View premium templates',
          icon: <Layout className="w-6 h-6 text-orange-400" />,
          snapshot: 'bg-gradient-to-br from-orange-500/20 to-red-600/20 border-orange-500/30'
        },
      ]
    },
    { 
      label: 'Extension', 
      href: '#chrome-extension', 
      ariaLabel: 'View browser extension section',
      submenu: [
        { 
          label: 'Chrome Add-on', 
          description: 'Analyze jobs and sync data directly from Google Chrome.', 
          href: '#chrome-extension', 
          ariaLabel: 'Chrome extension',
          icon: <Chrome className="w-6 h-6 text-yellow-400" />
        },
        { 
          label: 'Edge Add-on', 
          description: 'Native support for Microsoft Edge browser.', 
          href: '#chrome-extension', 
          ariaLabel: 'Edge extension',
          icon: <Globe className="w-6 h-6 text-blue-400" />
        },
      ]
    },
    { 
      label: 'Resources', 
      href: '#how-it-works', 
      ariaLabel: 'View resources',
      submenu: [
        { 
          label: 'How it Works', 
          description: 'Step-by-step guide to landing your dream job.', 
          href: '#how-it-works', 
          ariaLabel: 'Learn how to create a resume',
          icon: <LayoutDashboard className="w-5 h-5 text-gray-400" />
        },
        { 
          label: 'FAQ', 
          description: 'Common questions and support.', 
          href: '#faq', 
          ariaLabel: 'View FAQ',
          icon: <Briefcase className="w-5 h-5 text-gray-400" />
        },
      ]
    },
    { 
      label: 'Pricing', 
      href: '#pricing', 
      ariaLabel: 'View pricing section',
      submenu: [
        { label: 'Free Plan', description: 'Get started for free', href: '#pricing', ariaLabel: 'Free plan details', icon: <CheckCircle className="w-5 h-5 text-gray-400" /> },
        { label: 'Premium', description: 'Unlock all pro features', href: '#pricing', ariaLabel: 'Premium plan details', icon: <Sparkles className="w-5 h-5 text-gray-400" /> },
      ]
    },
  ];

  const handleCtaClick = () => {
    router.push('/sign-in');
  };

  // Structured data for main landing page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CVCircle",
    "alternateName": ["CV Circle", "cv circle", "CV Circle.io", "cv circle io"],
    "description": "CVCircle (also known as CV Circle) - AI-powered CV builder with ATS optimization, professional templates, and free career analysis tools",
    "url": "https://cvcircle.io",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free tier available with premium options"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    },
    "featureList": [
      "AI-Powered CV Builder",
      "ATS Optimization",
      "Free AI Career Guide",
      "Professional Templates",
      "Job Application Tracker"
    ],
    "provider": {
      "@type": "Organization",
      "name": "CVCircle",
      "alternateName": ["CV Circle", "cv circle", "CV Circle.io"],
      "url": "https://cvcircle.io"
    },
    "keywords": "CV Circle, cv circle, CV Circle.io, cv circle io, CVCircle, cvcircle, CV builder, resume builder, ATS optimization"
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-[#141810] relative overflow-hidden">
        {/* Unified Background Gradient Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Top center purple/magenta glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-to-b from-purple-900/30 via-pink-900/20 to-transparent rounded-full blur-[150px]" />
          {/* Bottom left orange glow */}
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px]" />
          {/* Bottom right blue glow */}
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>

        {/* Content with relative z-index */}
        <div className="relative z-10">
          {/* Navigation */}
          <CardNav
            logo="CVCircle"
            links={navLinks}
            onCtaClick={handleCtaClick}
          />

          {/* Hero Section */}
          <Hero />

          {/* Premium Templates Section */}
          <PremiumTemplates />

          {/* How It Works Section */}
          <HowItWorks />

          {/* Features Section */}
          <Features />

          {/* Product Video Section - Hidden */}
          {/* <ProductVideo /> */}

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
      </div>
    </>
  );
}

export default function LandingPage() {
  return <LandingPageContent />;
}
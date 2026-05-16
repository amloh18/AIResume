'use client';

import React, { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { FileText, Sparkles, PenTool, CheckCircle, Briefcase, Chrome, Globe, LayoutDashboard } from 'lucide-react';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import ProductVideo from '@/components/landing/ProductVideo';
import ChromeExtension from '@/components/landing/ChromeExtension';
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

  const navLinks = [
    { 
      label: 'Products', 
      href: '#features', 
      ariaLabel: 'View products section',
      submenu: [
        { 
          label: 'AI Resume Builder', 
          description: 'Create ATS-friendly resumes in minutes with AI assistance and mix-and-match layout blocks.', 
          href: '#features', 
          ariaLabel: 'AI-powered resume builder',
          icon: <Sparkles className="w-6 h-6 text-lime-400" />,
          snapshot: 'bg-gradient-to-br from-lime-500/20 to-green-600/20 border-lime-500/30'
        },
        { 
          label: 'ATS Scanner', 
          description: 'Test your resume against job descriptions for keyword matches and format compatibility.', 
          href: '#features', 
          ariaLabel: 'ATS compatibility check',
          icon: <CheckCircle className="w-6 h-6 text-blue-400" />,
          snapshot: 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30'
        },
        { 
          label: 'Cover Letter Generator', 
          description: 'Generate tailored, professional cover letters perfectly matching your target role.', 
          href: '#features', 
          ariaLabel: 'Cover letter generator',
          icon: <FileText className="w-6 h-6 text-purple-400" />
        },
        { 
          label: 'Smart Job Tracker', 
          description: 'Organize and track all your applications and upcoming interviews in one place.', 
          href: '#features', 
          ariaLabel: 'Job tracker',
          icon: <Briefcase className="w-6 h-6 text-orange-400" />
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
          description: 'Analyze jobs, extract requirements, and sync data directly from Google Chrome.', 
          href: '#chrome-extension', 
          ariaLabel: 'Chrome extension',
          icon: <Chrome className="w-6 h-6 text-yellow-400" />
        },
        { 
          label: 'Edge Add-on', 
          description: 'Native support for Microsoft Edge browser with full tracking capabilities.', 
          href: '#chrome-extension', 
          ariaLabel: 'Edge extension',
          icon: <Globe className="w-6 h-6 text-blue-400" />
        },
        { 
          label: 'One-Click Save', 
          description: 'Save job descriptions from LinkedIn, Indeed, and more with a single click.', 
          href: '#chrome-extension', 
          ariaLabel: 'One-click save',
          icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />
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
          description: 'Step-by-step guide to building your master CV and landing your dream job.', 
          href: '#how-it-works', 
          ariaLabel: 'Learn how to create a resume',
          icon: <LayoutDashboard className="w-5 h-5 text-gray-400" />
        },
        { 
          label: 'Interview Prep', 
          description: 'Practice answering questions tailored specifically to your target job descriptions.', 
          href: '#features', 
          ariaLabel: 'Interview preparation',
          icon: <Sparkles className="w-5 h-5 text-gray-400" />
        },
        { 
          label: 'FAQ', 
          description: 'Find answers to common questions and get support from our team.', 
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
        { label: 'Free Plan', description: 'Get started for free with basic ATS scanning and standard templates.', href: '#pricing', ariaLabel: 'Free plan details', icon: <CheckCircle className="w-5 h-5 text-gray-400" /> },
        { label: 'Premium', description: 'Unlock all pro features, unlimited AI generations, and premium blocks.', href: '#pricing', ariaLabel: 'Premium plan details', icon: <Sparkles className="w-5 h-5 text-lime-400" /> },
      ]
    },
  ];

  const handleCtaClick = () => {
    router.push('/sign-in');
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CVCircle",
    "alternateName": ["CV Circle", "cv circle", "CV Circle.io", "cv circle io"],
    "description": "CVCircle by Morigrid Labs - AI-powered CV builder with ATS optimization, professional templates, and job application tracking tools.",
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
      "ratingValue": "4.9",
      "reviewCount": "250"
    },
    "featureList": [
      "AI-Powered CV Builder",
      "ATS Optimization",
      "Cover Letter Generator",
      "Job Application Tracker",
      "Professional Templates"
    ],
    "provider": {
      "@type": "Organization",
      "name": "Morigrid Labs",
      "alternateName": ["CVCircle", "CV Circle", "CV Circle.io"],
      "url": "https://cvcircle.io"
    },
    "keywords": "CV Circle, Morigrid Labs, CVCircle, resume builder, ATS optimization, job tracker"
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
          <HowItWorks />
          <Features />
          <ChromeExtension />
          <Testimonials />

          <div className="dark">
            <Pricing onPlanSelect={(plan) => {
              window.location.href = `/sign-up?plan=${encodeURIComponent(plan.name)}`;
            }} />
          </div>

          <FAQ />
          <Footer />
        </div>
      </div>
    </>
  );
}

export default function LandingPage() {
  return <LandingPageContent />;
}

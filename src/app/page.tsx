import React from 'react';
import LandingPageContent from '@/components/landing/LandingPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Resume Builder for ATS Jobs | Get More Interviews | CVCircle',
  description: 'Create ATS-friendly resumes in minutes with CVCircle. AI-powered resume builder, real-time ATS scoring, professional templates, and automated job tracking to help you land your dream job in 2026.',
  keywords: [
    'AI resume builder',
    'ATS resume checker',
    'resume optimizer',
    'job application tracker',
    'AI cover letter generator',
    'ATS-friendly templates',
    'CV builder',
    'career copilot'
  ],
  alternates: {
    canonical: 'https://cvcircle.io',
  },
  openGraph: {
    title: 'AI Resume Builder for ATS Jobs | CVCircle',
    description: 'Stop wasting time. Start getting interviews. Create ATS-friendly resumes with AI assistance and track your applications.',
    url: 'https://cvcircle.io',
    siteName: 'CVCircle',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CVCircle AI Resume Builder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function LandingPage() {
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPageContent />
    </>
  );
}

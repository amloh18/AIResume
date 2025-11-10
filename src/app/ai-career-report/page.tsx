import type { Metadata } from 'next'
import AICareerReportWrapper from '@/components/ai-career-report/AICareerReportWrapper';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

// Comprehensive SEO Metadata for AI Career Guide / ATS Analysis Tool
export const metadata: Metadata = {
  title: 'Free AI Career Guide - ATS Resume Analysis & CV Optimization Tool | CVCircle',
  description: 'Get free AI-powered career analysis and ATS resume optimization. Analyze your CV, discover career paths, optimize for Applicant Tracking Systems, and get personalized recommendations. No signup required for basic analysis.',
  keywords: [
    'AI career guide',
    'ATS analysis tool',
    'resume analyzer',
    'CV analysis free',
    'ATS resume checker',
    'career analysis',
    'resume optimization',
    'CV optimization',
    'ATS optimization',
    'free resume analysis',
    'career insights',
    'AI career report',
    'resume scoring',
    'CV scoring',
    'job search help',
    'career path analysis',
    'resume feedback',
    'CV feedback'
  ],
  openGraph: {
    title: 'Free AI Career Guide - ATS Resume Analysis Tool | CVCircle',
    description: 'Get free AI-powered career analysis and ATS resume optimization. Analyze your CV and discover your career path with personalized recommendations.',
    url: 'https://cvcircle.io/ai-career-report',
    siteName: 'CVCircle',
    images: [
      {
        url: '/images/ai-career-guide-og.png',
        width: 1200,
        height: 630,
        alt: 'AI Career Guide - Free ATS Resume Analysis Tool',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free AI Career Guide - ATS Resume Analysis',
    description: 'Get free AI-powered career analysis and ATS resume optimization. Analyze your CV instantly.',
    images: ['/images/ai-career-guide-twitter.png'],
  },
  alternates: {
    canonical: 'https://cvcircle.io/ai-career-report',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function AICareerReportPage() {
  // Structured data for AI Career Guide / ATS Analysis Tool
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "AI Career Guide - ATS Resume Analysis Tool",
    "description": "Free AI-powered career analysis and ATS resume optimization tool. Analyze your CV, get career insights, and optimize for Applicant Tracking Systems.",
    "url": "https://cvcircle.io/ai-career-report",
    "applicationCategory": "CareerApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free basic analysis available"
    },
    "featureList": [
      "AI-Powered CV Analysis",
      "ATS Compatibility Check",
      "Career Path Recommendations",
      "Skills Gap Analysis",
      "Resume Optimization Tips",
      "Industry Keyword Analysis",
      "Impact Score Calculation"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    },
    "provider": {
      "@type": "Organization",
      "name": "CVCircle",
      "url": "https://cvcircle.io"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AICareerReportWrapper />
    </>
  );
}
import type { Metadata } from 'next'
import Features from '@/components/landing/Features'
import { ArrowRight, Target, BarChart3, Download, Zap, CheckCircle, Eye, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'CV Builder Features - AI-Powered Resume Tools & ATS Optimization | CVCircle',
  description: 'Discover powerful CV builder features: AI-powered resume analysis, ATS optimization, job tracking, one-click career kits, and professional templates. Build ATS-friendly resumes that get you hired.',
  keywords: [
    'CV builder features',
    'resume builder features',
    'ATS optimization',
    'AI resume analysis',
    'job tracking',
    'career tools',
    'resume templates',
    'CV templates',
    'ATS checker',
    'resume analyzer',
    'job application tracker',
    'career kit',
    'professional CV builder'
  ],
  openGraph: {
    title: 'CV Builder Features - AI-Powered Resume Tools | CVCircle',
    description: 'Powerful CV builder features: AI analysis, ATS optimization, job tracking, and professional templates. Build resumes that get you hired.',
    url: 'https://cvcircle.io/features',
    siteName: 'CVCircle',
    images: [
      {
        url: '/images/features-og.png',
        width: 1200,
        height: 630,
        alt: 'CVCircle Features - AI-Powered CV Builder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CV Builder Features - AI-Powered Resume Tools',
    description: 'Discover powerful CV builder features: AI analysis, ATS optimization, and job tracking.',
    images: ['/images/features-twitter.png'],
  },
  alternates: {
    canonical: 'https://cvcircle.io/features',
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

export default function FeaturesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CVCircle Features",
    "description": "Comprehensive CV builder with AI-powered features, ATS optimization, and job tracking",
    "url": "https://cvcircle.io/features",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31"
    },
    "featureList": [
      "AI-Powered CV Analysis",
      "ATS Optimization",
      "Job Tracking & Management",
      "One-Click Career Kit",
      "Professional Templates",
      "Real-time Analytics"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl tablet:text-6xl font-bold text-white mb-6">
              Powerful CV Builder Features
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Everything you need to create ATS-optimized resumes, track job applications, and land your dream job.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/sign-up"
                className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors inline-flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/ai-career-report"
                className="px-8 py-4 bg-transparent border-2 border-[#80FF00] text-[#80FF00] font-semibold rounded-lg hover:bg-[#80FF00]/10 transition-colors inline-flex items-center gap-2"
              >
                Try Free Analysis
                <Sparkles size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <Features />

        {/* Additional Feature Details */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Why Choose CVCircle?
            </h2>
            <div className="grid tablet:grid-cols-3 gap-8">
              <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                <Target className="w-12 h-12 text-[#80FF00] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">ATS-Optimized</h3>
                <p className="text-gray-300">
                  Every CV is optimized for Applicant Tracking Systems, ensuring your resume gets past automated filters.
                </p>
              </div>
              <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                <Zap className="w-12 h-12 text-[#80FF00] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">AI-Powered</h3>
                <p className="text-gray-300">
                  Get instant AI analysis of your CV with personalized recommendations for improvement.
                </p>
              </div>
              <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                <BarChart3 className="w-12 h-12 text-[#80FF00] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Real-Time Analytics</h3>
                <p className="text-gray-300">
                  Track your application success rate and get insights into what works best for your industry.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#80FF00]/10 to-blue-500/10 p-12 rounded-2xl border border-[#80FF00]/20">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Build Your Perfect CV?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of professionals who have landed their dream jobs with CVCircle.
            </p>
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors inline-flex items-center gap-2"
            >
              Start Building Now
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}


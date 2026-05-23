import type { Metadata } from 'next'
import Features from '@/components/landing/Features'
import { 
  ArrowRight, 
  Target, 
  BarChart3, 
  Zap, 
  CheckCircle, 
  FileText, 
  Sparkles, 
  Briefcase, 
  Chrome, 
  Globe, 
  LayoutDashboard, 
  BookOpen 
} from 'lucide-react'
import Link from 'next/link'
import CardNav from '@/components/landing/CardNav'
import Footer from '@/components/landing/Footer'

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
        label: 'Blog',
        description: 'Research-backed career guides, ATS tips, and resume tutorials from CVCircle.',
        href: '/blog',
        ariaLabel: 'Read the CVCircle blog',
        icon: <BookOpen className="w-5 h-5 text-gray-400" />
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
      "priceValidUntil": "2026-12-31"
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
      
      <div className="min-h-screen bg-[#141810] relative overflow-hidden">
        {/* Glow Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-to-b from-purple-900/30 via-pink-900/20 to-transparent rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <CardNav
            logo="CVCircle"
            links={navLinks}
          />

          {/* Hero Section */}
          <section className="relative pt-36 pb-20 px-4">
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
          <section className="py-20 px-4 bg-white/5 border-y border-white/5 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-4xl font-bold text-white text-center mb-12">
                Why Choose CVCircle?
              </h2>
              <div className="grid tablet:grid-cols-3 gap-8">
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm hover:border-[#80FF00]/30 hover:bg-white/10 transition-all duration-300 shadow-xl">
                  <Target className="w-12 h-12 text-[#80FF00] mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">ATS-Optimized</h3>
                  <p className="text-gray-300">
                    Every CV is optimized for Applicant Tracking Systems, ensuring your resume gets past automated filters.
                  </p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm hover:border-[#80FF00]/30 hover:bg-white/10 transition-all duration-300 shadow-xl">
                  <Zap className="w-12 h-12 text-[#80FF00] mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">AI-Powered</h3>
                  <p className="text-gray-300">
                    Get instant AI analysis of your CV with personalized recommendations for improvement.
                  </p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm hover:border-[#80FF00]/30 hover:bg-white/10 transition-all duration-300 shadow-xl">
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

          <Footer />
        </div>
      </div>
    </>
  )
}



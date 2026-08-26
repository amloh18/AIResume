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
  title: 'AI Resume Builder Features - AI-Powered Resume Tools & ATS Optimization',
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
    title: 'AI Resume Builder Features - AI-Powered Resume Tools',
    description: 'Powerful resume builder features: AI analysis, ATS optimization, job tracking, and professional templates.',
    url: 'https://buildairesume.com/features',
    siteName: 'AIResume',
    images: [
      {
        url: '/images/features-og.png',
        width: 1200,
        height: 630,
        alt: 'AIResume Features - AI-Powered Resume Builder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Resume Builder Features - AI-Powered Resume Tools',
    description: 'Discover powerful CV builder features: AI analysis, ATS optimization, and job tracking.',
    images: ['/images/features-twitter.png'],
  },
  alternates: {
    canonical: 'https://buildairesume.com/features',
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
        description: 'Research-backed career guides, ATS tips, and resume tutorials from AIResume.',
        href: '/blog',
        ariaLabel: 'Read the AIResume blog',
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
    "name": "AIResume Features",
    "description": "Comprehensive resume builder with AI-powered features, ATS optimization, and job tracking",
    "url": "https://buildairesume.com/features",
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
            logo="AIResume"
            links={navLinks}
          />

          {/* Hero Section */}
          <section className="relative pt-36 pb-20 px-4">
            <div className="max-w-7xl mx-auto pl-0 text-left flex flex-col items-start">
              <div className="mb-6 flex justify-start">
                <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
                  <path
                    d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[4rem] font-extrabold text-[#F5F7F7] tracking-tighter leading-[1.05] max-w-5xl mb-6 text-left">
                Powerful CV Builder <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">Features</span>.
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-400 font-normal max-w-2xl leading-relaxed text-left mb-8">
                Everything you need to create ATS-optimized resumes, track job applications, and land your dream job.
              </p>
              <div className="flex flex-wrap gap-4 justify-start">
                <Link
                  href="/sign-up"
                  className="px-8 py-4 bg-[#013f2e] hover:bg-[#025c43] text-white font-bold rounded-full transition-colors duration-200 shadow-lg inline-flex items-center gap-2"
                >
                  Get Started Free
                  <ArrowRight size={20} />
                </Link>
                <Link
                  href="/ai-career-report"
                  className="px-8 py-4 bg-white/5 border border-white/15 text-white font-bold rounded-full hover:bg-white/10 transition-colors inline-flex items-center gap-2"
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
              <div className="pl-0 mb-14 text-left flex flex-col items-start">
                <div className="mb-6 flex justify-start">
                  <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
                    <path
                      d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h2 className="text-[2.25rem] sm:text-[2.85rem] lg:text-[3.5rem] font-extrabold text-[#F5F7F7] tracking-tighter leading-[1.05] max-w-5xl mb-6 text-left">
                  Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">AIResume</span>.
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-gray-400 font-normal max-w-2xl leading-relaxed text-left">
                  Built from the ground up for modern job seekers and competitive hiring standards.
                </p>
              </div>
              <div className="grid tablet:grid-cols-3 gap-8">
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm hover:border-[#013f2e]/30 hover:bg-white/10 transition-all duration-300 shadow-xl">
                  <Target className="w-12 h-12 text-[#013f2e] mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">ATS-Optimized</h3>
                  <p className="text-gray-300">
                    Every CV is optimized for Applicant Tracking Systems, ensuring your resume gets past automated filters.
                  </p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm hover:border-[#013f2e]/30 hover:bg-white/10 transition-all duration-300 shadow-xl">
                  <Zap className="w-12 h-12 text-[#013f2e] mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">AI-Powered</h3>
                  <p className="text-gray-300">
                    Get instant AI analysis of your CV with personalized recommendations for improvement.
                  </p>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm hover:border-[#013f2e]/30 hover:bg-white/10 transition-all duration-300 shadow-xl">
                  <BarChart3 className="w-12 h-12 text-[#013f2e] mb-4" />
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
            <div className="max-w-7xl mx-auto">
              <div className="relative rounded-3xl overflow-hidden group shadow-2xl shadow-[#013f2e]/5 border border-[#013f2e]/20 bg-black/60 backdrop-blur-md">
                {/* Dynamic Glow Backdrops */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#013f2e]/25 via-emerald-950/20 to-transparent rounded-full blur-3xl opacity-70 group-hover:opacity-90 transition-opacity duration-1000 -mr-20 -mt-20 pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-950/40 via-lime-950/20 to-transparent rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-1000 -ml-20 -mb-20 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_1000px_at_50%_-100px,#013f2e/15,transparent_75%)] opacity-100 pointer-events-none" />

                {/* Abstract Glowing Tech Circuit / Waves Overlay */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <svg className="absolute w-[150%] h-[150%] -left-[25%] -top-[25%] text-[#013f2e]/10 opacity-30 group-hover:opacity-40 transition-opacity duration-700" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,50 Q25,20 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="animate-pulse" style={{ animationDuration: '8s' }} />
                    <path d="M0,40 Q25,70 50,40 T100,40" fill="none" stroke="currentColor" strokeWidth="0.25" className="animate-pulse" style={{ animationDuration: '12s' }} />
                  </svg>
                  {/* Large abstract glowing orb graphic */}
                  <div className="absolute w-72 h-72 bg-gradient-to-tr from-[#013f2e]/10 to-emerald-500/10 rounded-full blur-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-1000 pointer-events-none" />
                </div>

                <div className="relative p-12 md:p-20 text-center z-10 flex flex-col items-center">
                  <h2 className="text-3xl md:text-6xl font-black text-white mb-6 tracking-tight leading-none max-w-3xl">
                    Ready to Build Your <span className="text-[#013f2e] bg-clip-text bg-gradient-to-r from-[#013f2e] via-[#03694c] to-emerald-400">Perfect CV?</span>
                  </h2>
                  <p className="text-gray-300 mb-10 max-w-3xl text-body md:text-h2 leading-relaxed">
                    Join thousands of professionals who have landed their dream jobs with AIResume. Built in minutes — free to start.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-5 justify-center w-full sm:w-auto">
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center justify-center gap-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white px-12 py-5 rounded-full font-bold active:scale-[0.98] transition-colors duration-200 text-body shadow-lg group/btn"
                    >
                      Start Building Now
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Footer />
        </div>
      </div>
    </>
  )
}



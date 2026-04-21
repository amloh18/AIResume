import type { Metadata } from 'next'
import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Professional CV Templates - ATS-Optimized Resume Templates | CVCircle',
  description: 'Browse our collection of professional, ATS-optimized CV templates. Choose from modern, executive, minimal, and creative designs. All templates are free and optimized for Applicant Tracking Systems.',
  keywords: [
    'CV templates',
    'resume templates',
    'ATS optimized templates',
    'professional CV templates',
    'free resume templates',
    'modern CV templates',
    'executive resume templates',
    'minimal CV templates',
    'creative resume templates',
    'CV template download',
    'resume builder templates',
    'professional resume designs'
  ],
  openGraph: {
    title: 'Professional CV Templates - ATS-Optimized | CVCircle',
    description: 'Browse professional, ATS-optimized CV templates. Modern, executive, and minimal designs - all free and optimized for job applications.',
    url: 'https://cvcircle.io/templates',
    siteName: 'CVCircle',
    images: [
      {
        url: '/images/templates-og.png',
        width: 1200,
        height: 630,
        alt: 'CVCircle Professional CV Templates',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Professional CV Templates - ATS-Optimized',
    description: 'Browse professional, ATS-optimized CV templates. All free and optimized for job applications.',
    images: ['/images/templates-twitter.png'],
  },
  alternates: {
    canonical: 'https://cvcircle.io/templates',
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

export default function TemplatesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Professional CV Templates",
    "description": "Collection of ATS-optimized professional CV and resume templates",
    "url": "https://cvcircle.io/templates",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Designer Modern Template",
          "description": "Modern, creative CV template perfect for design professionals"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Executive Professional Template",
          "description": "Professional executive CV template for senior roles"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Minimal Professional Template",
          "description": "Clean, minimal CV template optimized for ATS systems"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Executive Minimal Template",
          "description": "Minimalist executive CV template with professional design"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Data Driven Pro Template",
          "description": "Data-focused CV template for analytics and tech professionals"
        }
      ]
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
              Professional CV Templates
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Choose from our collection of ATS-optimized, professional CV templates. All templates are free and designed to help you land your dream job.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/sign-up"
                className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors inline-flex items-center gap-2"
              >
                Start Building
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/ai-career-report"
                className="px-8 py-4 bg-transparent border-2 border-[#80FF00] text-[#80FF00] font-semibold rounded-lg hover:bg-[#80FF00]/10 transition-colors inline-flex items-center gap-2"
              >
                Analyze Your CV
                <Sparkles size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* Template Benefits Section */}
        <section className="py-20 px-4 bg-gray-900/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Why Our Templates Work
            </h2>
            <div className="grid tablet:grid-cols-3 gap-8">
              <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                <FileText className="w-12 h-12 text-[#80FF00] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">ATS-Optimized</h3>
                <p className="text-gray-300">
                  Every template is designed to pass Applicant Tracking Systems, ensuring your resume reaches human recruiters.
                </p>
              </div>
              <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                <FileText className="w-12 h-12 text-[#80FF00] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Professional Design</h3>
                <p className="text-gray-300">
                  Clean, modern designs that make a great first impression while maintaining readability and professionalism.
                </p>
              </div>
              <div className="bg-gray-800/50 p-8 rounded-xl border border-gray-700">
                <FileText className="w-12 h-12 text-[#80FF00] mb-4" />
                <h3 className="text-2xl font-bold text-white mb-4">Fully Customizable</h3>
                <p className="text-gray-300">
                  Easily customize colors, fonts, and layouts to match your personal brand and industry requirements.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-[#80FF00]/10 to-blue-500/10 p-12 rounded-2xl border border-[#80FF00]/20">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Create Your Professional CV?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Choose a template and start building your ATS-optimized resume in minutes.
            </p>
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}

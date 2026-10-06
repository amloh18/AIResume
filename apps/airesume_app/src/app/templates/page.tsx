import type { Metadata } from 'next'
import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Resume Templates | ATS-Friendly Professional Resume Templates',
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
    title: 'Professional Resume Templates - ATS-Optimized | AIResume',
    description: 'Browse professional, ATS-optimized resume templates. Modern, executive, and minimal designs - all free and optimized for job applications.',
    url: 'https://buildairesume.com/templates',
    siteName: 'AIResume',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Professional CV Templates - ATS-Optimized',
    description: 'Browse professional, ATS-optimized CV templates. All free and optimized for job applications.',
  },
  alternates: {
    canonical: 'https://buildairesume.com/templates',
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

import ExploreStudioClient from '@/app/explore/page.client';

export default function TemplatesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Professional CV Templates & Snippets Studio",
    "description": "Interactive demo studio of ATS-optimized professional CV templates and modular snippets",
    "url": "https://buildairesume.com/templates",
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Minimalist Single Template",
          "description": "Clean single column ATS template"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Modern Split Two Column Template",
          "description": "Two column split layout separating experience from skills"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Professional Sidebar Template",
          "description": "Full side panel template for dense professional information"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Harvard Executive Academic Template",
          "description": "High-standard executive resume layout"
        }
      ]
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ExploreStudioClient />
    </>
  );
}

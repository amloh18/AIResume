import React from 'react';
import LandingPageContent from '@/components/landing/LandingPageContent';
import { Metadata } from 'next';
import { faqSchema } from '@/components/seo/StructuredData';
import { HOME_FAQ, PRODUCT_FAQ } from '@/data/seo';

export const metadata: Metadata = {
  title: 'AI Resume Builder | Build an ATS-Friendly Resume with AI',
  description: 'Build, optimize, and tailor an ATS-friendly resume with AI. Create professional resumes, improve your content, and prepare every application faster.',
  keywords: [
    'AI resume builder',
    'AI resume writer',
    'resume builder',
    'resume maker',
    'ATS resume builder',
    'ATS-friendly resume',
    'resume optimizer',
    'AI CV builder',
    'CV builder',
    'resume templates',
    'professional resume builder',
    'job-specific resume',
    'tailored resume',
    'resume checker',
    'resume score',
    'AI cover letter generator',
    'job application tracker',
    'AI career tools'
  ],
  alternates: {
    canonical: 'https://buildairesume.com',
  },
  openGraph: {
    title: 'Build. Match. Apply. Get hired. | BuildAIResume',
    description: 'Create once. Tailor for every job. Apply manually or let AI automate your applications.',
    url: 'https://buildairesume.com',
    siteName: 'AIResume',
    locale: 'en_US',
    type: 'website',
  },
};

export default function LandingPage() {
  // Stable @id anchors so the three nodes below resolve to one entity graph instead of three
  // unrelated islands. All three are emitted in a single <script>, and consumers merge JSON-LD across
  // script tags on a page anyway, so the @id references below resolve either way.
  const ORGANIZATION_ID = 'https://buildairesume.com/#organization';
  const WEBSITE_ID = 'https://buildairesume.com/#website';

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      // Brand naming: the product is "AIResume" (domain buildairesume.com). This markup previously
      // alternated between "Build AIResume", "BuildAIResume" and "AIResume", which reads as three
      // different entities. One canonical name, variants declared as `alternateName`.
      "name": "AIResume",
      "alternateName": ["BuildAIResume", "Build AIResume"],
      "url": "https://buildairesume.com",
      "brand": {
        "@type": "Brand",
        "name": "AIResume"
      },
      // Was a bare URL string. `logo` is an ImageObject in schema.org, and the dimensions matter:
      // search engines reject logos below 112×112. This points at the 512×512 icon, whose size is
      // verifiable from the filename, rather than at a favicon.
      "logo": {
        "@type": "ImageObject",
        "url": "https://buildairesume.com/images/icon-512x512.png",
        "width": 512,
        "height": 512
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@buildairesume.com",
        "contactType": "customer support"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      "name": "AIResume",
      "alternateName": ["BuildAIResume", "Build AI Resume"],
      "url": "https://buildairesume.com",
      "inLanguage": "en-US",
      "publisher": { "@id": ORGANIZATION_ID }
      // NOTE: deliberately no `potentialAction`/`SearchAction`. A sitelinks searchbox requires a real
      // public search endpoint, and this site has none — the command bar searches the signed-in
      // user's own CVs and jobs. Declaring a SearchAction would advertise a URL that cannot serve a
      // query. Add it only if a public /search route is built.
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": "https://buildairesume.com/#software",
      "name": "AIResume",
      "alternateName": ["AI Resume Builder", "BuildAIResume"],
      "description": "AIResume is an AI-powered resume builder with ATS optimization, job-specific resume tailoring, resume scoring, AI cover letter generation, professional resume templates, and a job application tracker.",
      "url": "https://buildairesume.com",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free tier available with premium options"
      },
      "featureList": [
        "AI Resume Builder",
        "ATS-Friendly Resume Optimization",
        "Job-Specific Resume Tailoring",
        "Resume Scoring & Checker",
        "AI Cover Letter Generator",
        "Resume Templates",
        "Job Application Tracker"
      ],
      "provider": { "@id": ORGANIZATION_ID },
      "isPartOf": { "@id": WEBSITE_ID }
    }
  ];

  // One array, one source. `components/landing/FAQ.tsx` renders exactly this list as visible
  // accordions — previously the schema here asked for ten questions while the page displayed seven
  // completely different ones, which is invalid FAQ markup. See `src/data/seo.ts`.
  const faqStructuredData = faqSchema([...HOME_FAQ, ...PRODUCT_FAQ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <LandingPageContent />
    </>
  );
}

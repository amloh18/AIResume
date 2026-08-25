import React from 'react';
import LandingPageContent from '@/components/landing/LandingPageContent';
import { Metadata } from 'next';

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
    title: 'Build a Better Resume With AI',
    description: 'Create an ATS-friendly resume, tailor it to every job, and apply with confidence using AI-powered resume tools.',
    url: 'https://buildairesume.com',
    siteName: 'AIResume',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AIResume - Build a Better Resume With AI',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function LandingPage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Build AIResume",
      "url": "https://buildairesume.com",
      "brand": {
        "@type": "Brand",
        "name": "AIResume"
      },
      "logo": "https://buildairesume.com/images/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@buildairesume.com",
        "contactType": "customer support"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "AIResume",
      "url": "https://buildairesume.com",
      "publisher": {
        "@type": "Organization",
        "name": "Build AIResume"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AIResume",
      "alternateName": ["AI Resume Builder", "Build AIResume"],
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
      "provider": {
        "@type": "Organization",
        "name": "Build AIResume",
        "url": "https://buildairesume.com"
      }
    }
  ];

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an AI resume builder?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An AI resume builder uses artificial intelligence to create a professional resume. It generates content from your experience, writes achievement-focused bullet points, optimizes wording for the job you are applying to, and helps you build an ATS-friendly resume faster than writing it by hand."
        }
      },
      {
        "@type": "Question",
        "name": "Is AIResume ATS-friendly?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. AIResume builds resumes with ATS-compatible formatting, clear sections, and simple layouts that applicant tracking systems can parse reliably. Templates are designed to avoid tables and complex styling that commonly break ATS parsers."
        }
      },
      {
        "@type": "Question",
        "name": "Can AIResume tailor my resume to a job?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Paste a job description or a job URL and AIResume analyzes the role, identifies important keywords, compares the job with your resume, and recommends changes. You can rewrite relevant sections to improve alignment with the specific role."
        }
      },
      {
        "@type": "Question",
        "name": "Can I create a resume from scratch?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. You can create a resume from scratch using the AI resume builder. It guides you through each section, generates professional content, and helps you write strong summaries and achievement-focused bullet points."
        }
      },
      {
        "@type": "Question",
        "name": "Can I improve an existing resume?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Upload or paste your existing resume and AIResume will analyze it, improve the content, strengthen weak bullet points, fix formatting, and suggest keywords so your resume performs better with ATS systems and recruiters."
        }
      },
      {
        "@type": "Question",
        "name": "Can I create an AI cover letter?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. The AI cover letter generator creates job-specific cover letters based on your resume and the job description. Each letter is tailored to the role, references your actual achievements, and can be edited before you send it."
        }
      },
      {
        "@type": "Question",
        "name": "What is an ATS?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An ATS (Applicant Tracking System) is software employers use to screen, filter, and manage job applications. It parses resumes and ranks candidates by how well their resume matches the job description. An ATS-friendly resume uses clear formatting and relevant keywords so the system can read and score it correctly."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use AIResume for CVs?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. AIResume works for both resumes and CVs. Use it to create a CV with your full career history or a tailored resume for a specific job. The builder supports both formats with professional templates."
        }
      },
      {
        "@type": "Question",
        "name": "Are the resume templates ATS-friendly?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Every template in AIResume uses ATS-compatible formatting, readable headings, and clean layouts. Choose from professional, modern, and simple resume templates with confidence that applicant tracking systems can parse them."
        }
      },
      {
        "@type": "Question",
        "name": "How does resume scoring work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Resume scoring analyzes your resume against a job description and gives it a score based on keyword matches, skills alignment, readability, and format compatibility. It shows you exactly which keywords and sections to improve so you can strengthen your resume before applying."
        }
      }
    ]
  };

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

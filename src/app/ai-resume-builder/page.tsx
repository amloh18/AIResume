import { Metadata } from 'next';
import AIResumeBuilderPage from './page.client';

export const metadata: Metadata = {
  title: 'AI Resume Builder | ATS-Optimized Resumes & Application Automation',
  description: 'Build an ATS-friendly resume with the perfect balance of authentic storytelling and AI optimization. Create tailored CVs, score keyword matches, and manage applications with confidence.',
  keywords: [
    'AI resume builder',
    'balanced resume builder',
    'ATS resume optimization',
    'tailored resume generator',
    'AI cover letter builder',
    'job application automation',
    'career agent',
    'ATS score checker',
    'resume maker online',
    'professional resume templates'
  ],
  alternates: {
    canonical: 'https://buildairesume.com/ai-resume-builder',
  },
  openGraph: {
    title: 'AI Resume Builder - The Balanced Career Acceleration Platform',
    description: 'Craft ATS-perfect resumes in minutes. Complete candidate control powered by precision AI enhancements.',
    url: 'https://buildairesume.com/ai-resume-builder',
    siteName: 'AIResume',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AIResume - AI Resume Builder',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function Page() {
  return <AIResumeBuilderPage />;
}

import type { Metadata } from 'next';
import ExploreStudioClient from './page.client';

export const metadata: Metadata = {
  title: 'Explore Templates & Snippets Studio | AI Resume Builder',
  description: 'Interactive demo system for AI Resume Step 3 editor. Test 15+ ATS templates, modular section snippets, accent styles, and real-time layout rendering with live mock data.',
  keywords: [
    'CV templates demo',
    'resume snippets',
    'interactive resume builder demo',
    'ATS template explorer',
    'modular resume blocks',
    'Step 3 CV editor preview',
    'AI resume studio'
  ],
  openGraph: {
    title: 'Interactive CV Templates & Snippets Studio | AI Resume',
    description: 'Experiment live with 15+ ATS templates, modular snippets, and typography styling.',
    url: 'https://buildairesume.com/explore',
    siteName: 'AI Resume',
    images: [
      {
        url: '/images/templates-og.png',
        width: 1200,
        height: 630,
        alt: 'AI Resume Templates & Snippets Studio',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: 'https://buildairesume.com/explore',
  },
};

export default function ExplorePage() {
  return <ExploreStudioClient />;
}

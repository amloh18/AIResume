import type { Metadata } from 'next';
import ExploreStudioClient from './page.client';

export const metadata: Metadata = {
  title: 'Explore Templates & Snippets Studio | AI Resume Builder',
  description: 'Interactive demo system for AIResume Step 3 editor. Test 15+ ATS templates, modular section snippets, accent styles, and real-time layout rendering with live mock data.',
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
    title: 'Interactive CV Templates & Snippets Studio | AIResume',
    description: 'Experiment live with 15+ ATS templates, modular snippets, and typography styling.',
    url: 'https://buildairesume.com/explore',
    siteName: 'AIResume',
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    // `/explore` renders the exact same `ExploreStudioClient` body as `/templates` — same 742 words,
    // same H1, only the <title> differs. Two indexable URLs with identical content split the signals
    // for "resume templates" between them, and `/templates` is the page that should hold them.
    // Canonicalising here tells Google to fold this route into `/templates` instead of ranking both.
    canonical: 'https://buildairesume.com/templates',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ExplorePage() {
  return <ExploreStudioClient />;
}

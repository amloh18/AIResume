import type { Metadata } from 'next';
import ExploreJobsClient from './ExploreJobsClient';

/**
 * Public Explore Jobs — indexable, no session required.
 *
 * The middleware denylist in `src/proxy.ts` protects `/dashboard`, `/studio`,
 * `/profile` and `/admin`; `/explore/jobs` is outside all four, so it is public by
 * construction. It is listed explicitly in the `publicRoutes` array there so the
 * intent is documented rather than implied.
 *
 * `robots: index` is deliberate: unlike `/explore` (which canonicalises to
 * `/templates`), this is a real, unique, publicly useful page.
 */
export const metadata: Metadata = {
  title: 'Explore Jobs — Search Open Roles | AIResume',
  description:
    'Browse and search thousands of live job openings by title, company, skills, location, workplace and experience — free, no account needed. Create an account to tailor your CV and apply with AI.',
  keywords: [
    'explore jobs',
    'job search',
    'find jobs',
    'remote jobs',
    'job openings',
    'career opportunities',
    'AI job matching',
  ],
  openGraph: {
    title: 'Explore Jobs — Search Open Roles | AIResume',
    description:
      'Search thousands of live roles for free. Sign in only when you want AI-tailored applications.',
    url: 'https://buildairesume.com/explore/jobs',
    siteName: 'AIResume',
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: 'https://buildairesume.com/explore/jobs',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ExploreJobsPage() {
  return <ExploreJobsClient />;
}

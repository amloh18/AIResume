import type { Metadata } from 'next';

/**
 * Interview Coach is auth-gated (`RouteGuard requireAuth`) and has no standalone search value, so
 * it must not be indexed. Like LinkedIn Enhancer it is a client component and cannot declare
 * metadata itself — hence this sibling layout.
 *
 * The `Disallow: /interview-coach/` line was removed from `robots.txt` at the same time. Disallow
 * prevents the fetch, and a page Google cannot fetch can never be told not to index it; leaving the
 * two in place would keep this directive permanently unread.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function InterviewCoachLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

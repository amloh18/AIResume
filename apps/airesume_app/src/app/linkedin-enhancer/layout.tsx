import type { Metadata } from 'next';

/**
 * LinkedIn Enhancer sits behind `RouteGuard requireAuth`, so a signed-out crawler gets the gate
 * rather than the tool. It was showing up in Google anyway, carrying the *homepage's* title and
 * description because it is a client component and cannot declare its own metadata.
 *
 * A route segment can only declare metadata from a server file, so this sibling layout carries the
 * noindex. The matching `Disallow` was removed from `robots.txt` — that matters: Disallow stops
 * Google fetching the page, which also stops it reading this directive, which is exactly why the
 * page stayed indexed in the first place.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function LinkedInEnhancerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from 'next';

/**
 * Onboarding is a post-signup flow with no standalone search value. `/welcome` is a client component
 * and a route segment can only declare metadata from a server file, so this sibling layout carries
 * the noindex tag.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from 'next';

/**
 * A shared candidate link is addressed by an opaque token and is intended for the recipient only.
 * It must never be indexed. This sibling layout carries the noindex tag so the rule travels with the
 * route rather than relying on a `robots.txt` Disallow.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function SharedCandidateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

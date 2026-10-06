import type { Metadata } from 'next';

/**
 * `/403` is a client component and a route segment can only declare metadata from a server file, so
 * this sibling layout exists purely to carry the noindex tag.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ForbiddenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

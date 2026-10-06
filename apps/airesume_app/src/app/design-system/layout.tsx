import type { Metadata } from 'next';

/**
 * The internal design-system reference is not content. `/design-system` is a client component and a
 * route segment can only declare metadata from a server file, so this sibling layout carries the
 * noindex tag.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

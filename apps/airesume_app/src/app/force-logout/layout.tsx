import type { Metadata } from 'next';

/**
 * `/force-logout` is a utility route with no content. It is a client component and a route segment
 * can only declare metadata from a server file, so this sibling layout carries the noindex tag.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ForceLogoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

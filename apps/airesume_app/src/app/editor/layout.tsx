import type { Metadata } from 'next';

/**
 * The resume editor is an authenticated workspace, not a landing page. It is a client component and a
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

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

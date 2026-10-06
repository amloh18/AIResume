import type { Metadata } from 'next';

/**
 * A payment page must never appear in search results. This sibling layout carries the noindex tag so
 * the rule travels with the route rather than depending on a `robots.txt` Disallow, which only
 * prevents crawling.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

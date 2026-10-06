import type { Metadata } from 'next'

/**
 * `/terms` is a client component, so it cannot export `metadata` itself. This layout gives the route
 * its own title, description and canonical instead of inheriting the homepage's.
 */
export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of AIResume, including accounts, subscriptions and acceptable use.',
  alternates: {
    canonical: 'https://buildairesume.com/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}

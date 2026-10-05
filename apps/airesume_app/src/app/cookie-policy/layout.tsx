import type { Metadata } from 'next'

/**
 * `/cookie-policy` is a client component, so it cannot export `metadata` itself. This layout gives the
 * route its own title, description and canonical instead of inheriting the homepage's.
 */
export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'The cookies AIResume uses, what each one is for, and how to control them in your browser.',
  alternates: {
    canonical: 'https://buildairesume.com/cookie-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function CookiePolicyLayout({ children }: { children: React.ReactNode }) {
  return children
}

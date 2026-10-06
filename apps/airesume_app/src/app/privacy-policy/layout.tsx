import type { Metadata } from 'next'

/**
 * `/privacy-policy` is a client component, so it cannot export `metadata` itself. This layout gives
 * the route its own title, description and canonical instead of inheriting the homepage's.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How AIResume collects, uses, stores and protects your personal data, and the rights you have over it.',
  alternates: {
    canonical: 'https://buildairesume.com/privacy-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children
}

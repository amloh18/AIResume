import type { Metadata } from 'next'

/**
 * `/legal` is a client component, so it cannot export `metadata` itself. This layout exists purely to
 * give the route its own title, description and canonical — without it the page inherits the root
 * layout's title, which is the homepage's, and every legal page would look like a duplicate of `/`.
 */
export const metadata: Metadata = {
  title: 'Legal & Policies',
  description:
    'Privacy, terms of service, cookie policy and support information for AIResume.',
  alternates: {
    canonical: 'https://buildairesume.com/legal',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return children
}

import { Metadata } from 'next'
import CompareResumeBuildersPage from './page.client'
import { JsonLd, breadcrumbSchema } from '@/components/seo/StructuredData'

export const metadata: Metadata = {
  title: 'AIResume vs Resume Builders 2026 - Compare Top Tools',
  description: 'Compare the best resume builders of 2026. Features, pricing, pros and cons of leading resume writing tools.',
  keywords: ['best resume builder', 'resume builder comparison', 'compare resume tools', 'resume builder review'],
  alternates: { canonical: 'https://buildairesume.com/compare/resume-builders' },
}

// No `/compare` index route exists, so the trail stops at Home — a middle crumb pointing at a 404
// would be worse than a shallow one.
const breadcrumb = breadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Best Resume Builders in 2026' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumb} />
      <CompareResumeBuildersPage />
    </>
  )
}

import { Metadata } from 'next'
import CompareResumeBuildersPage from './page.client'

export const metadata: Metadata = {
  title: 'Best Resume Builders 2026 - Compare Top Tools | CVCircle',
  description: 'Compare the best resume builders of 2026. Features, pricing, pros and cons of leading resume writing tools.',
  keywords: ['best resume builder', 'resume builder comparison', 'compare resume tools', 'resume builder review'],
  alternates: { canonical: 'https://cvcircle.io/compare/resume-builders' },
}

export default function Page() {
  return <CompareResumeBuildersPage />
}

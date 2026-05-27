import { Metadata } from 'next'
import DataAnalystExamplePage from './page.client'

export const metadata: Metadata = {
  title: 'Data Analyst Resume Example & Template | CVCircle',
  description: 'Free data analyst resume example with skills, summary, and experience. Download template or build with AI.',
  keywords: ['data analyst resume example', 'data analyst resume template', 'data analyst resume'],
  alternates: { canonical: 'https://cvcircle.io/resume/data-analyst-example' },
}

export default function Page() {
  return <DataAnalystExamplePage />
}

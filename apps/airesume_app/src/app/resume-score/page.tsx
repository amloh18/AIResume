import { Metadata } from 'next'
import ResumeScorePage from './page.client'
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/StructuredData'
import { RESUME_SCORE_FAQ } from '@/data/seo'

export const metadata: Metadata = {
  title: 'Resume Score Checker | Is Your Resume ATS-Ready?',
  description: 'Get a comprehensive resume score analyzing impact, keywords, formatting, and more. Free resume evaluation with actionable tips.',
  keywords: ['resume score', 'resume evaluator', 'resume rating', 'free resume analysis'],
  alternates: { canonical: 'https://buildairesume.com/resume-score' },
}

const breadcrumb = breadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Resume Score Checker' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faqSchema(RESUME_SCORE_FAQ)} />
      <ResumeScorePage />
    </>
  )
}

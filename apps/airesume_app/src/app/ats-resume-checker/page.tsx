import { Metadata } from 'next'
import ATSResumeCheckerPage from './page.client'
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/StructuredData'
import { ATS_CHECKER_FAQ } from '@/data/seo'

export const metadata: Metadata = {
  title: 'AI Resume Checker & ATS Scanner | Improve Your Resume',
  description: 'Check if your resume is ATS-friendly. Free ATS resume checker analyzes keywords, formatting, and scores your resume for Applicant Tracking Systems.',
  keywords: ['ATS resume checker', 'ATS checker', 'free ATS scanner', 'ATS resume test'],
  alternates: { canonical: 'https://buildairesume.com/ats-resume-checker' },
}

const breadcrumb = breadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'ATS Resume Checker' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={faqSchema(ATS_CHECKER_FAQ)} />
      <ATSResumeCheckerPage />
    </>
  )
}

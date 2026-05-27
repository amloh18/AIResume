import { Metadata } from 'next'
import ATSResumeCheckerPage from './page.client'

export const metadata: Metadata = {
  title: 'ATS Resume Checker - Free ATS Resume Scanner | CVCircle',
  description: 'Check if your resume is ATS-friendly. Free ATS resume checker analyzes keywords, formatting, and scores your resume for Applicant Tracking Systems.',
  keywords: ['ATS resume checker', 'ATS checker', 'free ATS scanner', 'ATS resume test'],
  alternates: { canonical: 'https://cvcircle.io/ats-resume-checker' },
}

export default function Page() {
  return <ATSResumeCheckerPage />
}

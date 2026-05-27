import { Metadata } from 'next'
import ResumeScorePage from './page.client'

export const metadata: Metadata = {
  title: 'Resume Score - Check Your Resume Strength | CVCircle',
  description: 'Get a comprehensive resume score analyzing impact, keywords, formatting, and more. Free resume evaluation with actionable tips.',
  keywords: ['resume score', 'resume evaluator', 'resume rating', 'free resume analysis'],
  alternates: { canonical: 'https://cvcircle.io/resume-score' },
}

export default function Page() {
  return <ResumeScorePage />
}

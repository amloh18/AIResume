import { Metadata } from 'next'
import AIResumeBuilderPage from './page.client'

export const metadata: Metadata = {
  title: 'AI Resume Builder | Create Your Resume With AI',
  description: 'Create ATS-optimized resumes with our AI-powered resume builder. Choose from professional templates, get AI suggestions, and export to PDF. Free to start.',
  keywords: [
    'AI resume builder',
    'resume builder',
    'create resume online',
    'free resume builder',
    'professional resume maker',
    'online resume builder',
    'AI resume writer',
    'ATS resume builder'
  ],
  alternates: {
    canonical: 'https://buildairesume.com/ai-resume-builder',
  },
}

export default function Page() {
  return <AIResumeBuilderPage />
}

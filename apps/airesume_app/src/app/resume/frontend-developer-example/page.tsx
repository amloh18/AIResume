import { Metadata } from 'next'
import FrontendDeveloperExamplePage from './page.client'

export const metadata: Metadata = {
  title: 'Frontend Developer Resume Example & Template',
  description: 'Free frontend developer resume example with UI/UX skills and projects. Build with AI.',
  keywords: ['frontend developer resume example', 'frontend developer resume template', 'UI developer resume'],
  alternates: { canonical: 'https://buildairesume.com/resume/frontend-developer-example' },
}

export default function Page() {
  return <FrontendDeveloperExamplePage />
}

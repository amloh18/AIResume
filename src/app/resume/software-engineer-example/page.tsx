import { Metadata } from 'next'
import SoftwareEngineerExamplePage from './page.client'

export const metadata: Metadata = {
  title: 'Software Engineer Resume Example & Template',
  description: 'Free software engineer resume example with tech stack, projects, and experience. Build with AI.',
  keywords: ['software engineer resume example', 'software engineer resume template', 'developer resume'],
  alternates: { canonical: 'https://buildairesume.com/resume/software-engineer-example' },
}

export default function Page() {
  return <SoftwareEngineerExamplePage />
}

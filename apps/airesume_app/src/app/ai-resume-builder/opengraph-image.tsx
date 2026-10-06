import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Segment-scoped card. Required because `app/ai-resume-builder/page.tsx` exports its own `openGraph`,
 * which makes Next drop any inherited image — see the header comment in `@/lib/og/card`.
 */
export const alt =
  'AIResume AI resume builder — ATS-optimised resumes with authentic, candidate-controlled content.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'AI RESUME BUILDER',
    title: 'The Balanced AI Resume Builder',
    subtitle:
      'Craft an ATS-perfect resume in minutes, with authentic storytelling and you in control of every word.',
  })
}

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Segment-scoped card. Required because `app/features/page.tsx` exports its own `openGraph`, which
 * makes Next drop any inherited image — see the header comment in `@/lib/og/card`.
 */
export const alt =
  'AIResume features — AI resume analysis, ATS optimisation, job tracking and professional templates.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'FEATURES',
    title: 'AI-Powered Resume Features',
    subtitle:
      'ATS optimisation, job-specific tailoring, resume scoring, cover letters and application tracking.',
  })
}

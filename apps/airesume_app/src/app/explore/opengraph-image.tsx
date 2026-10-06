import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Segment-scoped card. Required because `app/explore/page.tsx` exports its own `openGraph`, which
 * makes Next drop any inherited image — see the header comment in `@/lib/og/card`.
 */
export const alt =
  'AIResume Templates & Snippets Studio — try 15+ ATS templates and modular resume sections live.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'STUDIO',
    title: 'Templates & Snippets Studio',
    subtitle:
      'Experiment live with 15+ ATS templates, modular section snippets and typography styling.',
  })
}

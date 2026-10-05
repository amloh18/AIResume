import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Segment-scoped card. Required because `app/templates/page.tsx` exports its own `openGraph`, which
 * makes Next drop any inherited image — see the header comment in `@/lib/og/card`.
 */
export const alt =
  'AIResume templates — professional, ATS-optimised resume and CV layouts, free to use.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'TEMPLATES',
    title: 'ATS-Friendly Resume Templates',
    subtitle:
      'Modern, executive, minimal and creative layouts — each one built to parse cleanly in an ATS.',
  })
}

import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Segment-scoped fallback card for `/profile/<username>`.
 *
 * This only applies when the page does NOT set `openGraph.images`. `app/profile/[username]/page.tsx`
 * deliberately omits the key when the user has no avatar so that this card is used instead — see the
 * comment there. If the page set `images: []`, Next would count that as an explicit choice and this
 * file would be ignored.
 */
export const alt = 'AIResume — a professional profile with experience, skills and portfolio.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'PROFILE',
    title: 'Professional Profile',
    subtitle: "Experience, skills and portfolio, shared by the candidate on AIResume.",
  })
}

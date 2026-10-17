import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Social card for `/explore/jobs`.
 *
 * This segment declares its own `openGraph` in `page.tsx`, which REPLACES the inherited object
 * wholesale — the root `app/opengraph-image.tsx` does not reach here. See the header comment in
 * `@/lib/og/card` before removing this file.
 */
export const alt = 'AIResume job listings — fresh, relevant, actionable roles updated daily.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'JOBS',
    title: 'Fresh Jobs Worth Applying To',
    subtitle: 'Curated open roles matched to your skills — updated daily, no stale listings.',
  })
}

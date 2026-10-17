import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Social card for `/explore/jobs/[id]`.
 *
 * The job detail page declares its own `openGraph` (with the canonical slug URL), which replaces
 * the inherited object — so this segment needs its own card file or shared links render with no
 * preview image at all. See the header comment in `@/lib/og/card`.
 *
 * Deliberately generic rather than per-job: this route is `force-dynamic`, and rendering an image
 * per job would add a DB read per share. A consistent branded card beats a broken one.
 */
export const alt = 'AIResume job listing — view the role and prepare your application.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'JOB',
    title: 'This Role Is Hiring on AIResume',
    subtitle: 'Tailor your CV to the listing, prepare your answers, and track the application.',
  })
}

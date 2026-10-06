import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Default social card for the homepage and for any route that does NOT export its own `openGraph`.
 *
 * ⚠️ This file does NOT cover nested routes that declare their own `openGraph` — Next replaces the
 * accumulated `openGraph` object in that case, so those routes need their own `opengraph-image.tsx`.
 * Read the header comment in `@/lib/og/card` before assuming otherwise.
 */
export const alt =
  'AIResume — build an ATS-friendly resume, tailor it for every job, and track every application.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    title: 'Build. Match. Apply. Get hired.',
    subtitle:
      'AI resume builder with ATS scoring, job-specific tailoring and application tracking.',
  })
}

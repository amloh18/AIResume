import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from '@/lib/og/card'

/**
 * Segment-scoped card for `/resume/<role>`.
 *
 * Required because `app/resume/[role]/page.tsx` exports its own `openGraph`, which makes Next drop
 * any inherited image — see the header comment in `@/lib/og/card`.
 *
 * Deliberately static (no `params`): one branded card covers every role. That keeps this file free
 * of dynamic-rendering concerns at build time.
 */
export const alt =
  'AIResume role-specific resume examples and ATS-optimised templates, free to start.'

export const size = OG_SIZE

export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgCard({
    eyebrow: 'RESUME EXAMPLES',
    title: 'Resume Examples & Templates',
    subtitle:
      'Role-specific resume examples, the skills that matter, and expert tips — build yours free.',
  })
}

import { ImageResponse } from 'next/og'

/**
 * Shared Open Graph / Twitter card renderer.
 *
 * ⚠️ WHY EVERY ROUTE THAT SETS `openGraph` NEEDS ITS OWN `opengraph-image.tsx`
 *
 * Next applies a segment's `opengraph-image` file to that segment only. When a page exports its own
 * `openGraph` object, Next REPLACES the accumulated `openGraph` wholesale rather than merging it —
 * see `case 'openGraph'` in `node_modules/next/dist/lib/metadata/resolve-metadata.js`, which assigns
 * `newResolvedMetadata.openGraph = resolveOpenGraph(metadata.openGraph, ...)`. `resolveOpenGraph`
 * then sets `images` from that page's own `og.images`, so an inherited image is dropped.
 * `mergeStaticMetadata` (same file) is the only thing that puts `images` back, and it restores them
 * from a file convention **in the same segment** — it early-returns when that segment has no
 * metadata files, and `resolveStaticMetadata(tree[2])` only ever reads the current segment.
 *
 * Net effect: a single `app/opengraph-image.tsx` does NOT cover nested routes that declare their own
 * `openGraph`. It covers the homepage (same segment as the file) and any route that sets no
 * `openGraph` of its own. Every route that does set one needs its own card file — that is why the
 * routes under `app/features`, `app/templates`, `app/explore` and `app/ai-resume-builder` each ship
 * an `opengraph-image.tsx` that calls `renderOgCard` here.
 *
 * Drawn with plain CSS and text only: no font files, no external assets, nothing that can 404 at
 * build time. Text renders with the font `@vercel/og` bundles. Next statically optimises these at
 * build time, and `twitter-image` falls back to them automatically.
 */

/** 1200×630 is the 1.91:1 ratio both Open Graph and `summary_large_image` expect. */
export const OG_SIZE = { width: 1200, height: 630 } as const

export const OG_CONTENT_TYPE = 'image/png'

// Brand palette, matching the app: cream surface, deep green ink, lime accent.
const CREAM = '#f3f2ee'
const GREEN = '#013f2e'
const MUTED = '#5b6656'
const HAIRLINE = 'rgba(1, 63, 46, 0.18)'

export function renderOgCard({
  eyebrow,
  title,
  subtitle,
}: {
  /** Optional short section label, e.g. "Templates". Rendered as a pill next to the wordmark. */
  eyebrow?: string
  title: string
  subtitle: string
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: CREAM,
          padding: '72px 80px',
        }}
      >
        {/* Wordmark + optional section pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: CREAM,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: GREEN }}>
            AIResume
          </div>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                marginLeft: 8,
                padding: '8px 20px',
                borderRadius: 999,
                border: `1px solid ${HAIRLINE}`,
                color: MUTED,
                fontSize: 21,
                letterSpacing: 2,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: GREEN,
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 1010,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 28, color: MUTED, lineHeight: 1.4, maxWidth: 960 }}>
            {subtitle}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 24,
            color: MUTED,
          }}
        >
          <div style={{ display: 'flex' }}>buildairesume.com</div>
          <div style={{ display: 'flex', color: GREEN, fontWeight: 600 }}>
            Build. Match. Apply. Get hired.
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}

import Link from 'next/link'

/**
 * Structured-data primitives shared by the marketing pages.
 *
 * Everything here returns plain schema.org objects or renders the `<script type="application/ld+json">`
 * tag that carries them. The visible FAQ markup lives with the page that owns it (usually a client
 * component), while the schema is emitted from the server `page.tsx` — both import the same constant
 * from `@/data/seo` so the two can never drift apart. Google rejects FAQ markup that does not match
 * what a human sees on the page.
 */

const SITE_URL = 'https://buildairesume.com'

export function absoluteUrl(path: string): string {
  return path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export type BreadcrumbItem = { name: string; path?: string }

/**
 * Breadcrumb schema. Google reads this for the breadcrumb trail under a result, and Search Console
 * has a dedicated "Breadcrumbs" enhancement report for it — which stays empty on any page that omits
 * it. The last item is normally the current page and carries no `item`, per Google's own examples.
 */
export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      ...(entry.path ? { item: absoluteUrl(entry.path) } : {}),
    })),
  }
}

/**
 * Visible breadcrumb trail. Rendered alongside `breadcrumbSchema` — markup that describes a trail
 * nobody can see is the kind of mismatch Google discounts.
 */
export function Breadcrumbs({
  items,
  className = '',
  center = false,
}: {
  items: BreadcrumbItem[]
  className?: string
  center?: boolean
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={`flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 ${
          center ? 'justify-center' : ''
        }`}
      >
        {items.map((entry, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={entry.name} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="text-gray-600">/</span> : null}
              {entry.path && !isLast ? (
                <Link href={entry.path} className="hover:text-gray-300 transition-colors">
                  {entry.name}
                </Link>
              ) : (
                <span className={isLast ? 'text-gray-300' : undefined}>{entry.name}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export type FaqItem = { question: string; answer: string }

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

// No per-page `SoftwareApplication` helper on purpose. The homepage already declares that entity
// once, with a stable `@id` (`https://buildairesume.com/#software`) and a `provider`/`isPartOf`
// graph. Declaring it again on `/ai-resume-builder` without the same `@id` would present search
// engines with two competing identities for one product — the exact problem the homepage markup
// was rewritten to fix. Reference the existing `@id` if a subpage ever needs it.

/**
 * Visible FAQ list.
 *
 * It renders only the markup: the matching `faqSchema` is emitted from the route's server
 * `page.tsx`, which is guaranteed to be in the initial HTML response. Both read the same constant
 * from `@/data/seo`, so schema and copy cannot drift apart. Do not move the schema in here if the
 * host component is a client component — inline JSON-LD from the client bundle is not worth betting
 * a rich result on.
 */
export function FaqSection({
  items,
  title = 'Frequently asked questions',
  headingLevel = 'h2',
  className = '',
  link,
}: {
  items: FaqItem[]
  title?: string
  headingLevel?: 'h2' | 'h3'
  className?: string
  link?: { href: string; label: string }
}) {
  const Heading = headingLevel
  return (
    <section className={className}>
      <Heading className="text-2xl sm:text-3xl font-bold text-white mb-8">{title}</Heading>
      <div className="space-y-3">
        {items.map(({ question, answer }) => (
          <details
            key={question}
            className="group bg-[#1a1f1a]/50 rounded-xl border border-white/5 overflow-hidden open:border-white/10"
          >
            <summary className="cursor-pointer list-none px-5 py-4 text-white font-semibold text-sm sm:text-base flex items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
              {question}
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-emerald-400 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">{answer}</p>
          </details>
        ))}
      </div>
      {link ? (
        <p className="mt-8 text-sm">
          <Link href={link.href} className="text-emerald-400 hover:text-emerald-300 font-semibold">
            {link.label} →
          </Link>
        </p>
      ) : null}
    </section>
  )
}

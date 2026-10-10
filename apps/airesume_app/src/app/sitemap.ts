import { MetadataRoute } from 'next'
import { getAllArticles } from '@/data/blogs'
import { getDb } from '@/lib/db'
import { PUBLIC_OPEN_STATUSES, buildJobSlug } from '@/lib/jobs/publicJobView'

/**
 * Cap on job URLs emitted from the sitemap. A sitemap file is limited to 50,000
 * URLs / 50 MB, and a "every job ever" sitemap is mostly dead weight — Google
 * wants the canonical, still-open listings. The newest N open roles are plenty;
 * older ones remain reachable and crawlable through `/explore/jobs`.
 */
const MAX_JOB_SITEMAP_URLS = 2000

/*
  Rendered per request rather than prerendered at build.

  A `sitemap.js` route handler is cached by default, which meant the build (where
  MongoDB is not reachable) baked in a sitemap with no job URLs at all and then
  served that for up to an hour after every deploy. Declaring the route dynamic
  removes the build-time dependency entirely — the DB read happens on request and
  the CDN absorbs the traffic.
*/
export const dynamic = 'force-dynamic'

/**
 * Sitemap.
 *
 * Only routes that are BOTH public and indexable belong here — a sitemap entry pointing at a page
 * that `robots.txt` disallows (or that 404s) is a contradictory signal. Authenticated surfaces
 * (`/dashboard`, `/editor`, `/admin`, `/profile`, `/auth`), checkout (`/razorpay`) and internal
 * previews (`/design-system`, `/403`) are deliberately absent.
 *
 * `lastModified` is emitted ONLY where a real content date exists (blog articles, from `post.date`).
 * For pages whose content lives in the repository there is no accurate date available at runtime, and
 * defaulting it to build time would stamp every URL with "changed just now" on every deploy. Google
 * ignores a `lastmod` it finds consistently inaccurate, so a wrong value is worse than omitting it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://buildairesume.com'

  const page = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    lastModified?: Date
  ) => ({
    url: `${baseUrl}${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  })

  // ── Landing & primary product pages ────────────────────────────────────
  const staticPages = [
    page('', 1.0, 'daily'),
    page('/ai-resume-builder', 0.9, 'weekly'),
    page('/templates', 0.9, 'weekly'),
    page('/ats-resume-checker', 0.9, 'weekly'),
    page('/resume-score', 0.9, 'weekly'),
    page('/features', 0.9, 'weekly'),
    page('/blog', 0.8, 'weekly'),
    // Public job discovery. `/explore/jobs` is indexable (unlike `/explore`,
    // which canonicalises to `/templates`) and is the hub for the job detail
    // pages emitted below.
    page('/explore/jobs', 0.9, 'daily'),
  ]

  // ── Free tools ─────────────────────────────────────────────────────────
  // `/explore` is absent on purpose: it renders the identical body as `/templates` and now carries a
  // canonical pointing there, so listing it would advertise a non-canonical URL. Sitemaps should
  // contain canonical URLs only.
  //
  // `/interview-coach` and `/linkedin-enhancer` are wrapped in `<RouteGuard requireAuth>` and are
  // marked `noindex` — they are not indexable pages. Note that `robots.txt` does NOT disallow them
  // any more: a Disallow stops Google from fetching the page, which also stops it from ever reading
  // the noindex directive. Listing them here would advertise a redirect, so they stay out.
  const toolSitemapEntries: MetadataRoute.Sitemap = []

  // ── Role-specific resume pages ─────────────────────────────────────────
  const rolePages = [
    'data-analyst',
    'software-engineer',
    'frontend-developer',
    'backend-developer',
    'fullstack-developer',
    'product-manager',
    'business-analyst',
    'data-scientist',
    'ui-ux-designer',
    'devops-engineer',
  ]

  const roleSitemapEntries = rolePages.map((role) => page(`/resume/${role}`, 0.8, 'weekly'))

  // ── Worked examples ────────────────────────────────────────────────────
  const examplePages = [
    'resume/data-analyst-example',
    'resume/software-engineer-example',
    'resume/frontend-developer-example',
  ]

  const exampleSitemapEntries = examplePages.map((path) => page(`/${path}`, 0.7, 'monthly'))

  // ── Blog ───────────────────────────────────────────────────────────────
  // Registry articles are flat: /blog/<slug>.
  const articles = getAllArticles()
  const blogPostSitemapEntries = articles.map((post) =>
    page(`/blog/${post.slug}`, 0.7, 'monthly', new Date(post.date))
  )

  // Hand-written long-form guides that live at their own nested paths rather than in the registry.
  const editorialPages = [
    'blog/ats-optimization/ats-tips',
    'blog/resume-writing/fresher-resume-guide',
    'blog/resume-writing/resume-mistakes',
    'blog/resume-writing/tech-resume-format',
  ]

  const editorialSitemapEntries = editorialPages.map((path) => page(`/${path}`, 0.7, 'monthly'))

  // ── Comparisons ────────────────────────────────────────────────────────
  const comparisonPages = [
    'compare/ai-resume-vs-cakeresume',
    'compare/resume-builders',
  ]

  const comparisonSitemapEntries = comparisonPages.map((path) => page(`/${path}`, 0.8, 'monthly'))

  // ── Legal & policy ─────────────────────────────────────────────────────
  const legalPages = [
    '/legal',
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
    '/legal/support',
    '/privacy-policy',
    '/terms',
    '/cookie-policy',
  ]

  const legalSitemapEntries = legalPages.map((path) => page(path, 0.3, 'yearly'))

  // ── Public job listings ────────────────────────────────────────────────
  // Only OPEN listings are advertised (a closed role must not be indexed as an
  // open one). The whole section is best-effort: if the database is unreachable
  // the sitemap still renders every static entry rather than 500ing.
  let jobSitemapEntries: MetadataRoute.Sitemap = []
  try {
    const db = await getDb()
    const rows = await db
      .collection('jobs')
      .find({ status: { $in: [...PUBLIC_OPEN_STATUSES] } })
      // `title` + `company.name` are projected because the slug is DERIVED from
      // them — there is no slug column to select.
      .project({ canonicalId: 1, title: 1, 'company.name': 1, lastVerifiedAt: 1, postedAt: 1 })
      .sort({ postedAt: -1 })
      .limit(MAX_JOB_SITEMAP_URLS)
      .toArray()

    // The sitemap must advertise the SAME url the page actually serves, or every
    // submitted url is a redirect. `buildJobSlug` reads exactly the fields
    // projected above, so the two can never disagree.
    const seen = new Set<string>()
    jobSitemapEntries = rows
      .filter((row: any) => typeof row?.canonicalId === 'string' && row.canonicalId.length > 0)
      .flatMap((row: any) => {
        const path = `/explore/jobs/${buildJobSlug(row)}`
        // A duplicate url makes the sitemap invalid, so collapse any collision
        // rather than emitting the same path twice.
        if (seen.has(path)) return []
        seen.add(path)
        return [page(path, 0.6, 'daily', row.lastVerifiedAt || row.postedAt || undefined)]
      })
  } catch (error) {
    console.warn('[sitemap] public job listings unavailable, emitting static entries only:', error)
  }

  return [
    ...staticPages,
    ...jobSitemapEntries,
    ...toolSitemapEntries,
    ...roleSitemapEntries,
    ...exampleSitemapEntries,
    ...blogPostSitemapEntries,
    ...editorialSitemapEntries,
    ...comparisonSitemapEntries,
    ...legalSitemapEntries,
  ]
}

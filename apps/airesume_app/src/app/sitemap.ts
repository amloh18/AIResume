import { MetadataRoute } from 'next'
import { getAllArticles } from '@/data/blogs'

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
export default function sitemap(): MetadataRoute.Sitemap {
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

  return [
    ...staticPages,
    ...toolSitemapEntries,
    ...roleSitemapEntries,
    ...exampleSitemapEntries,
    ...blogPostSitemapEntries,
    ...editorialSitemapEntries,
    ...comparisonSitemapEntries,
    ...legalSitemapEntries,
  ]
}

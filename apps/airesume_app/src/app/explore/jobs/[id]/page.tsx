import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { getDb } from '@/lib/db';
import { toPublicJobDetail, type PublicJobDetail } from '@/lib/jobs/publicJobView';
import { findPublicJobByIdentifier } from '@/lib/jobs/jobIdentifier';
import PublicApplyButton from '@/components/jobs/PublicApplyButton';
import Footer from '@/components/landing/Footer';
import { MapPin, Building2, Briefcase, Calendar, DollarSign, CheckCircle2, ArrowLeft } from 'lucide-react';

/**
 * Public job detail — server-rendered so it is indexable and works on a hard
 * reload, a direct link and a back/forward navigation without a session.
 *
 * The listing is read straight from the canonical `jobs` collection through the
 * same explicit public projection the API uses, so there is exactly one
 * definition of "what is public" (`PUBLIC_JOB_PROJECTION`).
 *
 * `cache()` dedupes the read between `generateMetadata` and the page body.
 */
/**
 * Server-rendered on demand — deliberately NOT a `generateStaticParams` route.
 *
 * ⚠️ Do not add `export function generateStaticParams() { return [] }` here.
 *
 * The "return an empty array to defer every path to the first runtime visit"
 * pattern is documented for ISR, but on Next 16.3.3 in this app it registers the
 * route as static-with-zero-entries and then **500s every request** — including
 * the valid ones — with `digest: 'DYNAMIC_SERVER_USAGE'`. Measured on a production
 * build (`next start`), same page with only the config varying:
 *
 *   generateStaticParams -> []  + revalidate 300   ->  /ok 500,  /missing 500
 *   generateStaticParams -> []  (no revalidate)    ->  /ok 500,  /missing 500
 *   no generateStaticParams     + revalidate 300   ->  /ok 200,  /missing 200  ✅
 *   no generateStaticParams     (no revalidate)    ->  /ok 200,  /missing 200  ✅
 *   `dynamic = 'force-dynamic'`                    ->  /ok 200,  /missing 200  ✅
 *
 * The 500 also swallowed the `notFound()` state, so an unknown or expired listing
 * rendered "Internal Server Error" instead of `not-found.tsx`. `revalidate` was
 * not the trigger — the empty param list was.
 *
 * `revalidate` is kept to express the intended freshness window; the listing read
 * goes through the raw Mongo driver (not `fetch`), so the effective freshness is
 * the page render itself.
 */
export const revalidate = 300;

interface ResolvedJob {
  job: PublicJobDetail;
  /** The canonical readable slug — the one URL this job should be reachable at. */
  slug: string;
  /** The requested segment was a legacy id or a drifted slug, so redirect to `slug`. */
  needsRedirect: boolean;
}

const resolveJob = cache(async (identifier: string): Promise<ResolvedJob | null> => {
  try {
    const db = await getDb();
    // Accepts the readable slug, the legacy sha256 canonicalId and a raw ObjectId
    // — one shared resolver, so the page and the public API cannot disagree.
    const found = await findPublicJobByIdentifier(db, identifier);
    if (!found) return null;
    return {
      job: toPublicJobDetail(found.raw),
      slug: found.slug,
      needsRedirect: found.needsRedirect,
    };
  } catch (error) {
    // A DB error must not leak internals to an anonymous visitor — render the
    // same not-found state as an unknown id.
    console.error('[explore/jobs/[id]] failed to load job:', error);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveJob(id);

  if (!resolved) {
    return {
      // No `| AIResume` here — the root layout's `title.template` ('%s | AIResume')
      // already appends the brand, and adding it again renders it twice.
      title: 'Job not found',
      robots: { index: false, follow: true },
    };
  }

  const { job, slug, needsRedirect } = resolved;

  // ── One URL per job ────────────────────────────────────────────────────────
  // A legacy sha256 link, a raw ObjectId link, or a slug whose readable words
  // drifted all resolve above; here they converge onto the canonical slug so
  // shared links and crawlers never split authority across two URLs.
  //
  // ⚠️ The redirect is thrown from `generateMetadata`, NOT from the page body.
  // Next flushes the `<head>` as soon as this function resolves, so by the time
  // the page body runs the response has already started — a redirect there can
  // no longer change the status line and is silently degraded to
  // `200 OK` + `<meta http-equiv="refresh">` + an inline `location.replace()`.
  // Measured on this route: page-body redirect → 200 (body absent, meta refresh
  // present); metadata redirect → a real 308. Browsers follow both, but only the
  // latter is a redirect as far as crawlers and link checkers are concerned.
  //
  // `permanentRedirect` emits 308. For a GET navigation 308 is the modern spelling
  // of 301 — same permanence, same link-equity transfer — and it is the only
  // permanent-redirect primitive the App Router exposes from a server component.
  // A slug URL never reaches this branch, which is what stops the redirect from
  // looping.
  if (needsRedirect) permanentRedirect(`/explore/jobs/${slug}`);

  const title = `${job.title} at ${job.company.name}`;
  const locationSuffix = job.location.label ? ` · ${job.location.label}` : '';
  const description = job.description
    ? job.description.slice(0, 155)
    : `Apply to ${job.title} at ${job.company.name}${locationSuffix}. View the full listing on AIResume.`;

  // Canonical points at the SLUG url, never the requested one: a legacy hash link
  // that is still in the wild must consolidate onto the readable URL rather than
  // compete with it as a duplicate.
  const canonicalUrl = `https://buildairesume.com/explore/jobs/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'AIResume',
      locale: 'en_US',
      type: 'article',
    },
    // A closed listing stays reachable for historical context but must not be
    // indexed as an open role.
    robots: job.openForApplication
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

/**
 * Google requires `datePosted`, `title`, `description`, `hiringOrganization` and
 * a location before a `JobPosting` may be emitted. We only emit when every
 * required field is genuinely present — a partial block is worse than none.
 */
function buildJobPostingJsonLd(job: PublicJobDetail): Record<string, any> | null {
  if (!job.title || !job.company.name || !job.description || !job.postedDate) return null;
  if (!job.location.label && !job.location.remote) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description.slice(0, 5000),
    datePosted: job.postedDate,
    ...(job.expiresAt ? { validThrough: job.expiresAt } : {}),
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company.name,
      ...(job.company.domain ? { sameAs: `https://${job.company.domain}` } : {}),
    },
    ...(job.location.remote
      ? { jobLocationType: 'TELECOMMUTE' }
      : {
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              ...(job.location.city ? { addressLocality: job.location.city } : {}),
              ...(job.location.state ? { addressRegion: job.location.state } : {}),
              ...(job.location.country ? { addressCountry: job.location.country } : {}),
            },
          },
        }),
    ...(job.employmentType ? { employmentType: job.employmentType.toUpperCase().replace(/[\s-]+/g, '_') } : {}),
    ...(job.salary && (job.salary.min || job.salary.max)
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.salary.currency || 'USD',
            value: {
              '@type': 'QuantitativeValue',
              ...(job.salary.min ? { minValue: job.salary.min } : {}),
              ...(job.salary.max ? { maxValue: job.salary.max } : {}),
              unitText: (job.salary.period || 'YEAR').toUpperCase(),
            },
          },
        }
      : {}),
    // Attribution to the original source, as required for aggregated listings.
    ...(job.source?.name ? { url: job.applyUrl } : {}),
  };
}

function formatSalary(job: PublicJobDetail): string | null {
  if (!job.salary) return null;
  const { min, max, currency, period } = job.salary;
  if (!min && !max) return null;
  const cur = currency ? ` ${currency}` : '';
  const suffix = period ? ` / ${period.toLowerCase()}` : '';
  if (min && max) return `${min.toLocaleString()}${cur} – ${max.toLocaleString()}${cur}${suffix}`;
  return `${(min || max)!.toLocaleString()}${cur}${suffix}`;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolved = await resolveJob(id);

  if (!resolved) notFound();

  const { job, slug, needsRedirect } = resolved;

  // The redirect that produces the real HTTP 308 lives in `generateMetadata` —
  // see the note there for why it cannot live here. This second check is
  // deliberate belt-and-braces: if the flush ordering ever changes (a `loading.tsx`
  // added above this route, a Next upgrade), it keeps a legacy URL from silently
  // serving a duplicate of the slug page. It is unreachable today.
  if (needsRedirect) permanentRedirect(`/explore/jobs/${slug}`);

  const jsonLd = buildJobPostingJsonLd(job);
  const salary = formatSalary(job);
  const posted = formatDate(job.postedDate);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0f0b] text-gray-900 dark:text-white">
      {jsonLd && (
        <script
          type="application/ld+json"
          // Serialising a value we constructed — not user HTML.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d0f0b]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#013f2e] text-[#36D39B] dark:bg-lime-500 dark:text-black">
              AI
            </span>
            <span className="text-base sm:text-lg">AIResume</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="px-3.5 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-3.5 py-2 rounded-xl text-sm font-bold bg-[#013f2e] text-white hover:bg-[#02523c] dark:bg-lime-500 dark:text-black transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/explore/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore Jobs
        </Link>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">
          {/* ── Listing ─────────────────────────────────────────────── */}
          <article className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{job.title}</h1>
                <p className="mt-1.5 flex items-center gap-2 text-base font-semibold text-gray-700 dark:text-gray-300">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {job.company.name}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {job.location.label}
                  </span>
                  {job.employmentType && (
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {job.employmentType.replace(/[_-]+/g, ' ')}
                    </span>
                  )}
                  {posted && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Posted {posted}
                    </span>
                  )}
                  {salary && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      {salary}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.location.workplaceType && (
                    <Chip>{job.location.workplaceType}</Chip>
                  )}
                  {job.seniority && <Chip>{job.seniority}</Chip>}
                  {job.department && <Chip>{job.department}</Chip>}
                  {!job.openForApplication && <Chip tone="danger">Closed</Chip>}
                </div>
              </div>
            </div>

            {job.skills.length > 0 && (
              <section className="mt-7">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Skills
                </h2>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {job.skills.map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                </div>
              </section>
            )}

            <Section title="About the role" items={null} text={job.description} />

            {job.responsibilities.length > 0 && (
              <Section title="Responsibilities" items={job.responsibilities} />
            )}
            {job.requiredQualifications.length > 0 && (
              <Section title="Required qualifications" items={job.requiredQualifications} />
            )}
            {job.preferredQualifications.length > 0 && (
              <Section title="Preferred qualifications" items={job.preferredQualifications} />
            )}

            {job.experience?.level || job.experience?.minYears != null ? (
              <section className="mt-7">
                <h2 className="text-lg font-extrabold">Experience</h2>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {job.experience?.level ? `${job.experience.level}` : 'Experience'}
                  {job.experience?.minYears != null ? ` · ${job.experience.minYears}+ years` : ''}
                </p>
              </section>
            ) : null}

            {job.source?.name && (
              <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
                Source: {job.source.name}
                {job.lastVerifiedAt ? ` · last verified ${formatDate(job.lastVerifiedAt)}` : ''}
              </p>
            )}
          </article>

          {/* ── Apply rail ──────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-5 bg-gray-50/60 dark:bg-white/[0.03]">
              <h2 className="text-base font-extrabold">Prepare your application</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                AIResume tailors your CV and cover letter to this listing and tracks the application.
              </p>
              <div className="mt-4">
                <PublicApplyButton
                  canonicalId={job.canonicalId}
                  openForApplication={job.openForApplication}
                  applyUrl={job.applyUrl}
                />
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#36D39B] shrink-0 mt-0.5" />
                Requirement-to-CV evidence matching
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#36D39B] shrink-0 mt-0.5" />
                ATS-optimized tailored CV &amp; cover letter
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#36D39B] shrink-0 mt-0.5" />
                Journey tracking from saved to offer
              </li>
            </ul>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone?: 'danger' }) {
  const cls =
    tone === 'danger'
      ? 'border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
      : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${cls}`}>
      {children}
    </span>
  );
}

function Section({
  title,
  items,
  text,
}: {
  title: string;
  items: string[] | null;
  text?: string;
}) {
  if (items && items.length === 0) return null;
  if (!items && !text) {
    return (
      <section className="mt-7">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
          The employer did not provide a detailed description for this role.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-7">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {text && (
        <div className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {text}
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#36D39B] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

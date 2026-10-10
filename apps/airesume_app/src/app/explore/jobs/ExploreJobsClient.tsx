'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JobCard } from '@/components/jobs/JobCard';
import type { JobListing } from '@/types/automation-schema';
import type { PublicJobSummary, PublicJobsListResponse } from '@/lib/jobs/publicJobView';
import { buildPublicApplyHref } from '@/lib/jobs/publicJobHandoff';
import Footer from '@/components/landing/Footer';
import {
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Briefcase,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';

/**
 * Public Explore Jobs.
 *
 * Everything on this page is reachable **without a session**. It reads only from
 * `/api/public/jobs`, which returns a strict public projection of the canonical
 * `jobs` collection — never the authenticated discover payload.
 *
 * Deliberately absent (all user-scoped, all protected):
 *   - Recommended / Saved segments
 *   - per-user match scores and explanations
 *   - application status, Journey progress, quota counters
 *   - Save / tailor / generate actions
 *
 * The only action that touches the account is "Apply with AIResume", which routes
 * through the existing sign-in flow carrying the canonical job id.
 */

interface Filters {
  q: string;
  location: string;
  workplaceType: string;
  experienceLevel: string;
  employmentType: string;
  datePosted: string;
  sort: string;
}

const EMPTY_FILTERS: Filters = {
  q: '',
  location: '',
  workplaceType: '',
  experienceLevel: '',
  employmentType: '',
  datePosted: '',
  sort: 'recent',
};

const PAGE_SIZE = 18;

/** Adapt a public summary onto the shared card's job shape. */
function toCardJob(job: PublicJobSummary): JobListing & { openForApplication: boolean } {
  return {
    _id: job.id,
    id: job.id,
    title: job.title,
    company: job.company.name,
    companyLogo: job.company.logoUrl,
    location: job.location.label,
    remote: job.location.remote,
    salaryMin: job.salary?.min,
    salaryMax: job.salary?.max,
    salaryCurrency: job.salary?.currency,
    // No match score for anonymous visitors — the shared card hides the pill at 0.
    matchScore: 0,
    source: (job.atsType as any) || 'unknown',
    atsType: (job.atsType as any) || 'unknown',
    applyUrl: job.applyUrl || '',
    postedDate: job.postedDate ? new Date(job.postedDate) : undefined,
    keywords: job.skills,
    userId: '',
    openForApplication: job.openForApplication,
  } as unknown as JobListing & { openForApplication: boolean };
}

export default function ExploreJobsClient() {
  const router = useRouter();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<PublicJobSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce only the free-text query; dropdowns apply immediately.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(filters.q.trim()), 350);
    return () => clearTimeout(t);
  }, [filters.q]);

  // Any filter change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedQuery,
    filters.location,
    filters.workplaceType,
    filters.experienceLevel,
    filters.employmentType,
    filters.datePosted,
    filters.sort,
  ]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (filters.location.trim()) params.set('location', filters.location.trim());
      if (filters.workplaceType) params.set('workplaceType', filters.workplaceType);
      if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel);
      if (filters.employmentType) params.set('employmentType', filters.employmentType);
      if (filters.datePosted) params.set('datePosted', filters.datePosted);
      params.set('sort', filters.sort);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/public/jobs?${params.toString()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        setError(
          res.status === 429
            ? 'Too many searches just now. Please wait a moment and try again.'
            : `We couldn't load jobs right now (error ${res.status}). Please try again.`
        );
        setJobs([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }

      const data: PublicJobsListResponse = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 0);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError('We couldn\u2019t load jobs right now. Please try again.');
      setJobs([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, page]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const activeFilterCount = useMemo(
    () =>
      [
        filters.q.trim(),
        filters.location.trim(),
        filters.workplaceType,
        filters.experienceLevel,
        filters.employmentType,
        filters.datePosted,
      ].filter(Boolean).length,
    [filters]
  );

  const clearAll = () => setFilters({ ...EMPTY_FILTERS });

  // Navigate by the readable slug, never by the raw canonicalId. The detail route
  // still accepts the canonicalId (and redirects it to the slug), but the URL a
  // visitor sees and shares must be the readable one.
  const openDetail = (job: PublicJobSummary) => router.push(`/explore/jobs/${encodeURIComponent(job.slug)}`);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0f0b] text-gray-900 dark:text-white">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d0f0b]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#013f2e] text-[#36D39B] dark:bg-lime-500 dark:text-black">
              AI
            </span>
            <span className="text-base sm:text-lg">AIResume</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/explore/jobs"
              className="hidden sm:inline text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Explore Jobs
            </Link>
            <Link
              href="/sign-in"
              className="px-3.5 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-white/15 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-3.5 py-2 rounded-xl text-sm font-bold bg-[#013f2e] text-white hover:bg-[#02523c] dark:bg-lime-500 dark:text-black dark:hover:bg-lime-400 transition-colors"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Explore jobs — no account needed
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Search thousands of live roles across AIResume&apos;s job network. Browse and read full
            listings freely. When you&apos;re ready to prepare an application, create an account and
            AIResume tailors your CV and cover letter for that exact role.
          </p>
        </div>

        {/* ── Search + filters ─────────────────────────────────────────── */}
        <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.03] p-3.5 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Search job title, company, skills or keywords…"
                aria-label="Search jobs"
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:border-[#36D39B] focus:ring-2 focus:ring-[#36D39B]/20"
              />
            </div>
            <div className="relative sm:w-64">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                placeholder="City or country"
                aria-label="Filter by location"
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:border-[#36D39B] focus:ring-2 focus:ring-[#36D39B]/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Workplace"
              value={filters.workplaceType}
              onChange={(v) => setFilters((f) => ({ ...f, workplaceType: v }))}
              options={[
                { value: '', label: 'Any' },
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'onsite', label: 'On-site' },
              ]}
            />
            <FilterSelect
              label="Experience"
              value={filters.experienceLevel}
              onChange={(v) => setFilters((f) => ({ ...f, experienceLevel: v }))}
              options={[
                { value: '', label: 'Any' },
                { value: 'entry', label: 'Entry level' },
                { value: 'mid', label: 'Mid level' },
                { value: 'senior', label: 'Senior' },
                { value: 'lead', label: 'Lead / Principal' },
              ]}
            />
            <FilterSelect
              label="Employment"
              value={filters.employmentType}
              onChange={(v) => setFilters((f) => ({ ...f, employmentType: v }))}
              options={[
                { value: '', label: 'Any' },
                { value: 'full_time', label: 'Full-time' },
                { value: 'part_time', label: 'Part-time' },
                { value: 'contract', label: 'Contract' },
                { value: 'internship', label: 'Internship' },
              ]}
            />
            <FilterSelect
              label="Posted"
              value={filters.datePosted}
              onChange={(v) => setFilters((f) => ({ ...f, datePosted: v }))}
              options={[
                { value: '', label: 'Any time' },
                { value: '24h', label: 'Past 24 hours' },
                { value: '7d', label: 'Past 7 days' },
                { value: '30d', label: 'Past month' },
              ]}
            />
            <FilterSelect
              label="Sort"
              value={filters.sort}
              onChange={(v) => setFilters((f) => ({ ...f, sort: v || 'recent' }))}
              options={[
                { value: 'recent', label: 'Newest' },
                { value: 'oldest', label: 'Oldest' },
                { value: 'salary', label: 'Highest salary' },
                { value: 'title', label: 'Title A–Z' },
              ]}
            />

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────────────────── */}
        <div className="mt-6 flex items-baseline justify-between gap-3">
          <p className="text-sm font-bold">
            {loading ? 'Searching…' : `${total.toLocaleString()} ${total === 1 ? 'job' : 'jobs'} found`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sign in to see your personal match scores and apply with AI-tailored documents.
          </p>
        </div>

        {loading ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[300px] rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100/60 dark:bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-gray-200 dark:border-white/10 p-10 text-center">
            <RefreshCw className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 px-4 py-2 rounded-xl bg-[#013f2e] text-white text-sm font-bold hover:bg-[#02523c] dark:bg-lime-500 dark:text-black transition-colors"
            >
              Try again
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-bold">No jobs match your search</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Try a different keyword, widen the location, or clear the filters to see everything in
              the network.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/15 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job, index) => {
                const cardJob = toCardJob(job);
                return (
                  <JobCard
                    key={job.id}
                    job={cardJob}
                    variant="public"
                    colorIndex={index}
                    isSaved={false}
                    saving={false}
                    tracker={null}
                    onOpen={() => openDetail(job)}
                    onSave={() => {
                      /* no-op: saving requires an account */
                    }}
                    onApply={() => router.push(buildPublicApplyHref(job.canonicalId))}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav
                className="mt-8 flex items-center justify-center gap-2"
                aria-label="Pagination"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm font-semibold px-3 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        )}

        {/* ── Conversion block ─────────────────────────────────────────── */}
        <div className="mt-12 rounded-3xl border border-[#36D39B]/30 bg-[#013f2e] dark:bg-[#0f1a14] p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#36D39B]" />
                Apply faster with AIResume
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Create a free account to see how well each role matches your CV, get an ATS-optimized
                tailored resume and cover letter for the job, and track every application in one
                place.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/sign-up"
                className="px-5 py-3 rounded-xl bg-[#36D39B] text-[#013f2e] text-sm font-extrabold hover:brightness-105 transition-all"
              >
                Create free account
              </Link>
              <Link
                href="/sign-in"
                className="px-5 py-3 rounded-xl border border-white/20 text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="inline-flex items-center gap-2 h-9 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs font-bold outline-none cursor-pointer dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-gray-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

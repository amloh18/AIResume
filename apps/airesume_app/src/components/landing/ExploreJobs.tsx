'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  Search,
  MapPin,
  Sparkles,
  Zap,
  Briefcase,
  Clock,
} from 'lucide-react';
import type { PublicJobSummary, PublicJobsListResponse } from '@/lib/jobs/publicJobView';

/**
 * Landing section: job discovery + auto-apply.
 *
 * Two product pillars either side of the authentication boundary, and the copy
 * says so on purpose:
 *
 *   - **Explore Jobs is public.** No account, no sign-in wall — every card links
 *     straight into `/explore/jobs`.
 *   - **Auto-apply needs an account.** It consumes the application pipeline and
 *     plan quota, so that CTA routes to sign-up rather than pretending it is free.
 *
 * The job cards are REAL listings from `/api/public/jobs` — the same public
 * projection the Explore Jobs page renders. This section used to show two mock
 * panels with invented Linear/Stripe/Figma rows, which said nothing about
 * whether the product actually has jobs. If the fetch fails the section degrades
 * to the browse CTA rather than to placeholder data.
 */

const LIVE_JOB_COUNT = 3;

function postedLabel(postedDate?: string): string | null {
  if (!postedDate) return null;
  const posted = new Date(postedDate).getTime();
  if (Number.isNaN(posted)) return null;

  const minutes = Math.floor((Date.now() - posted) / 60_000);
  if (minutes < 60) return minutes <= 1 ? 'Just posted' : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return null;
}

export default function ExploreJobs() {
  const [jobs, setJobs] = useState<PublicJobSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/public/jobs?pageSize=${LIVE_JOB_COUNT}&sort=recent`,
          { signal: controller.signal, headers: { Accept: 'application/json' } },
        );
        if (!res.ok) throw new Error(`Jobs request failed (${res.status})`);
        const data = (await res.json()) as PublicJobsListResponse;
        setJobs(Array.isArray(data.jobs) ? data.jobs.slice(0, LIVE_JOB_COUNT) : []);
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        console.error('[landing/ExploreJobs] Could not load live jobs:', error);
        setFailed(true);
        setJobs([]);
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <section id="explore-jobs" className="relative pt-28 pb-32 bg-[#0a0a0c] overflow-hidden">
      {/* Background ambient glows — matches the Features section. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 15% 20%, rgba(1, 63, 46, 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 85% 40%, rgba(20, 184, 166, 0.09) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 90%, rgba(1, 63, 46, 0.2) 0%, transparent 65%),
            linear-gradient(180deg, #0a0a0c 0%, #0e1013 50%, #060708 100%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* ── Heading ─────────────────────────────────────────────────── */}
        <motion.div
          className="mb-12 lg:mb-14 flex flex-col items-start text-left"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 flex justify-start">
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
              <path
                d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] tracking-tighter max-w-5xl mb-6 text-left text-4xl! tracking-normal!">
            Discover jobs.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">
              Apply on autopilot.
            </span>
          </h2>

          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 font-normal max-w-3xl leading-relaxed text-left">
            Browse thousands of live roles for free — no account needed. When you&apos;re ready,
            AIResume tailors your CV and cover letter and submits the application for you.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/explore/jobs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#36D39B] text-[#013f2e] text-sm font-extrabold hover:brightness-105 transition-all shadow-[0_0_25px_rgba(54,211,155,0.25)]"
            >
              <Search className="w-4 h-4" />
              Explore Jobs — free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm font-bold hover:bg-white/[0.08] transition-colors"
            >
              <Zap className="w-4 h-4 text-[#36D39B]" />
              Start auto-applying
            </Link>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Browsing is public. Auto-apply needs a free account — it uses your application quota.
          </p>
        </motion.div>

        {/* ── Live roles ──────────────────────────────────────────────── */}
        <div className="mb-6 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight">Live right now</h3>
          </div>
          <Link
            href="/explore/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition-colors"
          >
            Browse all open roles
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(jobs === null || (jobs.length === 0 && !failed)) &&
            Array.from({ length: LIVE_JOB_COUNT }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                aria-hidden="true"
                className="h-[148px] rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse"
              />
            ))}

          {jobs?.map((job) => {
            const posted = postedLabel(job.postedDate);
            const initial = (job.company.name || '?').trim().charAt(0).toUpperCase();

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <Link
                  href={`/explore/jobs/${job.slug || job.canonicalId}`}
                  className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#111317]/80 p-5 hover:border-emerald-500/40 hover:bg-[#13161c] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#1d222e] border border-white/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 overflow-hidden">
                        {job.company.logoUrl ? (
                          // Employer logos are arbitrary remote urls; a broken image
                          // must not leave an empty square, so the initial stays behind it.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={job.company.logoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          initial
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-300 truncate">
                        {job.company.name}
                      </span>
                    </div>
                    {posted && (
                      <span className="shrink-0 text-[10px] font-bold text-orange-400 whitespace-nowrap">
                        {posted}
                      </span>
                    )}
                  </div>

                  <h4 className="mt-3 text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {job.title}
                  </h4>

                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{job.location.label || 'Location not specified'}</span>
                  </div>

                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-1.5">
                    {job.location.remote && (
                      <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                        Remote
                      </span>
                    )}
                    {job.employmentType && (
                      <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full font-medium capitalize">
                        {job.employmentType.replace(/[_-]+/g, ' ')}
                      </span>
                    )}
                    {job.salary?.min != null && (
                      <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full font-medium">
                        {job.salary.currency || ''}{Math.round(job.salary.min / 1000)}k+
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {/* No live listings (or the request failed): one honest card that still routes to jobs. */}
          {jobs !== null && jobs.length === 0 && (
            <Link
              href="/explore/jobs"
              className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-300">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Fresh roles land every day</span>
              </div>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                {failed
                  ? 'Live listings could not be loaded here, but the full job search is available.'
                  : 'The job feed is between syncs. Open the full search to see every open role.'}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                Open job search <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          )}
        </div>

        {/* ── Auto-apply strip ────────────────────────────────────────── */}
        <motion.div
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#111317]/80 p-5 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                Approved applications, prepared and submitted for you
              </p>
              <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
                Pick a role, review the tailored CV and cover letter, and let the deterministic engine
                fill the ATS form. You approve; it does the typing.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-gray-300 sm:inline-flex">
              <Clock className="w-3 h-3 text-emerald-400" />
              Review before submit
            </span>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.1] transition-colors"
            >
              Create a free account
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

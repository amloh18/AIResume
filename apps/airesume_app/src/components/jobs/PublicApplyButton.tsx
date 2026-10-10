'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { buildPublicApplyHref, buildPublicSignUpHref } from '@/lib/jobs/publicJobHandoff';

/**
 * The primary CTA on a public job detail page.
 *
 * Three distinct outcomes, kept visually and semantically separate so the product
 * never implies something it did not do:
 *
 *   1. **Apply with AIResume** — routes through the existing sign-in flow with the
 *      canonical job id preserved. No application is created here; no quota is
 *      consumed. That only happens after authentication.
 *   2. **Open the employer's listing** — a plain external link, clearly labelled.
 *      Opening it does NOT mean AIResume submitted anything.
 *   3. **Closed listing** — the CTAs are replaced by an honest unavailable notice.
 */
export default function PublicApplyButton({
  canonicalId,
  openForApplication,
  applyUrl,
}: {
  canonicalId: string;
  openForApplication: boolean;
  applyUrl?: string;
}) {
  const router = useRouter();

  if (!openForApplication) {
    return (
      <div className="rounded-2xl border border-amber-300/50 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4" />
          This listing is no longer accepting applications
        </p>
        <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/70">
          It is shown for reference. Search for similar open roles in Explore Jobs.
        </p>
        <button
          type="button"
          onClick={() => router.push('/explore/jobs')}
          className="mt-3 px-4 py-2 rounded-xl bg-[#013f2e] text-white text-xs font-bold hover:bg-[#02523c] dark:bg-lime-500 dark:text-black transition-colors"
        >
          Browse open jobs
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => router.push(buildPublicApplyHref(canonicalId))}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#013f2e] text-white text-sm font-extrabold hover:bg-[#02523c] dark:bg-lime-500 dark:text-black dark:hover:bg-lime-400 transition-colors shadow-sm"
      >
        <Sparkles className="w-4 h-4" />
        Apply with AIResume
      </button>

      <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400 text-center">
        You&apos;ll create an account (or sign in) so AIResume can tailor your CV and cover letter for
        this exact role, then track the application. Nothing is submitted until you approve it.
      </p>

      {applyUrl && (
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 text-sm font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View on employer&apos;s site
        </a>
      )}

      <p className="text-[11px] leading-snug text-gray-400 dark:text-gray-500 text-center">
        The employer link opens their own application page — AIResume has not submitted anything for
        you.
      </p>

      <button
        type="button"
        onClick={() => router.push(buildPublicSignUpHref(canonicalId))}
        className="w-full text-xs font-bold text-[#013f2e] dark:text-[#36D39B] hover:underline"
      >
        New to AIResume? Create a free account
      </button>
    </div>
  );
}

import Link from 'next/link';
import { SearchX } from 'lucide-react';

/**
 * Not-found state for a public job detail.
 *
 * Shown for an unknown id, a deleted listing, or a transient DB failure — the
 * three are deliberately indistinguishable, so an anonymous visitor can never
 * tell "this job exists but you cannot see it" from "this job does not exist".
 */
export default function PublicJobNotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0f0b] text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#013f2e] text-[#36D39B] dark:bg-lime-500 dark:text-black">
              AI
            </span>
            <span className="text-base sm:text-lg">AIResume</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <SearchX className="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-5" />
        <h1 className="text-2xl font-extrabold">This job listing is unavailable</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          It may have been filled, removed, or the link may be out of date. Plenty of other roles are
          still open.
        </p>
        <Link
          href="/explore/jobs"
          className="mt-6 inline-flex px-5 py-3 rounded-xl bg-[#013f2e] text-white text-sm font-bold hover:bg-[#02523c] dark:bg-lime-500 dark:text-black transition-colors"
        >
          Browse Explore Jobs
        </Link>
      </main>
    </div>
  );
}

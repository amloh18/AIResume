'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Sparkles,
  MapPin,
  Building2,
  Quote,
  Star,
  Plus,
  BookOpen,
  Users,
  X,
} from 'lucide-react';

export function LinkedInHeroCardSkeleton() {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border border-[var(--border-primary)]">
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
        {/* Left: Original Profile */}
        <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Original Profile
            </span>
          </div>
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2.5" />
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Enhanced Profile */}
        <div className="flex-1 p-6 relative flex flex-col space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Enhanced
              </span>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>

          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-full shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-full mb-1.5" />
              <Skeleton className="h-4 w-4/5 mb-2.5" />
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
          </div>

          {/* Rationale box */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 block mb-1.5">
              Why this change?
            </span>
            <Skeleton className="h-3.5 w-full mb-1.5" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-2 border-t border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInAboutCardSkeleton() {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border border-[var(--border-primary)]">
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
        {/* Left: Original About */}
        <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Original About
            </span>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>

        {/* Right: AI Enhanced About */}
        <div className="flex-1 p-6 relative flex flex-col space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Enhanced
              </span>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>

          {/* Hook (Mobile Visible) */}
          <div className="relative pl-4">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
            <div className="flex items-center gap-1.5 mb-1.5">
              <Quote className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Hook (Mobile Visible)
              </span>
            </div>
            <Skeleton className="h-3.5 w-full mb-1.5" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* Body Lines */}
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>

          {/* Call to Action Box */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-lg p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
              Call to Action
            </span>
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* Rationale box */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 block mb-1.5">
              Why this change?
            </span>
            <Skeleton className="h-3.5 w-full mb-1.5" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-2 border-t border-[var(--border-primary)] flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInExperienceCardSkeleton() {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border border-[var(--border-primary)]">
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
        {/* Left: Original Experience */}
        <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Original Experience
            </span>
          </div>
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className={`flex gap-4 ${i === 1 ? 'pb-6 border-b border-[var(--border-primary)]' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-28" />
                  <div className="space-y-1.5 pt-1">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI Enhanced Experience */}
        <div className="flex-1 p-6 relative flex flex-col space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Enhanced
              </span>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>

          <div className="space-y-6 flex-1">
            {[1, 2].map((i) => (
              <div key={i} className={`flex gap-4 ${i === 1 ? 'pb-6 border-b border-[var(--border-primary)]' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-32" />

                  {/* Enhanced Bullets */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <Skeleton className="h-3.5 w-11/12" />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <Skeleton className="h-3.5 w-4/5" />
                    </div>
                  </div>

                  {/* Tagged skills */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <Skeleton className="h-4 w-14 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>

                  {/* Why this change box */}
                  {i === 1 && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-2.5 mt-2">
                      <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 block mb-1">
                        Why this change?
                      </span>
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  )}

                  {/* Action row */}
                  <div className="pt-2 flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-7 w-7 rounded-lg" />
                      <Skeleton className="h-7 w-16 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInSkillsCardSkeleton() {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden shadow-xs border border-[var(--border-primary)]">
      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-primary)]">
        {/* Left: Original Skills */}
        <div className="flex-1 p-5 sm:p-6 bg-[var(--bg-tertiary)]/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Original Skills
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-7 w-20 sm:w-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right: AI Enhanced Skills */}
        <div className="flex-1 p-6 relative flex flex-col space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Enhanced
              </span>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>

          <div className="space-y-4">
            {/* Top priority skills */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Top Priority Skills
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            </div>

            {/* Suggested additions */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400" />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Suggested Additions
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-7 w-28 rounded-full" />
                ))}
              </div>
            </div>

            {/* Industry Specific */}
            <div>
              <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-2">
                Industry Specific
              </span>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInProfileInsightsSkeleton() {
  return (
    <div className="w-full lg:w-[420px] flex-shrink-0 sticky top-4 h-[calc(100vh-140px)] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center bg-[var(--bg-tertiary)]/50 shrink-0">
        <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-lime-400 animate-pulse" />
          <span>Profile Insights</span>
        </h3>
        <div className="p-1.5 text-[var(--text-tertiary)] opacity-60">
          <X className="w-4 h-4" />
        </div>
      </div>

      {/* Sidebar Scrollable Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {/* Recommended Courses Card */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              Recommended Courses for Profile Insights
            </h3>
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 bg-[var(--bg-tertiary)]/50 rounded-xl border border-[var(--border-primary)] space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Networking Groups Card */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-emerald-600 dark:text-lime-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">
              Networking Groups
            </h3>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 bg-[var(--bg-tertiary)]/50 border border-[var(--border-primary)] rounded-xl"
              >
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LinkedInCtaChecklistSkeleton() {
  const sections = [
    'Headline & Info',
    'About Summary',
    'Experience',
    'Education',
    'Projects',
    'Skills',
    'Languages',
  ];

  return (
    <div className="mt-8 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 shadow-xs">
      <div className="mb-4 text-center">
        <Skeleton className="h-4 w-52 mx-auto mb-2" />
        <Skeleton className="h-3 w-96 max-w-full mx-auto" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {sections.map((label, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50"
          >
            <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Skeleton className="h-11 w-56 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Full LinkedIn Enhancer Skeleton Loader matching the loaded page UI structure.
 */
export default function LinkedInEnhancerSkeleton() {
  return (
    <div className="w-full">
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap justify-between items-center bg-[var(--bg-secondary)] rounded-2xl shadow-xs border border-[var(--border-primary)] p-4 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                AI Enhancement Plan
              </span>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400" />
                <span>Insights</span>
              </div>
            </div>
          </div>

          {/* Section Cards matching exact page order & split cards */}
          <LinkedInHeroCardSkeleton />
          <LinkedInAboutCardSkeleton />
          <LinkedInExperienceCardSkeleton />
          <LinkedInSkillsCardSkeleton />

          {/* Bottom CTA application checklist */}
          <LinkedInCtaChecklistSkeleton />
        </div>

        {/* Right Side Panel - Profile Insights Sidebar Skeleton */}
        <LinkedInProfileInsightsSkeleton />
      </div>
    </div>
  );
}

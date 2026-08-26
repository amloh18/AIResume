'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Sparkles,
  Loader2,
  X,
  Bookmark,
  ExternalLink,
  Zap,
  MapPin,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useApplyProgress } from '@/hooks/useApplyProgress';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
import { EntitlementNotice, EntitlementNoticeData } from '@/components/jobs/EntitlementNotice';
import CompanyLogo from '@/components/ui/CompanyLogo';
import type { JobListing } from '@/types/automation-schema';

export interface TopMatchJob {
  _id: string;
  title: string;
  company: string;
  location: string;
  experienceYears?: number;
  postedAgo: string;
  matchScore: number;
  skills: string[];
  companyLogo?: string;
  applyUrl: string;
  source: string;
  salary?: string;
  matchReasons?: string[];
  rawJob: JobListing;
}

export default function TopJobMatchesSection() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { updateProgress } = useNotifications();
  const applyProgress = useApplyProgress();

  const [jobs, setJobs] = useState<TopMatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [entitlementNoticeData, setEntitlementNoticeData] = useState<EntitlementNoticeData | null>(null);
  const [entitlementNoticeOpen, setEntitlementNoticeOpen] = useState(false);

  // Load saved job IDs for this user
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function loadSaved() {
      try {
        const res = await fetch('/api/jobs?limit=100&lite=true', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const items = data.jobs || data.data || [];
          if (Array.isArray(items)) {
            const set = new Set<string>();
            items.forEach((j: any) => {
              if (j._id) set.add(j._id);
              if (j.id) set.add(j.id);
              if (j.jobId) set.add(j.jobId);
            });
            setSavedIds(set);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Failed to load saved jobs in TopMatches:', err);
        }
      }
    }
    loadSaved();
    return () => controller.abort();
  }, [userId]);

  const fetchTopMatches = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/jobs/discover?limit=10&sortBy=matchScore', { signal });
      if (!res.ok) {
        throw new Error('Failed to fetch job matches');
      }
      const data = await res.json();
      const rawList: any[] = data.jobs || data.data || [];

      if (Array.isArray(rawList)) {
        // Exclude applied jobs and take top 5
        const eligible = rawList
          .filter((j) => !appliedIds.has(j._id) && !appliedIds.has(j.id))
          .slice(0, 5);

        const mapped: TopMatchJob[] = eligible.map((job: any) => {
          let salaryStr: string | undefined = undefined;
          if (job.salaryMin || job.salaryMax) {
            const cur = job.salaryCurrency === 'INR' || job.salaryCurrency === '₹' ? '₹' : (job.salaryCurrency || '$');
            const min = (job.salaryMin || 0).toLocaleString();
            const max = (job.salaryMax || 0).toLocaleString();
            salaryStr = `${cur}${min} - ${max}`;
          }

          // Build explainable match reasons
          const reasons: string[] = [];
          if (job.matchScore >= 90) reasons.push('Excellent match');
          else if (job.matchScore >= 80) reasons.push('Strong match');
          else if (job.matchScore >= 70) reasons.push('Good match');

          if (job.location?.toLowerCase().includes('remote')) reasons.push('Remote');

          return {
            _id: job._id || job.id,
            title: job.title || job.jobTitle,
            company: job.company,
            location: job.location || 'Remote',
            experienceYears: job.experienceYears,
            postedAgo: job.postedDate
              ? `${Math.max(1, Math.floor((Date.now() - new Date(job.postedDate).getTime()) / 86400000))}d ago`
              : 'Recently',
            matchScore: job.matchScore || 0,
            skills: job.keywords?.slice(0, 3) || [],
            companyLogo: job.companyLogo,
            applyUrl: job.applyUrl || job.jobUrl || '',
            source: job.source || 'discovery',
            salary: salaryStr,
            matchReasons: reasons,
            rawJob: job as JobListing,
          };
        });

        setJobs(mapped);
      } else {
        setJobs([]);
      }
    } catch (err: any) {
      console.error('Error in fetchTopMatches:', err);
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [appliedIds]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTopMatches(controller.signal);
    return () => controller.abort();
  }, [fetchTopMatches]);

  const handlePass = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    // Optimistic UI: remove immediately, revert on failure
    const previousJobs = jobs;
    setJobs((prev) => prev.filter((j) => j._id !== id));
    try {
      const res = await fetch('/api/jobs/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id }),
      });
      if (!res.ok) {
        // Revert optimistic update on failure
        setJobs(previousJobs);
        toast({ title: 'Failed to dismiss job', variant: 'destructive' });
      }
    } catch {
      setJobs(previousJobs);
      toast({ title: 'Failed to dismiss job', variant: 'destructive' });
    }
    toast({
      title: 'Job Dismissed',
      description: 'We will suggest different matching roles.',
    });
  };

  const handleSaveToggle = async (job: TopMatchJob, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const isSaved = savedIds.has(job._id);
    setSavingId(job._id);

    try {
      if (isSaved) {
        const res = await fetch(`/api/jobs/${job._id}`, { method: 'DELETE' });
        if (res.ok || res.status === 404) {
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(job._id);
            return next;
          });
          toast({ title: 'Removed from saved jobs' });
        }
      } else {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: job.title,
            company: job.company,
            location: job.location,
            jobUrl: job.applyUrl,
            status: 'saved',
            matchScore: job.matchScore,
            source: job.source,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const createdId = data._id || data.id || job._id;
          setSavedIds((prev) => new Set(prev).add(job._id).add(createdId));
          toast({ title: 'Saved to your shortlist' });
        }
      }
    } catch {
      toast({ title: 'Failed to update saved job', variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const handleApply = async (job: TopMatchJob | JobListing, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    const targetJob = 'rawJob' in job ? job.rawJob : job;
    const jobId = targetJob._id || targetJob.id || '';
    const appId = `apply-${jobId}`;

    // Start progress toast
    applyProgress.startApplyProgress(targetJob.title);
    updateProgress(appId, 15, `Matching CV for ${targetJob.title}...`, 'progress');

    try {
      applyProgress.updateToTailoring(targetJob.title, targetJob.company);
      updateProgress(appId, 45, `Tailoring application for ${targetJob.company}...`, 'progress');

      const res = await fetch('/api/jobs/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          title: targetJob.title,
          company: targetJob.company,
          location: targetJob.location,
          source: targetJob.source,
          jobUrl: targetJob.applyUrl,
          description: targetJob.description,
          atsType: targetJob.atsType || 'unknown',
          salary: targetJob.salaryMin || targetJob.salaryMax ? {
            min: targetJob.salaryMin,
            max: targetJob.salaryMax,
            currency: targetJob.salaryCurrency || '$',
            period: 'yearly',
          } : undefined,
          matchScore: targetJob.matchScore,
          screeningQuestions: [],
        }),
      });

      const resData = await res.json();

      // Check for entitlement / plan block outcome
      if (res.status === 403 || resData.code === 'AUTO_APPLY_NOT_INCLUDED' || resData.code === 'AUTO_APPLY_LIMIT_REACHED') {
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: resData.code || 'AUTO_APPLY_NOT_INCLUDED',
          jobTitle: targetJob.title,
          company: targetJob.company,
          applyUrl: targetJob.applyUrl || resData.fallbackUrl,
          message: resData.message || resData.error,
          entitlements: resData.entitlements,
          recommendation: resData.recommendation,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      // Verification / Unknown outcome
      if (resData.code === 'APPLICATION_VERIFICATION_FAILED') {
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: 'APPLICATION_VERIFICATION_FAILED',
          jobTitle: targetJob.title,
          company: targetJob.company,
          applyUrl: targetJob.applyUrl,
          message: resData.message,
        });
        setEntitlementNoticeOpen(true);
        return;
      }

      applyProgress.updateToSubmitting(targetJob.company);
      updateProgress(appId, 80, `Submitting application to ${targetJob.company}...`, 'progress');

      if (res.ok && resData.success) {
        const createdId = resData.applicationId || jobId;
        setAppliedIds((prev) => new Set(prev).add(jobId));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
        }

        applyProgress.completeApply(targetJob.title, targetJob.company, true, resData.message);
        updateProgress(appId, 100, `Applied to ${targetJob.title}!`, 'progress');
      } else {
        // Genuine submission failure
        applyProgress.cancelProgress();
        setEntitlementNoticeData({
          code: 'APPLICATION_FAILED',
          jobTitle: targetJob.title,
          company: targetJob.company,
          applyUrl: targetJob.applyUrl,
          message: resData.error || resData.message || "We couldn't complete the application on the employer's site.",
        });
        setEntitlementNoticeOpen(true);
      }
    } catch (err: any) {
      applyProgress.cancelProgress();
      setEntitlementNoticeData({
        code: 'APPLICATION_FAILED',
        jobTitle: targetJob.title,
        company: targetJob.company,
        applyUrl: targetJob.applyUrl,
        message: err.message || 'Network error occurred during submission.',
      });
      setEntitlementNoticeOpen(true);
    }
  };

  const handleOpenDetail = (job: TopMatchJob) => {
    setSelectedJob(job.rawJob);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Top job matches
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Jobs selected for you based on your profile and preferences.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200/80 dark:border-white/10 p-4 animate-pulse bg-white dark:bg-[#141810]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="flex gap-1 mb-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-14" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-xl w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Top job matches
          </h2>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-8 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-9 h-9 text-amber-500 mb-3" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            Couldn&apos;t load your recommendations
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            Your job matches are still available in Discover.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchTopMatches()}
              className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] dark:bg-[#013f2e] text-white dark:text-black text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/jobs?tab=discover')}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-all"
            >
              Open Discover
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Top job matches
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Jobs selected for you based on your profile and preferences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/dashboard/jobs?tab=discover')}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-gray-400 dark:hover:border-white/20 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Browse jobs</span>
          </button>
        </div>
      </div>

      {/* Cards Grid or Empty State UI */}
      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#36D39B]/15 flex items-center justify-center mb-3 text-[#013f2e] dark:text-[#36D39B]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            You&apos;re all caught up
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            New matching jobs will appear here as they&apos;re found.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/jobs?tab=discover')}
            className="px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Browse All Jobs</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {jobs.map((job) => {
            const isApplied = appliedIds.has(job._id);
            const isSaved = savedIds.has(job._id);
            const isSaving = savingId === job._id;

            return (
              <div
                key={job._id}
                onClick={() => handleOpenDetail(job)}
                className="group relative rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#141810] p-4 transition-all hover:shadow-lg hover:border-[#013f2e]/40 dark:hover:border-[#36D39B]/40 cursor-pointer flex flex-col justify-between"
              >
                {/* Dismiss Button (top right hover) */}
                <button
                  type="button"
                  onClick={(e) => handlePass(job._id, e)}
                  title="Dismiss job"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all z-10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Top Row: Match Gauge + Location */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight ${
                        job.matchScore >= 90
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : job.matchScore >= 80
                          ? 'bg-[#36D39B]/15 text-[#013f2e] dark:text-[#36D39B] border border-[#36D39B]/30'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{job.matchScore}% Match</span>
                    </span>

                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {job.postedAgo}
                    </span>
                  </div>

                  {/* Title & Company */}
                  <div className="space-y-1 mb-2">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#013f2e] dark:group-hover:text-[#36D39B] transition-colors">
                      {job.title}
                    </h3>

                    <div className="flex items-center gap-2">
                      <CompanyLogo
                        company={job.company}
                        size={18}
                        logoUrl={job.companyLogo}
                        jobId={job._id}
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {job.company}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate">{job.location}</span>
                    </div>

                    {job.salary && (
                      <div className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                        {job.salary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Save + Apply */}
                <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-1.5 mt-auto">
                  <button
                    type="button"
                    onClick={(e) => handleSaveToggle(job, e)}
                    disabled={isSaving}
                    title={isSaved ? 'Remove from saved' : 'Save to shortlist'}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center ${
                      isSaved
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleApply(job, e)}
                    disabled={isApplied}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs ${
                      isApplied
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-[#013f2e] hover:bg-[#025c43] text-white'
                    }`}
                  >
                    {isApplied ? (
                      <span>Applied</span>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>Apply</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          open={modalOpen}
          onOpenChange={setModalOpen}
          isSaved={Boolean((selectedJob._id && savedIds.has(selectedJob._id)) || (selectedJob.id && savedIds.has(selectedJob.id)))}
          saving={Boolean((selectedJob._id && savingId === selectedJob._id) || (selectedJob.id && savingId === selectedJob.id))}
          onSave={() => {
            const matchJob = jobs.find((j) => j._id === selectedJob._id || (selectedJob.id && j._id === selectedJob.id));
            if (matchJob) handleSaveToggle(matchJob);
          }}
          onApply={() => selectedJob && handleApply(selectedJob)}
        />
      )}

      {/* Entitlement & Outcome Notice Modal */}
      <EntitlementNotice
        isOpen={entitlementNoticeOpen}
        onClose={() => setEntitlementNoticeOpen(false)}
        data={entitlementNoticeData}
      />
    </div>
  );
}

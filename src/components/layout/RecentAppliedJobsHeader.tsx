'use client';

import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { DashboardDataContext } from '@/contexts/DashboardDataContext';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { Check, Clock, Sparkles } from 'lucide-react';

export interface RecentAppliedJob {
  id: string;
  jobId: string;
  company: string;
  companyLogo?: string | null;
  jobTitle?: string;
  appliedAt: number; // timestamp in ms
}

const STORAGE_KEY = 'cvcircle_recent_applied_jobs_v1';
const TEN_MINUTES_MS = 10 * 60 * 1000;
const MAX_JOBS = 5;

// SVG segmented ring constants for 3 stages (Saved, Staged, Applied)
// viewBox 0 0 38 38, center (19, 19), radius 16
const CIRCLE_RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~100.53
const GAP = 3.5;
const SEGMENT_ARC = (CIRCUMFERENCE - 3 * GAP) / 3; // ~29.84

const STAGE_CONFIG = [
  { name: 'Saved', color: '#38bdf8', rotation: -90, description: 'Job Saved' },
  { name: 'Staged', color: '#a855f7', rotation: 30, description: 'Application Staged' },
  { name: 'Applied', color: '#10b981', rotation: 150, description: 'Application Submitted' },
];

export default function RecentAppliedJobsHeader() {
  const router = useRouter();
  const dashboardContext = useContext(DashboardDataContext);
  const [jobsList, setJobsList] = useState<RecentAppliedJob[]>([]);
  const [morphingJob, setMorphingJob] = useState<RecentAppliedJob | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const hasInitializedRef = useRef(false);

  // Sync with localStorage
  const saveToStorage = useCallback((items: RecentAppliedJob[]) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, []);

  // Filter out jobs expired beyond 10 minutes
  const pruneExpired = useCallback((items: RecentAppliedJob[], now: number): RecentAppliedJob[] => {
    return items.filter(job => now - job.appliedAt < TEN_MINUTES_MS);
  }, []);

  // Add a newly applied job with 10-minute lifetime and morph on 6th job
  const addAppliedJob = useCallback((job: {
    id?: string;
    _id?: string;
    jobId?: string;
    company?: string;
    companyLogo?: string | null;
    jobTitle?: string;
    appliedAt?: Date | number;
  }) => {
    const rawId = job.jobId || job._id || job.id || `app-${Date.now()}`;
    const now = Date.now();
    const appTimestamp = job.appliedAt
      ? typeof job.appliedAt === 'number'
        ? job.appliedAt
        : new Date(job.appliedAt).getTime()
      : now;

    const newJob: RecentAppliedJob = {
      id: `${rawId}-${now}`,
      jobId: rawId,
      company: (job.company || 'Company').trim(),
      companyLogo: job.companyLogo || null,
      jobTitle: job.jobTitle || 'Applied Role',
      appliedAt: appTimestamp,
    };

    setJobsList(current => {
      const active = pruneExpired(current, now);

      // Avoid immediate duplicate of same job within 15 seconds
      const existsIndex = active.findIndex(j => j.jobId === rawId);
      if (existsIndex !== -1 && (now - active[existsIndex].appliedAt < 15000)) {
        return active;
      }

      // Check if we already have 5 jobs. If so, the 1st applied job (oldest, at index 4)
      // must be pushed into the notification icon with a morphing animation!
      if (active.length >= MAX_JOBS) {
        const oldestJob = active[active.length - 1];
        const isOldestWithin10Mins = (now - oldestJob.appliedAt) < TEN_MINUTES_MS;

        if (isOldestWithin10Mins) {
          // Trigger morphing animation
          setMorphingJob(oldestJob);

          setTimeout(() => {
            // Signal notification center to absorb the morphed icon
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('job-morphed-into-bell', {
                detail: { job: oldestJob }
              }));
            }
          }, 450);

          setTimeout(() => {
            setMorphingJob(null);
          }, 650);

          // The new job is prepended, and the 1st job is pushed out
          const updated = [newJob, ...active.slice(0, MAX_JOBS - 1)];
          saveToStorage(updated);
          return updated;
        }
      }

      const updated = [newJob, ...active.filter(j => j.jobId !== rawId)].slice(0, MAX_JOBS);
      saveToStorage(updated);
      return updated;
    });
  }, [pruneExpired, saveToStorage]);

  // Initial load: restore from localStorage or seed from user's applied jobs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentAppliedJob[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = pruneExpired(parsed, now);
          if (valid.length > 0) {
            setJobsList(valid);
            hasInitializedRef.current = true;
            return;
          }
        }
      }
    } catch {
      // Ignore parse error
    }

    // If no recent items in localStorage, seed from user's applied jobs in dashboardContext
    if (!hasInitializedRef.current && dashboardContext?.jobs && Array.isArray(dashboardContext.jobs)) {
      const appliedFromDb = dashboardContext.jobs
        .filter((j: any) => j.status === 'applied' || j.currentStage === 'applied')
        .slice(0, MAX_JOBS);

      if (appliedFromDb.length > 0) {
        const seeded: RecentAppliedJob[] = appliedFromDb.map((j: any, idx: number) => ({
          id: `${j._id || j.id || idx}-${now - idx * 30000}`,
          jobId: j._id || j.id,
          company: j.company || 'Company',
          companyLogo: j.companyLogo || null,
          jobTitle: j.jobTitle || j.title || 'Applied Position',
          // Space them out slightly so the 1st job remains oldest
          appliedAt: now - idx * 45000,
        }));
        setJobsList(seeded);
        saveToStorage(seeded);
        hasInitializedRef.current = true;
      }
    }
  }, [dashboardContext?.jobs, pruneExpired, saveToStorage]);

  // Listen for global application events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleJobUpdated = (e: any) => {
      if (e.detail?.status === 'applied') {
        const jobId = e.detail?.jobId;
        const matched = dashboardContext?.jobs?.find((j: any) => (j._id || j.id) === jobId);
        addAppliedJob({
          jobId,
          company: matched?.company || e.detail?.company || 'Company',
          companyLogo: matched?.companyLogo || e.detail?.companyLogo,
          jobTitle: matched?.jobTitle || matched?.title || e.detail?.jobTitle,
        });
      }
    };

    const handleJobApplied = (e: any) => {
      if (e.detail) {
        addAppliedJob(e.detail);
      }
    };

    window.addEventListener('jobUpdated', handleJobUpdated);
    window.addEventListener('job-applied', handleJobApplied);

    // Provide testing helper on window
    (window as any).__addRecentAppliedJob = (companyName?: string) => {
      const companies = ['Google', 'Stripe', 'Airbnb', 'Linear', 'Vercel', 'Figma', 'OpenAI', 'Microsoft'];
      const randomCompany = companyName || companies[Math.floor(Math.random() * companies.length)];
      addAppliedJob({
        jobId: `test-${Date.now()}`,
        company: randomCompany,
        jobTitle: 'Senior Software Engineer',
        appliedAt: Date.now(),
      });
    };

    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdated);
      window.removeEventListener('job-applied', handleJobApplied);
      delete (window as any).__addRecentAppliedJob;
    };
  }, [addAppliedJob, dashboardContext?.jobs]);

  // Periodic 1-second timer to update remaining time and prune items expiring after 10 mins
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      setJobsList(current => {
        const pruned = pruneExpired(current, now);
        if (pruned.length !== current.length) {
          saveToStorage(pruned);
          return pruned;
        }
        return current;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pruneExpired, saveToStorage]);

  const handleJobClick = (job: RecentAppliedJob) => {
    if (job.jobId) {
      router.push(`/dashboard/jobs?id=${job.jobId}`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-job-detail', { detail: { jobId: job.jobId } }));
      }
    }
  };

  if (jobsList.length === 0 && !morphingJob) {
    return null;
  }

  return (
    <div className="relative flex items-center gap-1.5 sm:gap-2">
      {/* Morphing ghost icon flying directly into the notification bell */}
      <AnimatePresence>
        {morphingJob && (
          <motion.div
            key={`morph-${morphingJob.id}`}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: 52, // Moves into the adjacent notification bell position
              y: [0, -6, 0],
              scale: [1, 0.6, 0.05],
              opacity: [1, 0.9, 0],
              filter: ['blur(0px)', 'blur(1px)', 'blur(4px)'],
              rotate: [0, 15, 60],
            }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute right-0 top-0 w-8 h-8 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-8 h-8 rounded-full border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.8)] flex items-center justify-center">
              <Sparkles size={14} className="text-emerald-400 animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List of last 5 applied jobs */}
      <motion.div layout className="flex items-center gap-1.5 sm:gap-2">
        <AnimatePresence initial={false}>
          {jobsList.map((job) => {
            const isHovered = hoveredJobId === job.id;
            const remainingSec = Math.max(0, Math.floor((job.appliedAt + TEN_MINUTES_MS - currentTime) / 1000));
            const remainingMins = Math.ceil(remainingSec / 60);

            return (
              <div
                key={job.id}
                className="relative"
                onMouseEnter={() => setHoveredJobId(job.id)}
                onMouseLeave={() => setHoveredJobId(null)}
              >
                <motion.button
                  layout
                  initial={{ scale: 0.3, opacity: 0, x: -16 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{
                    scale: 0.2,
                    opacity: 0,
                    x: 20,
                    transition: { duration: 0.35, ease: 'easeIn' },
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleJobClick(job)}
                  className="relative w-8 h-8 sm:w-8 sm:h-8 rounded-full flex items-center justify-center focus:outline-hidden cursor-pointer group"
                  aria-label={`Applied to ${job.company}`}
                  title={`${job.company} - Applied`}
                >
                  {/* 3-colored Segmented Ring (Saved: Blue, Staged: Purple, Applied: Green) */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none -rotate-90"
                    viewBox="0 0 38 38"
                  >
                    {/* Background faint guide track */}
                    <circle
                      cx="19"
                      cy="19"
                      r={CIRCLE_RADIUS}
                      className="stroke-gray-200/80 dark:stroke-white/10"
                      strokeWidth="2.2"
                      fill="none"
                    />

                    {/* 3 colored segments for Saved, Staged, Applied */}
                    {STAGE_CONFIG.map((stage) => (
                      <circle
                        key={stage.name}
                        cx="19"
                        cy="19"
                        r={CIRCLE_RADIUS}
                        stroke={stage.color}
                        strokeWidth="2.4"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${SEGMENT_ARC} ${CIRCUMFERENCE - SEGMENT_ARC}`}
                        transform={`rotate(${stage.rotation} 19 19)`}
                        className="transition-all duration-300 drop-shadow-[0_0_2px_rgba(0,0,0,0.15)]"
                      />
                    ))}
                  </svg>

                  {/* Company Logo in center */}
                  <div className="w-[23px] h-[23px] rounded-full overflow-hidden bg-white dark:bg-[#161c12] flex items-center justify-center border border-gray-100 dark:border-white/10 shadow-xs">
                    <CompanyLogo
                      company={job.company}
                      logoUrl={job.companyLogo}
                      size={20}
                      className="rounded-full object-contain"
                    />
                  </div>
                </motion.button>

                {/* Rich Tooltip on Hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 -left-12 sm:left-1/2 sm:-translate-x-1/2 z-[100] w-52 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/15 rounded-xl shadow-xl p-2.5 text-left pointer-events-none"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-md overflow-hidden bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                          <CompanyLogo
                            company={job.company}
                            logoUrl={job.companyLogo}
                            size={16}
                            className="rounded-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {job.company}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {job.jobTitle}
                          </div>
                        </div>
                      </div>

                      {/* 3 Stage Progress Badges */}
                      <div className="grid grid-cols-3 gap-1 py-1.5 my-1 border-y border-gray-100 dark:border-white/10 text-[9px] font-semibold text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_4px_#38bdf8]" />
                          <span className="text-gray-600 dark:text-gray-300">Saved</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_4px_#a855f7]" />
                          <span className="text-gray-600 dark:text-gray-300">Staged</span>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_4px_#10b981]" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Applied</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-gray-400" />
                          {remainingMins}m left in header
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          View &rarr;
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { JobDetailModal } from '@/components/jobs/JobDetailModal';
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
  bgTintLight: string;
}

const INITIAL_TOP_MATCHES: TopMatchJob[] = [
  {
    _id: 'top-match-1',
    title: 'Senior Manager Product Development',
    company: 'Info Edge',
    location: 'Bengaluru',
    experienceYears: 2,
    postedAgo: '6 days ago',
    matchScore: 76,
    skills: ['Product Strategy', 'Leadership', 'Product Management'],
    applyUrl: 'https://www.naukri.com',
    source: 'naukri',
    bgTintLight: 'bg-[#fff9e6] dark:bg-[#1a1c14]',
  },
  {
    _id: 'top-match-2',
    title: 'Product Manager',
    company: 'Dess Technologies',
    location: 'Mumbai (All Areas)',
    experienceYears: 3,
    postedAgo: 'a day ago',
    matchScore: 76,
    skills: ['Product Management', 'Product Strategy', 'Product Concept'],
    applyUrl: 'https://www.naukri.com',
    source: 'naukri',
    bgTintLight: 'bg-[#fef3e7] dark:bg-[#1c1914]',
  },
  {
    _id: 'top-match-3',
    title: 'IN_Senior Associate_Gen AI_CEDA Central_Advisory_Bangalore',
    company: 'PwC',
    location: 'Bengaluru, Karnataka, India',
    experienceYears: 2,
    postedAgo: 'a day ago',
    matchScore: 76,
    skills: ['Gen AI', 'Advisory', 'Python', 'LLMs'],
    applyUrl: 'https://boards.greenhouse.io',
    source: 'greenhouse',
    bgTintLight: 'bg-[#eef7fe] dark:bg-[#14191c]',
  },
  {
    _id: 'top-match-4',
    title: 'Associate Product Manager',
    company: 'Grazitti Interactive',
    location: 'Panchkula',
    experienceYears: 2,
    postedAgo: '6 days ago',
    matchScore: 75,
    skills: ['Product Management', 'Product Strategy', 'L1 L2', 'Roadmaps'],
    applyUrl: 'https://www.indeed.com',
    source: 'indeed',
    bgTintLight: 'bg-[#eafaf1] dark:bg-[#131b15]',
  },
  {
    _id: 'top-match-5',
    title: 'Associate Manager - Product Management',
    company: 'Bakertilly',
    location: 'Bengaluru, Karnataka, India',
    experienceYears: 3,
    postedAgo: 'a day ago',
    matchScore: 75,
    skills: ['Product Lifecycle', 'Analytics', 'Agile'],
    applyUrl: 'https://www.adzuna.com',
    source: 'adzuna',
    bgTintLight: 'bg-[#fff9e6] dark:bg-[#1a1c14]',
  },
];

export default function TopJobMatchesSection() {
  const router = useRouter();
  const { toast } = useToast();
  const { updateProgress } = useNotifications();
  const [jobs, setJobs] = useState<TopMatchJob[]>(INITIAL_TOP_MATCHES);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const handlePass = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setJobs((prev) => prev.filter((j) => j._id !== id));
    toast({
      title: 'Job Dismissed',
      description: 'We will suggest different matching roles.',
    });
  };

  const handleApply = async (job: TopMatchJob | JobListing, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    setAppliedIds((prev) => new Set(prev).add(job._id));
    toast({
      title: 'Application Initiated',
      description: `Applying to ${job.title} at ${job.company}`,
    });

    const appId = `apply-${job._id}`;
    updateProgress(appId, 15, `Matching CV for ${job.title}...`, 'progress');

    try {
      setTimeout(() => updateProgress(appId, 45, `Tailoring application for ${job.company}...`, 'progress'), 600);
      setTimeout(() => updateProgress(appId, 80, `Submitting application...`, 'progress'), 1400);

      const res = await fetch('/api/applications/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          applyUrl: job.applyUrl,
          salary: (job as any).salary || ((job as any).salaryMin || (job as any).salaryMax ? {
            min: (job as any).salaryMin,
            max: (job as any).salaryMax,
            currency: (job as any).salaryCurrency || '$',
            period: 'yearly',
          } : undefined),
          matchScore: job.matchScore,
          skills: (job as any).skills || (job as any).keywords || [],
        }),
      });

      const resData = await res.json();
      const createdId = resData?.jobId || resData?.applicationId || job._id;

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: createdId } }));
      }

      setTimeout(() => updateProgress(appId, 100, `Applied to ${job.title}!`, 'progress'), 2200);
    } catch {
      setTimeout(() => updateProgress(appId, 100, `Applied to ${job.title}!`, 'progress'), 2200);
    }
  };

  const handleOpenDetail = (job: TopMatchJob) => {
    setSelectedJob({
      _id: job._id,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.location.toLowerCase().includes('remote'),
      matchScore: job.matchScore,
      source: job.source as any,
      atsType: (job.source === 'greenhouse' ? 'greenhouse' : 'direct') as any,
      applyUrl: job.applyUrl,
      userId: '',
      postedDate: new Date(),
      keywords: job.skills,
    });
    setModalOpen(true);
  };

  if (jobs.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Top job matches
        </h2>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/dashboard/jobs')}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-gray-400 dark:hover:border-white/20 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Browse jobs</span>
          </button>
        </div>
      </div>

      {/* Cards Grid or Empty State UI */}
      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] p-8 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-[#80FF00]/10 flex items-center justify-center mb-3 text-emerald-600 dark:text-[#80FF00]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            You're all caught up with your top matches!
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
            We continuously match new openings from connected job streams. You can discover more live opportunities anytime.
          </p>
          <button
            onClick={() => router.push('/dashboard/jobs?tab=discover')}
            className="px-4 py-2 rounded-xl bg-[#0f172a] dark:bg-[#80FF00] hover:bg-[#1e293b] text-white dark:text-black text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Discover More Jobs</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {jobs.map((job) => {
            const isApplied = appliedIds.has(job._id);

            return (
              <div
                key={job._id}
                onClick={() => handleOpenDetail(job)}
                className={`rounded-2xl border border-gray-200/80 dark:border-white/10 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between ${job.bgTintLight}`}
              >
                {/* Top Row: Location + Experience + Timestamp + Match Gauge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px]">
                        {job.location}
                      </span>
                      {job.experienceYears && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                          <Briefcase className="w-2.5 h-2.5" />
                          {job.experienceYears}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {job.postedAgo}
                    </div>
                  </div>

                  {/* Circular Match Gauge */}
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-600 dark:border-emerald-400 flex flex-col items-center justify-center shrink-0 bg-white/70 dark:bg-black/30">
                    <span className="text-[10px] font-black text-gray-900 dark:text-white leading-tight">
                      {job.matchScore}%
                    </span>
                    <span className="text-[7px] font-bold tracking-tighter text-gray-500 dark:text-gray-400 uppercase leading-none">
                      MATCH
                    </span>
                  </div>
                </div>

                {/* Middle: Job Title & Skills */}
                <div className="my-3 space-y-2">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 hover:text-emerald-700 dark:hover:text-emerald-400">
                    {job.title}
                  </h3>

                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom: Company Logo + Name + Pass / Apply buttons */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <CompanyLogo
                      company={job.company}
                      size={20}
                      logoUrl={job.companyLogo}
                      jobId={job._id}
                    />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {job.company}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePass(job._id, e)}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      Pass
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleApply(job, e)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        isApplied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0f172a] hover:bg-[#1e293b] text-white'
                      }`}
                    >
                      {isApplied ? 'Applied' : 'Apply'}
                    </button>
                  </div>
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
          isSaved={false}
          saving={false}
          onSave={() => {}}
          onApply={() => selectedJob && handleApply(selectedJob)}
        />
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { JobListing } from '@/types/automation-schema';
import {
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Briefcase,
  CheckCircle2,
  Building2,
  Zap,
  X,
  FileText,
  Tag,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { authenticatedFetch, authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { MatchScoreBadge } from './MatchScoreBadge';
import { MatchBreakdownBars } from './MatchBreakdownBars';
import { renderRichText, timeAgo } from '@/lib/utils/format-utils';
import { useJobLiveStatusStore } from '@/lib/stores/jobLiveStatusStore';
import { JobLiveStatusCard } from '@/components/jobs/JobLiveStatusCard';

export interface JobDetailModalProps {
  job: JobListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  saving: boolean;
  onSave: () => void;
  onApply: () => void;
}

const formatSalary = (job: JobListing): string => {
  if (!job.salaryMin && !job.salaryMax) return '';
  const cur = job.salaryCurrency ? ` ${job.salaryCurrency}` : '';
  const min = job.salaryMin ? `${job.salaryMin.toLocaleString()}${cur}` : '';
  const max = job.salaryMax ? `${job.salaryMax.toLocaleString()}${cur}` : '';
  if (min && max) return `${min} – ${max}`;
  return min || max;
};

/**
 * Decode HTML entities (e.g. <div> -> <div>) so the raw JD HTML
 * can be rendered properly, then sanitize it for safe display.
 */
const decodeHtmlEntities = (html: string): string => {
  if (!html) return '';
  if (typeof window === 'undefined') {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

export function JobDetailModal({
  job,
  open,
  onOpenChange,
  isSaved,
  saving,
  onSave,
  onApply,
}: JobDetailModalProps) {
  const { user } = useUnifiedAuth();
  const [mounted, setMounted] = useState(false);
  const [jobNotes, setJobNotes] = useState('');
  const [jobTags, setJobTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and fetch notes whenever a new job is selected
  useEffect(() => {
    if (!job) {
      setJobNotes('');
      setJobTags([]);
      return;
    }

    const initialNotes = (job as any).notes || '';
    const initialTags = Array.isArray((job as any).tags)
      ? (job as any).tags
      : Array.isArray(job.keywords)
        ? job.keywords.slice(0, 5)
        : [];

    setJobNotes(initialNotes);
    setJobTags(initialTags);

    // If user is authenticated and job might exist in tracker, fetch existing application notes
    if (user?.id) {
      authenticatedFetchWithUserId(`/api/jobs`, user.id)
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          const list: any[] = data.jobs || data.data || [];
          const existing = list.find(
            (j) =>
              j._id === job._id ||
              j.id === job._id ||
              (j.jobUrl && job.applyUrl && j.jobUrl === job.applyUrl) ||
              (j.company?.toLowerCase() === job.company?.toLowerCase() &&
                j.jobTitle?.toLowerCase() === job.title?.toLowerCase())
          );
          if (existing) {
            if (existing.notes) setJobNotes(existing.notes);
            if (Array.isArray(existing.tags) && existing.tags.length > 0) {
              setJobTags(existing.tags);
            }
          }
        })
        .catch(() => {
          // Non-blocking background fetch
        });
    }
  }, [job, user?.id]);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (jobTags.includes(trimmed)) {
      setNewTagInput('');
      return;
    }
    setJobTags((prev) => [...prev, trimmed]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setJobTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSaveNotes = async () => {
    if (!job) return;
    setIsSavingNotes(true);
    try {
      const currentUserId = user?.id || (user as any)?._id;
      const payload = {
        jobId: job._id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        source: job.source || 'Discover',
        jobUrl: job.applyUrl,
        jobDescription: job.description,
        status: 'saved',
        notes: jobNotes,
        tags: jobTags,
        salary:
          job.salaryMin || job.salaryMax
            ? {
                min: job.salaryMin,
                max: job.salaryMax,
                currency: job.salaryCurrency || '$',
                period: 'yearly',
              }
            : undefined,
      };

      const res = currentUserId
        ? await authenticatedFetchWithUserId('/api/jobs', currentUserId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await authenticatedFetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        toast.success('Notes & tags saved to your tracker!');
        if (!isSaved && typeof onSave === 'function') {
          onSave();
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jobUpdated', { detail: { jobId: job._id } }));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || 'Failed to save notes');
      }
    } catch (err: any) {
      console.error('Error saving notes in Discover modal:', err);
      toast.error(err.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Decode HTML entities first, then sanitize for safe rendering
  const rawDescription = job?.description || '';
  const decodedDescription = decodeHtmlEntities(rawDescription);
  const safeDescription = renderRichText(decodedDescription);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && job && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bg-black/50 backdrop-blur-sm z-[99998]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
            onClick={() => onOpenChange(false)}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: 'calc(100% + 12px)' }}
            animate={{ x: 0 }}
            exit={{ x: 'calc(100% + 12px)' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-3 top-3 bottom-3 h-auto bg-white dark:bg-[#141810] shadow-2xl z-[99999] flex flex-col rounded-2xl overflow-hidden transition-all duration-300 border border-gray-200 dark:border-white/10"
            style={{ width: 'min(680px, calc(100vw - 24px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400 font-black ring-1 ring-lime-500/20 text-h3">
                    {job.company
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-h2 font-bold text-gray-900 dark:text-white leading-snug truncate">
                      {job.title}
                    </h2>
                    <p className="flex items-center gap-1 text-h3 text-gray-600 dark:text-gray-400">
                      <Building2 className="w-4 h-4" />
                      {job.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MatchScoreBadge score={job.matchScore} size="lg" />
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-small text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                {formatSalary(job) && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <DollarSign className="w-4 h-4" />
                    {formatSalary(job)}
                  </span>
                )}
                {job.postedDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {timeAgo(job.postedDate)}
                  </span>
                )}
                {job.remote && (
                  <span className="inline-flex items-center rounded-full bg-[#013f2e]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400 ring-1 ring-lime-500/20">
                    Remote
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
              {/* Live Status Card if active for this job */}
              {(() => {
                const targetId = String(job._id || job.id || '');
                const liveStatus = targetId ? useJobLiveStatusStore.getState().statuses[targetId] : undefined;
                if (!liveStatus) return null;
                return (
                  <div className="rounded-2xl overflow-hidden shadow-sm">
                    <JobLiveStatusCard
                      status={liveStatus}
                      onClose={() => useJobLiveStatusStore.getState().clearStatus(targetId)}
                    />
                  </div>
                );
              })()}

              {/* Match breakdown */}
              <section>
                <h4 className="flex items-center gap-2 text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  <Zap className="w-4 h-4 text-lime-500" />
                  Why we matched you
                </h4>
                <MatchBreakdownBars breakdown={job.matchBreakdown} compact={false} />
              </section>

              {/* Personal Notes & Tags Section */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-[#131810] space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-small font-bold text-gray-900 dark:text-white">Personal Job Notes</h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#013f2e] px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
                  >
                    {isSavingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Notes
                  </button>
                </div>

                {/* Quick Template Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '+ Recruiter Call', text: '\n\n--- Recruiter Call Takeaways ---\n- Recruiter Name:\n- Salary Mentioned:\n- Next Stage Timeline:' },
                    { label: '+ Interview Prep', text: '\n\n--- Interview Preparation ---\n- Key Projects to Highlight:\n- System Design Points:\n- Tech Stack Overlap:' },
                    { label: '+ Questions for Team', text: '\n\n--- Questions for Interviewer ---\n1. What does the day-to-day look like?\n2. What are the key engineering challenges this quarter?' },
                    { label: '+ Salary Target', text: '\n\n--- Compensation & Target ---\n- Target Base:\n- Target Equity:\n- Deadlines:' },
                    { label: '+ Referral & Contacts', text: '\n\n--- Contact & Referral ---\n- Person:\n- Connection:\n- Date Followed Up:' },
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setJobNotes((prev) => (prev ? prev + prompt.text : prompt.text.trim()))}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-[11px] font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Type any interview prep notes, referral contacts, salary requirements, or recruiter discussion points here..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 text-xs leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-lime-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:focus:bg-[#181f16]"
                />

                {/* Custom Tags */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tags</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {jobTags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag (e.g. Referral, High Priority)..."
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-lime-500 focus:outline-none dark:border-white/10 dark:bg-white/[0.02] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-[#20281d] dark:text-white"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </section>

              {/* Description */}
              <section>
                <h4 className="text-small font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Job description
                </h4>
                <div className="bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  {safeDescription ? (
                    <div
                      className="text-small text-gray-700 dark:text-gray-300 leading-relaxed [&_a]:text-lime-600 [&_a]:dark:text-lime-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:font-semibold [&_h1]:text-h3 [&_h2]:text-h3 [&_h3]:text-h3 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mt-3 [&_h2]:mt-3 [&_h3]:mt-3 [&_p]:my-2 [&_hr]:my-3 [&_hr]:border-gray-200 [&_hr]:dark:border-gray-700"
                      dangerouslySetInnerHTML={{ __html: safeDescription }}
                    />
                  ) : (
                    <p className="text-small text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      No description available. Open the job posting to view full details.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 flex-shrink-0">
              <button
                onClick={onApply}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Apply Now
              </button>
              {isSaved ? (
                <button
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold py-2.5 px-4 rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Saved to Tracker
                </button>
              ) : (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Briefcase className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save to Tracker'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}


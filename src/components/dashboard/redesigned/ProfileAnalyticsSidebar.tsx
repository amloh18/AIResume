'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Edit3, 
  Target, 
  Bot, 
  Layers, 
  FileText, 
  Award, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { Skeleton } from '@/components/ui/Skeleton';
import { getCvScoreForDisplay, calculateCVScore } from '@/lib/utils/cv-scoring';

interface ProfileAnalyticsSidebarProps {
  cv: any;
  isOpen: boolean;
  onClose: () => void;
}

function cvId(cv: any): string {
  return String(cv?.id || cv?._id || '');
}

function cvAtsScore(cv: any): number {
  return Math.round(getCvScoreForDisplay(cv) || 0);
}

function buildMetrics(report: any, cvBreakdown: any) {
  // Every branch returns a REAL measurement.
  //
  // The previous version synthesised component values from the headline score
  // (`score + 4`, `score - 4`, `score + 9`, `score - 13`, `score + 1`) and fell
  // back to a hardcoded 75/68/84/65/80 set when the score was 0. Both are
  // fabricated data presented as analysis — a user cannot tell a synthesised
  // bar from a measured one. They are gone; `null` means "not measured".
  const norm = (val: number, max: number) => Math.round(Math.min(100, Math.max(0, (val / max) * 100)));

  // Priority 1: the LLM review report, when it exists.
  if (report) {
    return [
      { label: 'Formatting', value: norm(report.formatting ?? 0, 20), icon: Layers },
      { label: 'Quantification', value: norm(report.quantification ?? report.keywords ?? 0, 20), icon: Target },
      { label: 'Readability', value: norm(report.readability ?? 0, 20), icon: FileText },
      { label: 'Impact Verbs', value: norm(report.impactVerbs ?? 0, 20), icon: Zap },
      { label: 'Completeness', value: norm(report.completeness ?? 0, 25), icon: Award },
    ];
  }

  // Priority 2: the deterministic engine's own component scores.
  if (cvBreakdown) {
    return [
      { label: 'Formatting', value: norm(cvBreakdown.formatting, 20), icon: Layers },
      { label: 'Quantification', value: norm(cvBreakdown.quantification, 20), icon: Target },
      { label: 'Readability', value: norm(cvBreakdown.readability, 20), icon: FileText },
      { label: 'Impact Verbs', value: norm(cvBreakdown.impactVerbs, 20), icon: Zap },
      { label: 'Completeness', value: norm(cvBreakdown.completeness, 25), icon: Award },
    ];
  }

  return null;
}

export default function ProfileAnalyticsSidebar({ cv, isOpen, onClose }: ProfileAnalyticsSidebarProps) {
  const router = useRouter();
  const [fullCv, setFullCv] = useState<any>(null);
  const [resolvedCvId, setResolvedCvId] = useState<string>('');

  const currentCvId = cv ? cvId(cv) : '';
  if (currentCvId && resolvedCvId !== currentCvId) {
    setResolvedCvId(currentCvId);
    setFullCv(null);
  }

  // Load full profile CV whenever sidebar opens
  useEffect(() => {
    if (!isOpen || !cv) return;
    const id = cvId(cv);
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authenticatedFetch(`/api/cvs/${id}`);
        const result = await res.json();
        if (!cancelled) {
          setFullCv(result.success && result.data?.cv ? result.data.cv : cv);
        }
      } catch (err) {
        console.error('Failed to load Profile CV:', err);
        if (!cancelled) setFullCv(cv);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cv]);

  const activeCv = fullCv || cv;
  const loading = isOpen && !!cv && fullCv === null;

  const cvData = useMemo(() => activeCv?.cvData || {}, [activeCv?.cvData]);
  const candidateName = cvData?.basics?.name || cvData?.personalInfo?.fullName || activeCv?.title || 'Your Profile';
  const candidateRole = cvData?.basics?.label || cvData?.personalInfo?.jobTitle || cvData?.work?.[0]?.position || 'Career Profile';
  const candidateLocation = cvData?.basics?.location?.city || cvData?.personalInfo?.location || cvData?.basics?.location?.address || '';
  const candidateSummary = cvData?.basics?.summary || cvData?.personalInfo?.summary || '';
  
  // Extract skills
  const skillsList: string[] = useMemo(() => {
    if (Array.isArray(cvData?.skills)) {
      return cvData.skills.map((s: any) => typeof s === 'string' ? s : s?.name || s?.title || '').filter(Boolean);
    }
    if (Array.isArray(cvData?.skillsKeywords)) {
      return cvData.skillsKeywords.filter(Boolean);
    }
    return [];
  }, [cvData]);

  // Extract work experiences
  const workList: any[] = useMemo(() => {
    if (Array.isArray(cvData?.work)) return cvData.work;
    if (Array.isArray(cvData?.experience)) return cvData.experience;
    return [];
  }, [cvData]);

  const analysis = activeCv?.metadata?.surgeonAnalysis || activeCv?.metadata?.aiAnalysis;
  const report = analysis?.scoreReport;
  // Real, server-persisted score only. Never a fabricated placeholder — an
  // unmeasured profile must read as "not measured".
  const score = cvAtsScore(activeCv);

  // Real, deterministic breakdown computed locally from the CV content (same
  // engine the server uses), so it is safe to show before anything is persisted.
  const cvBreakdown = useMemo(() => {
    if (!activeCv?.cvData) return null;
    try {
      return calculateCVScore(activeCv.cvData);
    } catch {
      return null;
    }
  }, [activeCv?.cvData]);

  const metrics = useMemo(() => buildMetrics(report, cvBreakdown), [report, cvBreakdown]);

  // Only real diagnostics. The hardcoded defaults that used to sit here showed
  // canned advice ("Add 3-4 more specific framework keywords") as though it were
  // a finding about THIS CV.
  const strengths: any[] | null = report?.strengths || analysis?.strengths || null;
  const gaps: any[] | null = report?.gaps || analysis?.gaps || null;
  const hasDiagnostics = !!strengths?.length || !!gaps?.length;

  const handleEditInEditor = () => {
    const id = cvId(activeCv);
    onClose();
    if (id && id !== 'undefined' && id !== 'null') {
      router.push(`/editor?mode=edit-master&cvId=${id}&improve=true`);
    } else {
      router.push('/editor?doc=master-cv&mode=improve');
    }
  };

  const handleTailorJob = () => {
    onClose();
    router.push('/dashboard/jobs');
  };

  const handleInterviewPrep = () => {
    onClose();
    router.push('/dashboard/interview');
  };

  const scoreTone = score <= 0
    ? 'Not measured yet'
    : score >= 85
      ? 'High-Impact Profile'
      : score >= 70
        ? 'Competitive Profile'
        : 'Optimization Recommended';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="profile-analytics-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          {/* Slide-over Right Drawer */}
          <motion.aside
            key="profile-analytics-panel"
            initial={{ x: 'calc(100% + 20px)' }}
            animate={{ x: 0 }}
            exit={{ x: 'calc(100% + 20px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            role="dialog"
            aria-label="Profile Analytics Sidebar"
            className="fixed right-3 top-3 bottom-3 w-[min(26rem,calc(100vw-1.5rem))] bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col rounded-2xl overflow-hidden border border-[var(--border-primary)]"
          >
            {/* Header — shared compact sidebar pattern */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)] flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text-primary)] leading-snug">Profile Analytics</h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)] truncate">{candidateName}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)] truncate">
                  {candidateRole}{candidateLocation ? ` · ${candidateLocation}` : ''}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -m-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5 text-gray-900 dark:text-gray-100">
              {loading ? (
                <div className="space-y-6">
                  <Skeleton className="h-28 w-full rounded-2xl" />
                  <Skeleton className="h-44 w-full rounded-2xl" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  {/* Hero Health Gauge Card */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-gray-900/60 dark:to-gray-900/20 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Profile Health Index
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                          {score > 0 ? score : '—'}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/ 100</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className={`text-xs font-black ${score <= 0 ? 'text-gray-500 dark:text-gray-400' : score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {scoreTone}
                        </span>
                        {score > 0 && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                              +{Math.max(12, 100 - score)} pts potential
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Radial Ring */}
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="8" />
                        {score > 0 && (
                          <circle
                            cx="50" cy="50" r="40" fill="none"
                            stroke={score >= 80 ? '#83d60d' : '#f59e0b'}
                            strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShieldCheck className={`w-7 h-7 ${score <= 0 ? 'text-gray-300 dark:text-gray-700' : score >= 80 ? 'text-[#83d60d]' : 'text-amber-500'}`} />
                      </div>
                    </div>
                  </div>

                  {/* 5-Dimension Radar Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Layers size={13} className="text-[#83d60d]" /> Quality Breakdown
                    </h4>

                    <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3 shadow-sm">
                      {metrics ? (
                        metrics.map((m) => {
                          const Icon = m.icon;
                          return (
                            <div key={m.label} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                  <Icon size={12} className="text-gray-400" /> {m.label}
                                </span>
                                <span className="text-gray-900 dark:text-white tabular-nums">{m.value}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${m.value >= 75 ? 'bg-emerald-500' : m.value >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${m.value}%` }}
                                  transition={{ duration: 0.6 }}
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // No real measurement to show. An honest empty state beats
                        // synthesised bars.
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed text-center py-2">
                          No breakdown available yet. Run an analysis to measure this profile.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Professional Summary */}
                  {candidateSummary && (
                    <div className="bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Professional Summary</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium line-clamp-3">
                        {candidateSummary}
                      </p>
                    </div>
                  )}

                  {/* Quick Profile Snapshot (Experience & Skills) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Experience</span>
                      <div className="text-base font-black text-gray-900 dark:text-white">
                        {workList.length > 0 ? `${workList.length} Roles Listed` : 'Ready to add'}
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                        {workList[0]?.company ? `Latest: ${workList[0].company}` : 'Standard timeline'}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Indexed Skills</span>
                      <div className="text-base font-black text-gray-900 dark:text-white">
                        {skillsList.length > 0 ? `${skillsList.length} Skills` : 'Pending scan'}
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                        ATS searchable keywords
                      </span>
                    </div>
                  </div>

                  {/* Skills Cloud */}
                  {skillsList.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Top Profile Keywords
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {skillsList.slice(0, 14).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold border border-gray-200/80 dark:border-gray-700"
                          >
                            {skill}
                          </span>
                        ))}
                        {skillsList.length > 14 && (
                          <span className="px-2 py-1 text-gray-400 text-xs font-bold">
                            +{skillsList.length - 14} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strengths and Gap Insights */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      AI Diagnostics
                    </h4>
                    <div className="space-y-2">
                      {hasDiagnostics ? (
                        <>
                          {strengths?.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5">
                              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">{item.title || item}</h5>
                                {item.detail && <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80 leading-relaxed">{item.detail}</p>}
                              </div>
                            </div>
                          ))}

                          {gaps?.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5">
                              <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300">{item.title || item}</h5>
                                {item.detail && <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">{item.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        // No review has been run for this CV. Showing canned advice
                        // here would read as a finding about this specific profile.
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed text-center py-2">
                          No diagnostics yet. Run an analysis to get strengths and gaps for this profile.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actionable Next Steps Footer */}
            <div className="border-t border-[var(--border-primary)] px-5 py-3.5 bg-[var(--bg-secondary)] space-y-2.5 shrink-0">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Recommended Actions
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleEditInEditor}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-black transition-all col-span-2"
                >
                  <Edit3 size={14} className="text-[#83d60d]" /> Improve &amp; Polish in Editor
                </button>

                <button
                  onClick={handleTailorJob}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Target size={13} className="text-indigo-600 dark:text-indigo-400" /> Tailor For Job Match
                </button>

                <button
                  onClick={handleInterviewPrep}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Bot size={13} className="text-emerald-600 dark:text-emerald-400" /> AI Interview Prep
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

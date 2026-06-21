'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useATS } from '@/contexts/ATSContext';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import {
  Target, FileText, Briefcase, Plus, RefreshCw, Loader2, Zap,
  CheckCircle2, AlertTriangle, ChevronRight, X, ChevronDown, TrendingUp, Award, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import { checkSyntaxAndGrammar } from '@/lib/utils/offline-grammar-check';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { getAnalysisModeDescription, getAnalysisModeLabel } from '@/lib/utils/analysis-mode';
import MoriChatInterface from './MoriChatInterface';

interface ATSMeterPanelProps {}

/* ─────────────── Tiny helpers ─────────────── */
function ScoreBar({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  const color =
    value >= 75 ? '#22c55e' :
    value >= 50 ? '#eab308' :
    '#ef4444';
  return (
    <div className="flex items-center gap-2.5">
      {icon && <span className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500 flex items-center justify-center">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate">{label}</span>
          <span className="text-[11px] font-bold ml-2 shrink-0" style={{ color }}>{value}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
          />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray-500 dark:text-gray-400 flex items-center">{icon}</span>
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</h4>
    </div>
  );
}

/* ─────────────── Main Component ─────────────── */
export const ATSMeterPanel: React.FC<ATSMeterPanelProps> = () => {
  const { atsScore, atsAnalysis, isATSLoading, refreshATSScore } = useATS();
  const { state, dispatch, goToStep, setJobSidebarOpen } = useResumeEnhancer();
  const router = useRouter();
  const isMasterCV = state.cvType === 'master';
  const [isPurposeExpanded, setIsPurposeExpanded] = useState(false);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const offlineScore = useMemo(() => {
    if (state.cvData) return CentralScoreManager.getInstance().getScoreSync(state.cvData);
    return null;
  }, [state.cvData]);

  const hasJobDesc = !!(state.jobData?.jobDescription || state.jobData?.description || state.jobData?.jd);
  const score = hasJobDesc ? (atsScore || offlineScore?.cvScore.total || 0) : (offlineScore?.cvScore.total || 0);
  const scoreLabel = hasJobDesc ? 'ATS MATCH' : 'CV SCORE';

  // Segmented arc geometry
  const arcRadius = 44;
  const totalCircumference = 2 * Math.PI * arcRadius;
  const arcSpanDegrees = 210;
  const arcSpanLength = totalCircumference * (arcSpanDegrees / 360);
  const segmentGap = 5;

  // Grade
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const gradeColor = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  // Metrics
  const metrics = useMemo(() => {
    const scoreResult = atsAnalysis?.scoreResult || offlineScore;
    const cvB = scoreResult?.cvScore;
    const atsB = scoreResult?.atsScore;
    if (hasJobDesc && atsB) {
      return [
        { label: 'Keywords', value: Math.round((atsB.keywordMatch / 40) * 100) },
        { label: 'Impact Words', value: cvB ? Math.round((cvB.impactVerbs / 20) * 100) : 0 },
        { label: 'ATS Format', value: Math.round((atsB.formatting / 20) * 100) },
        { label: 'Readability', value: cvB ? Math.round((cvB.readability / 20) * 100) : 0 },
      ];
    }
    if (cvB) {
      return [
        { label: 'Completeness', value: Math.round((cvB.completeness / 25) * 100) },
        { label: 'Impact Words', value: Math.round((cvB.impactVerbs / 20) * 100) },
        { label: 'Formatting', value: Math.round((cvB.formatting / 15) * 100) },
        { label: 'Readability', value: Math.round((cvB.readability / 20) * 100) },
      ];
    }
    return [
      { label: hasJobDesc ? 'Keywords' : 'Completeness', value: 0 },
      { label: 'Impact Words', value: 0 },
      { label: hasJobDesc ? 'ATS Format' : 'Formatting', value: 0 },
      { label: 'Readability', value: 0 },
    ];
  }, [atsAnalysis, hasJobDesc, offlineScore]);

  // Segmented arc segment calculations (depends on metrics)
  const segmentCount = metrics.length;
  const totalSegmentGaps = (segmentCount - 1) * segmentGap;
  const availableLength = arcSpanLength - totalSegmentGaps;
  const totalMetricScore = metrics.reduce((sum, m) => sum + m.value, 0);

  const arcSegments = metrics.map((metric) => {
    const color = metric.value >= 75 ? '#22c55e' : metric.value >= 50 ? '#eab308' : '#ef4444';
    const length = totalMetricScore > 0
      ? (metric.value / totalMetricScore) * availableLength
      : availableLength / segmentCount;
    return { label: metric.label, value: metric.value, color, length };
  });

  let cumulativeOffset = 0;
  const arcSegmentsWithOffset = arcSegments.map((seg) => {
    const offset = cumulativeOffset;
    cumulativeOffset += seg.length + segmentGap;
    return { ...seg, offset };
  });

  // Skills
  const extractedSkills = useMemo(() => {
    if (atsAnalysis && atsAnalysis.extractedKeywords && atsAnalysis.extractedKeywords.length > 0) return atsAnalysis.extractedKeywords.slice(0, 12) as string[];
    try {
      if (Array.isArray(state.cvData?.skills)) {
        const s = state.cvData.skills.flatMap((c: any) => c.keywords || c.skills || []);
        if (s?.length > 0) return s.filter(Boolean).slice(0, 12) as string[];
      }
    } catch {}
    return [];
  }, [atsAnalysis, state.cvData]);

  const missingSkills = useMemo(() => {
    if (atsAnalysis && atsAnalysis.missingKeywords && atsAnalysis.missingKeywords.length > 0) return atsAnalysis.missingKeywords.slice(0, 8) as string[];
    return [];
  }, [atsAnalysis]);

  // Formatting issues
  const formattingIssues = useMemo(() => checkSyntaxAndGrammar(state.cvData), [state.cvData]);
  const visibleIssues = showAllIssues ? formattingIssues : formattingIssues.slice(0, 3);

  // Purpose card
  const purposeCard = useMemo(() => {
    const modeLabel = getAnalysisModeLabel(state.analysisModeInfo?.mode || state.analysisMode || 'insufficient-data');
    if (isMasterCV) return {
      title: 'Master CV', modeLabel,
      summary: 'Your source document — keep it broad, complete, and aligned to your career direction.',
      bullets: ['Full experience & transferable skills', 'Quality over job-specific fit', 'Base for all tailored CVs'],
    };
    if (state.cvType === 'journey') return {
      title: 'Job-Tailored CV', modeLabel,
      summary: 'Optimised for one application. Focus on ATS keyword match.',
      bullets: ['Mirror JD keywords & requirements', 'Prioritise relevant experience', 'Tight, focused evidence'],
    };
    return {
      title: 'General CV', modeLabel,
      summary: 'Flexible CV for broad applications. Add a JD for ATS-focused scoring.',
      bullets: ['Clear story, easy to scan', 'Add role context for richer guidance', 'Paste JD for keyword match'],
    };
  }, [isMasterCV, state.analysisMode, state.analysisModeInfo?.mode, state.cvType]);

  const handleAddSkill = (skillName: string) => {
    if (!skillName) return;
    const currentSkills: any[] = Array.isArray(state.cvData?.skills) ? [...state.cvData.skills] : [];
    let idx = currentSkills.findIndex((c: any) =>
      ['core skills', 'technical skills', 'skills'].includes(c.category?.toLowerCase())
    );
    if (idx === -1 && currentSkills.length > 0) idx = 0;
    if (idx >= 0) {
      const cat: any = { ...currentSkills[idx] };
      if (!Array.isArray(cat.skills)) cat.skills = Array.isArray(cat.keywords) ? [...cat.keywords] : [];
      if (!cat.skills.includes(skillName)) {
        cat.skills = [...cat.skills, skillName];
        const newSkills = [...currentSkills];
        newSkills[idx] = cat;
        dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, skills: newSkills } });
      }
    } else {
      dispatch({ type: 'SET_CV_DATA', payload: { ...state.cvData, skills: [...currentSkills, { id: crypto.randomUUID(), category: 'Core Skills', skills: [skillName] }] } });
    }
  };

  const handleStartCoaching = async () => {
    const jobId = state.journeyId || state.jobData?._id || state.jobData?.id;
    if (!jobId) return;
    if (state.jobData?.status === 'draft' || !state.jobData?.status) {
      try { await fetch(`/api/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'created' }) }); } catch {}
    }
    router.push(`/dashboard/interview/${jobId}`);
  };

  const handleDismissTransition = () => {
    if (state.modeTransitionData) {
      sessionStorage.setItem(`hide_transition_${state.modeTransitionData.transitionType}`, 'true');
      dispatch({ type: 'SET_MODE_TRANSITION_DATA', payload: null });
      dispatch({ type: 'CLEAR_MODE_WARNINGS' });
    }
  };

  const handleAcceptTransition = () => {
    if (state.modeTransitionData) {
      sessionStorage.setItem(`hide_transition_${state.modeTransitionData.transitionType}`, 'true');
      dispatch({ type: 'SET_MODE_TRANSITION_DATA', payload: null });
      dispatch({ type: 'CLEAR_MODE_WARNINGS' });
      if (state.cvId && state.targetRole) window.dispatchEvent(new CustomEvent('run-surgeon-analysis'));
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-y-auto hide-scrollbar text-gray-900 dark:text-white">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-200">Analysis</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
             onClick={() => dispatch({ type: 'SET_MORI_CHAT_MODE', payload: !state.moriChatMode })}
             className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition-all flex items-center gap-1.5 ${
               state.moriChatMode 
                 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                 : 'bg-gray-50 hover:bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
             }`}
          >
             <Sparkles className="w-3.5 h-3.5" />
             {state.moriChatMode ? 'Close Mori' : 'Ask Mori'}
          </button>
          
          <button
            onClick={() => refreshATSScore(state.cvId || undefined, state.jobData?._id || state.jobData?.id || undefined)}
            disabled={isATSLoading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            title="Refresh Analysis"
          >
            {isATSLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
          {/* ── Target Role Context ── */}
          <div className="bg-emerald-50 dark:bg-emerald-500/[0.04] border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-16 h-16 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                <Target className="w-3 h-3" /> Target Role Context
              </h4>

              {hasJobDesc ? (
                <div className="space-y-2">
                  <div
                    className="cursor-pointer hover:bg-white/60 dark:hover:bg-white/5 p-2 -mx-1 rounded-lg transition-colors"
                    onClick={() => setJobSidebarOpen(true)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-800 dark:text-white/80 truncate">
                        {state.jobData?.title || state.jobData?.jobTitle || 'Target Role'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-white/50 line-clamp-2 pl-5">
                      {state.jobData?.jobDescription || state.jobData?.description || 'Job description provided.'}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setJobSidebarOpen(true)}
                      className="flex-1 py-1.5 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 dark:bg-lime-500/20 dark:text-lime-300 dark:hover:bg-lime-500/30 rounded-lg transition-colors border border-emerald-600/20 dark:border-lime-500/20"
                    >
                      Update Target
                    </button>
                    <button
                      onClick={() => setJobSidebarOpen(true)}
                      className="flex-1 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 rounded-lg transition-colors border border-emerald-200 dark:border-white/10"
                    >
                      Job Details
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-emerald-700 dark:text-white/50 mb-2.5">
                    Add a job description to get specific ATS feedback and keyword matches.
                  </p>
                  <button
                    onClick={() => setJobSidebarOpen(true)}
                    className="w-full py-2 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 dark:bg-lime-500/20 dark:text-lime-300 dark:hover:bg-lime-500/30 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm border border-emerald-600/20 dark:border-lime-500/20"
                  >
                    <FileText className="w-3.5 h-3.5" /> Paste Job Description
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Score Hero — side-by-side segmented arc + details ── */}
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-xl p-4">
            {/* Segmented Arc */}
            <div className="relative w-[88px] h-[88px] shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={arcRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-100 dark:text-white/5"
                />
                {arcSegmentsWithOffset.map((seg) => (
                  <circle
                    key={seg.label}
                    cx="50" cy="50" r={arcRadius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="8"
                    strokeDasharray={`${seg.length} ${totalCircumference - seg.length}`}
                    strokeDashoffset={seg.offset}
                    strokeLinecap="butt"
                    style={{ filter: `drop-shadow(0 0 4px ${seg.color}60)` }}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatedScore value={score} size="sm" className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white leading-none" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">/ 100</span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg font-black ${gradeColor}`}>{grade}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{scoreLabel}</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                {score >= 75 ? 'Strong profile! You\'re standing out to ATS systems.'
                  : score >= 50 ? 'Good base. A few targeted improvements will boost your score.'
                  : 'Your CV needs improvement in key areas to pass ATS filters.'}
              </p>
              {hasJobDesc && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-sky-500/20">
                    {purposeCard.modeLabel}
                  </span>
                  {state.cvTitle && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5 truncate max-w-[120px]">
                      <FileText className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{state.cvTitle}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Mode Transition Panel ── */}
          {state.modeTransitionData && (
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 relative">
              <button onClick={handleDismissTransition} className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 transition-colors rounded">
                <X className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 mb-1.5 pr-6">
                <RefreshCw className="w-3.5 h-3.5" /> Analysis Mode Change
              </h4>
              <p className="text-[11px] text-blue-600 dark:text-blue-300/80 mb-3 leading-relaxed pr-6">
                Switching from <strong>{state.modeTransitionData.fromMode}</strong> to <strong>{state.modeTransitionData.toMode}</strong>.
              </p>
              <div className="flex gap-2">
                <button onClick={handleDismissTransition} className="flex-1 py-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-white/5 border border-blue-200 dark:border-white/10 rounded-lg">Cancel</button>
                <button onClick={handleAcceptTransition} className="flex-1 py-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Continue</button>
              </div>
            </div>
          )}

          {/* ── CV Purpose Card (compact, collapsible) ── */}
          <div className="bg-gray-50 dark:bg-white/[0.025] border border-gray-100 dark:border-white/[0.05] rounded-xl overflow-hidden">
            <button
              onClick={() => setIsPurposeExpanded(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Target className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{purposeCard.title}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isPurposeExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isPurposeExpanded && (
              <div className="px-3 pb-3">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2">{purposeCard.summary}</p>
                <div className="space-y-1.5">
                  {purposeCard.bullets.map((b) => (
                    <div key={b} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">{b}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── CV Quality Breakdown ── */}
          <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl p-3">
            <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Quality Breakdown" />
            <div className="space-y-3">
              {metrics.map(m => <ScoreBar key={m.label} label={m.label} value={m.value} />)}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 inline-flex items-center justify-center text-[8px]">i</span>
              Improve the areas above to increase your overall score.
            </p>
          </div>

          {/* ── Live Formatting Checks ── */}
          <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2.5">
              <SectionHeader icon={<Zap className="w-3.5 h-3.5 text-yellow-500" />} title="Live Formatting Checks" />
              {formattingIssues.length > 0 && (
                <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-1.5 py-0.5 rounded-full -mt-3">
                  {formattingIssues.length}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {formattingIssues.length > 0 ? (
                <>
                  {visibleIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 bg-yellow-50/70 dark:bg-yellow-500/5 px-2.5 py-2 rounded-lg border border-yellow-100 dark:border-yellow-500/10">
                      <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-yellow-700 dark:text-yellow-400/90 leading-snug">{issue.message}</p>
                    </div>
                  ))}
                  {formattingIssues.length > 3 && (
                    <button
                      onClick={() => setShowAllIssues(v => !v)}
                      className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-1"
                    >
                      {showAllIssues ? 'Show less' : `View all checks (${formattingIssues.length})`}
                      <ChevronRight className={`w-3 h-3 transition-transform ${showAllIssues ? 'rotate-90' : ''}`} />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/5 px-2.5 py-2 rounded-lg border border-emerald-100 dark:border-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">No formatting issues detected!</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Extracted Skills ── */}
          {extractedSkills.length > 0 && (
            <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl p-3">
              <SectionHeader icon={<Award className="w-3.5 h-3.5" />} title="Extracted Skills" />
              <div className="flex flex-wrap gap-1.5">
                {extractedSkills.map((skill: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-500/15 rounded-md">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Missing Keywords (journey only) ── */}
          {hasJobDesc && missingSkills.length > 0 && (
            <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] rounded-xl p-3">
              <SectionHeader icon={<Plus className="w-3.5 h-3.5 text-yellow-500" />} title="Missing High-Value Keywords" />
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleAddSkill(skill)}
                    className="px-2 py-0.5 text-[11px] font-medium bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-500/15 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors flex items-center gap-1 group"
                    title={`Add "${skill}" to skills`}
                  >
                    <Plus className="w-2.5 h-2.5 group-hover:scale-110 transition-transform" /> {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Cover Letter CTA ── */}
          {!isMasterCV && hasJobDesc && (state.journeyId || state.jobData?._id || state.jobData?.id) && (
            <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-14 h-14 bg-orange-400/10 rounded-full blur-lg pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5 mb-0.5">
                    <FileText className="w-3.5 h-3.5" /> Cover Letter
                  </h4>
                  <p className="text-[11px] text-orange-600/70 dark:text-orange-300/60">Generate a tailored cover letter.</p>
                </div>
                <button
                  onClick={() => goToStep(4)}
                  className="shrink-0 py-1.5 px-3 text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  Create <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* ── Interview Coach CTA ── */}
          {hasJobDesc && (state.journeyId || state.jobData?._id || state.jobData?.id) && (
            <div className="rounded-xl p-3 relative overflow-hidden bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/40">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 dark:from-indigo-600/30 to-purple-100/30 dark:to-purple-600/20 blur-xl" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-indigo-800 dark:text-white flex items-center gap-1.5 mb-0.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-300 fill-yellow-400/50 dark:fill-yellow-300" /> Interview Prep
                  </h4>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-200/80">Practice questions tailored to this JD.</p>
                </div>
                <button
                  onClick={handleStartCoaching}
                  className="shrink-0 py-1.5 px-3 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:text-indigo-700 dark:bg-white dark:hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  Start <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom tip ── */}
          <p className="text-[10px] text-gray-400 dark:text-gray-600 flex items-start gap-1.5 pb-1">
            <span className="text-yellow-400 shrink-0 mt-0.5">💡</span>
            Tip: A strong base CV helps generate better tailored versions for specific roles.
          </p>

        </div>
    </div>
  );
};

export default ATSMeterPanel;


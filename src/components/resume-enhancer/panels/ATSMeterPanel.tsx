'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useATS } from '@/contexts/ATSContext';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { Target, FileText, Briefcase, Plus, RefreshCw, Loader2, Zap, CheckCircle2, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import ScoreBreakdown from '@/components/ui/ScoreBreakdown';
import { checkSyntaxAndGrammar } from '@/lib/utils/offline-grammar-check';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { getAnalysisModeDescription, getAnalysisModeLabel } from '@/lib/utils/analysis-mode';

interface ATSMeterPanelProps {
  // onOpenJobParser is replaced by event dispatching
}

export const ATSMeterPanel: React.FC<ATSMeterPanelProps> = () => {
  const { atsScore, atsAnalysis, isATSLoading, refreshATSScore } = useATS();
  const { state, dispatch, goToStep } = useResumeEnhancer();
  const router = useRouter();
  const isMasterCV = state.cvType === 'master';
  const [isPurposeCardExpanded, setIsPurposeCardExpanded] = useState(true);

  const offlineScore = useMemo(() => {
    if (state.cvData) {
      return CentralScoreManager.getInstance().getScoreSync(state.cvData);
    }
    return null;
  }, [state.cvData]);

  const handleStartCoaching = async () => {
    const jobId = state.journeyId || state.jobData?._id || state.jobData?.id;
    if (!jobId) return;

    // Check if the job is in 'draft' status. If so, we should update it to 'created'
    if (state.jobData?.status === 'draft' || !state.jobData?.status) {
      try {
        await fetch(`/api/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'created' })
        });
      } catch (err) {
        console.error('Failed to update job status:', err);
      }
    }
    
    // Redirect to interview coach
    router.push(`/dashboard/interview/${jobId}`);
  };

  const hasJobDesc = !!(state.jobData?.jobDescription || state.jobData?.description || state.jobData?.jd);
  
  const score = hasJobDesc ? (atsScore || offlineScore?.cvScore.total || 0) : (offlineScore?.cvScore.total || 0);
  const scoreLabel = hasJobDesc ? 'ATS Match Score' : 'CV Score';
  
  // Extract keywords and missing skills
  const extractedSkills = useMemo(() => {
    if (atsAnalysis?.extractedKeywords && atsAnalysis.extractedKeywords.length > 0) {
      return atsAnalysis.extractedKeywords.slice(0, 10) as string[];
    }
    // Fallback based on CV Data
    try {
      if (Array.isArray(state.cvData?.skills)) {
        const skills = state.cvData.skills.flatMap((s: any) => s.keywords || s.skills || []);
        if (skills && skills.length > 0) return skills.filter(Boolean).slice(0, 10) as string[];
      }
    } catch (e) {
      console.warn("Failed to extract skills for ATS meter", e);
    }
    return [];
  }, [atsAnalysis, state.cvData]);

  const missingSkills = useMemo(() => {
    if (atsAnalysis?.missingKeywords && atsAnalysis.missingKeywords.length > 0) {
      return atsAnalysis.missingKeywords.slice(0, 6) as string[];
    }
    return [];
  }, [atsAnalysis]);

  const formattingIssues = useMemo(() => {
    return checkSyntaxAndGrammar(state.cvData);
  }, [state.cvData]);

  const purposeCard = useMemo(() => {
    const analysisMode = state.analysisModeInfo?.mode || state.analysisMode || 'insufficient-data';
    const modeLabel = getAnalysisModeLabel(analysisMode);
    const modeDescription = getAnalysisModeDescription(analysisMode, state.cvType);

    if (isMasterCV) {
      return {
        title: 'Master CV purpose',
        summary: 'This version is your source document. Keep it broad, complete, and aligned to the role direction you want to grow into.',
        bullets: [
          'Include your full experience, achievements, and transferable skills.',
          'Optimize for role fit and overall quality, not one specific job posting.',
          'Use this as the base for tailored job-specific CVs later.'
        ],
        modeLabel
      };
    }

    if (state.cvType === 'journey') {
      return {
        title: 'CV purpose',
        summary: 'This version is tailored for one job application, so the analysis focuses on ATS match against that job description.',
        bullets: [
          'Mirror the job requirements with relevant keywords and evidence.',
          'Prioritize the most relevant experience for this application.',
          'Keep details focused on what helps this job match score.'
        ],
        modeLabel
      };
    }

    return {
      title: 'CV purpose',
      summary: modeDescription || 'This version is a flexible CV you can use for general applications or adapt further for specific roles.',
      bullets: [
        'Keep the story clear and easy to scan.',
        'Add role context for stronger role-based guidance.',
        'Add a job description when you want ATS-focused feedback.'
      ],
      modeLabel
    };
  }, [isMasterCV, state.analysisMode, state.analysisModeInfo?.mode, state.cvType]);

  useEffect(() => {
    setIsPurposeCardExpanded(true);

    const timer = window.setTimeout(() => {
      setIsPurposeCardExpanded(false);
    }, 60_000);

    return () => window.clearTimeout(timer);
  }, [purposeCard.summary, purposeCard.title, state.cvType, state.cvId]);

  // Formatting feedback
  const feedback = useMemo(() => {
    const defaultFeedback = [
      { text: 'Clean, ATS-friendly format', type: 'success' },
      { text: 'Standard section headings used', type: 'success' },
      { text: 'Use more bullet points instead of paragraphs', type: 'warning' },
      { text: 'Add more quantifiable metrics', type: 'warning' },
    ];
    
    if (!atsAnalysis) return defaultFeedback;
    
    const items = [];
    if ((atsAnalysis.formatScore || 0) > 80) {
      items.push({ text: 'Clean, ATS-friendly format', type: 'success' });
    } else {
      items.push({ text: 'Format issues detected', type: 'warning' });
    }
    
    if ((atsAnalysis.actionVerbsCount || 0) > 10) {
      items.push({ text: 'Good use of action verbs', type: 'success' });
    } else {
      items.push({ text: 'Add more action verbs', type: 'warning' });
    }
    
    // Add any specific warnings from analysis
    if (atsAnalysis.warnings && atsAnalysis.warnings.length > 0) {
      atsAnalysis.warnings.slice(0, 2).forEach((w: string) => {
        items.push({ text: w, type: 'warning' });
      });
    }
    
    return items.length > 0 ? items : defaultFeedback;
  }, [atsAnalysis]);
  const metrics = useMemo(() => {
    const scoreResult = atsAnalysis?.scoreResult || offlineScore;
    const cvBreakdown = scoreResult?.cvScore;
    const atsBreakdown = scoreResult?.atsScore;

    if (hasJobDesc && atsBreakdown) {
      return {
        primaryLabel: 'Keywords',
        formatLabel: 'ATS Format',
        keywords: Math.round((atsBreakdown.keywordMatch / 40) * 100),
        impactWords: cvBreakdown ? Math.round((cvBreakdown.impactVerbs / 20) * 100) : 0,
        atsFormat: Math.round((atsBreakdown.formatting / 20) * 100),
        readability: cvBreakdown ? Math.round((cvBreakdown.readability / 20) * 100) : 0,
      };
    }

    if (cvBreakdown) {
      return {
        primaryLabel: 'Completeness',
        formatLabel: 'Formatting',
        keywords: Math.round((cvBreakdown.completeness / 25) * 100),
        impactWords: Math.round((cvBreakdown.impactVerbs / 20) * 100),
        atsFormat: Math.round((cvBreakdown.formatting / 15) * 100),
        readability: Math.round((cvBreakdown.readability / 20) * 100),
      };
    }

    return {
      primaryLabel: hasJobDesc ? 'Keywords' : 'Completeness',
      formatLabel: hasJobDesc ? 'ATS Format' : 'Formatting',
      keywords: 0,
      impactWords: 0,
      atsFormat: 0,
      readability: 0,
    };
  }, [atsAnalysis, hasJobDesc, offlineScore]);

  // Determine stroke color based on score
  const strokeColor = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const handleAddSkill = (skillName: string) => {
    if (!skillName) return;
    
    // Add skill to state
    const currentSkills: any[] = Array.isArray(state.cvData?.skills) ? [...state.cvData.skills] : [];
    
    // Check if "Core Skills" or similar category exists, otherwise create or use first
    let targetCategoryIndex = currentSkills.findIndex((c: any) => 
      c.category?.toLowerCase() === 'core skills' || 
      c.category?.toLowerCase() === 'technical skills' || 
      c.category?.toLowerCase() === 'skills'
    );
    
    if (targetCategoryIndex === -1 && currentSkills.length > 0) {
      targetCategoryIndex = 0; // Use first category if available
    }
    
    if (targetCategoryIndex >= 0) {
      const category: any = { ...currentSkills[targetCategoryIndex] };
      if (!Array.isArray(category.skills)) {
        category.skills = Array.isArray(category.keywords) ? [...category.keywords] : [];
      }
      
      const existingSkills = category.skills || [];
      if (!existingSkills.includes(skillName)) {
        category.skills = [...existingSkills, skillName];
        
        // Ensure cvData.skills is updated with the modified category
        const newSkills = [...currentSkills];
        newSkills[targetCategoryIndex] = category;
        
        dispatch({
          type: 'SET_CV_DATA',
          payload: {
            ...state.cvData,
            skills: newSkills
          }
        });
      }
    } else {
      // Create new category
      const newCategory = {
        id: crypto.randomUUID(),
        category: 'Core Skills',
        skills: [skillName]
      };
      
      dispatch({
        type: 'SET_CV_DATA',
        payload: {
          ...state.cvData,
          skills: [...currentSkills, newCategory]
        }
      });
    }
  };

  const handleJobDetails = () => {
    const event = new CustomEvent('open-job-sidebar');
    window.dispatchEvent(event);
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
      // Re-run analysis automatically if user confirms
      if (state.cvId && state.targetRole) {
        const event = new CustomEvent('run-surgeon-analysis');
        window.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#11140e] rounded-xl border border-gray-200 dark:border-white/5 overflow-y-auto hide-scrollbar p-5 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
          <Zap className="w-5 h-5 text-emerald-500 dark:text-emerald-400 fill-emerald-500/20 dark:fill-emerald-400/20" />
          AI Analysis
        </h3>
        <button 
          onClick={() => refreshATSScore(state.cvId || undefined, state.jobData?._id || state.jobData?.id || undefined)}
          disabled={isATSLoading}
          className="p-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 shadow-sm"
          title="Refresh Analysis"
        >
          {isATSLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center justify-center mb-8 relative">
        <div className="relative w-48 h-48 flex items-center justify-center rounded-full shadow-lg dark:shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),0_8px_20px_rgba(0,0,0,0.4)] bg-gray-50 dark:bg-gradient-to-b dark:from-[#1a1e16] dark:to-[#0f120c] border border-gray-200 dark:border-white/5">
          {/* Background circle */}
          <svg className="w-40 h-40 transform -rotate-90 absolute">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="rgba(0,0,0,0.05)"
              className="dark:stroke-[rgba(0,0,0,0.8)]"
              strokeWidth="16"
              fill="transparent"
            />
            {/* Inner track bevel */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="rgba(0,0,0,0.02)"
              className="dark:stroke-[rgba(255,255,255,0.03)] drop-shadow-sm dark:drop-shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
              strokeWidth="16"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={strokeColor}
              strokeWidth="14"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 10px ${strokeColor}40)` }}
            />
          </svg>
          
          {/* Inner raised circle */}
          <div className="absolute w-32 h-32 rounded-full bg-white dark:bg-gradient-to-tr dark:from-[#1a1e16] dark:to-[#252b1e] shadow-sm dark:shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center z-10 border border-gray-100 dark:border-white/5">
            <AnimatedScore 
              value={score} 
              size="lg" 
              className="text-5xl font-black tracking-tighter drop-shadow-sm dark:drop-shadow-md text-gray-900 dark:text-white" 
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1 text-center px-2">{scoreLabel}</span>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <h4 className="font-semibold text-lg text-gray-800 dark:text-white/90">Resume Strength Score</h4>
          <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="truncate max-w-[200px] text-blue-600 dark:text-blue-400/90 font-medium">
              {state.cvTitle || (typeof state.cvData?.basics?.name === 'string' && state.cvData.basics.name 
                ? `${state.cvData.basics.name.replace(/\s+/g, '_')}_CV` 
                : 'My_Resume')}.pdf
            </span>
          </div>
        </div>
      </div>

      {/* Mode Transition Panel */}
      {state.modeTransitionData && (
        <div className="mb-6 bg-blue-50 dark:bg-[#1a1f2e] border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 relative shadow-sm">
          <div className="absolute top-2 right-2">
            <button 
              onClick={handleDismissTransition}
              className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2 mb-2 pr-8">
            <RefreshCw className="w-4 h-4" />
            Analysis Mode Change
          </h4>
          
          <p className="text-xs text-blue-700 dark:text-blue-300/80 mb-4 leading-relaxed pr-8">
            Analysis will change from <span className="font-semibold">{state.modeTransitionData.fromMode}</span> to <span className="font-semibold">{state.modeTransitionData.toMode}</span>.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleDismissTransition}
              className="flex-1 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-white/5 border border-blue-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptTransition}
              className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors shadow-sm border border-blue-700 dark:border-blue-400"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* CV Purpose Card */}
      <div className="mb-6 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/40 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-start gap-2 leading-snug">
              <Target className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="min-w-0">
                <span>{purposeCard.title}</span>
                <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-300/80">
                  {purposeCard.summary}
                </span>
              </span>
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex w-fit shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em] bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
              {purposeCard.modeLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsPurposeCardExpanded((current) => !current)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700/50 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
              aria-expanded={isPurposeCardExpanded}
              aria-label={isPurposeCardExpanded ? 'Collapse CV purpose card' : 'Expand CV purpose card'}
            >
              <span>{isPurposeCardExpanded ? 'Collapse' : 'Expand'}</span>
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isPurposeCardExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
        {isPurposeCardExpanded && (
          <div className="mt-3 space-y-3">
            {purposeCard.bullets.map((bullet) => (
              <div key={bullet} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2.5 shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-200/85 leading-7">{bullet}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metrics Breakdown */}
      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 mb-6 space-y-4">
        <ScoreBreakdown label={metrics.primaryLabel} value={metrics.keywords} max={100} displayType="percentage" colorVariant="dynamic" compact={true} />
        <ScoreBreakdown label="Impact words" value={metrics.impactWords} max={100} displayType="percentage" colorVariant="dynamic" compact={true} />
        <ScoreBreakdown label={metrics.formatLabel} value={metrics.atsFormat} max={100} displayType="percentage" colorVariant="dynamic" compact={true} />
        <ScoreBreakdown label="Readability" value={metrics.readability} max={100} displayType="percentage" colorVariant="dynamic" compact={true} />
      </div>

      {/* Formatting Feedback (Live Offline Checks) */}
      <div className="mb-6 bg-white dark:bg-[#1a1410] border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-yellow-500" />
          Live Formatting Checks
        </h4>
        <div className="space-y-2">
          {formattingIssues.length > 0 ? (
            formattingIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-500/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-500/90 leading-tight">
                  {issue.message}
                </p>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-500/90">
                No syntax or formatting issues detected!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Extracted & Missing Skills */}
      <div className="grid grid-cols-1 gap-6 mb-8 shrink-0">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/80 mb-3">Extracted Skills</h4>
          {extractedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {extractedSkills.map((skill: string, i: number) => (
                <span key={i} className="px-2.5 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No skills extracted yet.</p>
          )}
        </div>

        {hasJobDesc && (
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/80 mb-3">Missing High-Value Keys</h4>
            {missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((skill: string, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => handleAddSkill(skill)}
                    className="px-2.5 py-1 text-xs font-medium bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-500/20 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition-colors flex items-center gap-1 group"
                    title={`Add "${skill}" to your skills section`}
                  >
                    <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" /> {skill}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No missing skills detected.</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions Section */}
      <div className="mt-auto flex flex-col gap-4 shrink-0 pb-2">
        {/* Job Target Section */}
        <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 relative overflow-hidden shrink-0">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Target className="w-3.5 h-3.5" />
            Target Role context
          </h4>
          
          {hasJobDesc ? (
            <div className="space-y-3 relative z-10">
              <div 
                className="group cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors"
                onClick={() => {
                  const event = new CustomEvent('open-job-sidebar');
                  window.dispatchEvent(event);
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-emerald-500 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-800 dark:text-white/80 font-medium group-hover:text-emerald-900 dark:group-hover:text-white transition-colors">
                    {state.jobData?.title || 'Senior Software Engineer'}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400/80 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-700 dark:text-white/60 line-clamp-3 group-hover:text-emerald-800 dark:group-hover:text-white/80 transition-colors">
                    {state.jobData?.jobDescription || state.jobData?.description || state.jobData?.jd || 'Job description provided.'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('open-job-sidebar'));
                  }}
                  className="flex-1 py-2 text-[11px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 dark:bg-[#80FF00]/10 dark:text-[#80FF00] dark:hover:bg-[#80FF00]/20 rounded-lg transition-colors border border-emerald-600 dark:border-[#80FF00]/30"
                >
                  Update Target Role
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJobDetails();
                  }}
                  className="flex-1 py-2 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 rounded-lg transition-colors border border-emerald-200 dark:border-white/10"
                >
                  Job Details
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              <p className="text-xs text-emerald-700 dark:text-white/60 mb-3">Add a job description to get specific ATS feedback and keyword matches.</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-job-sidebar'))}
                className="w-full py-2 text-xs font-bold text-emerald-700 dark:text-[#11140e] bg-emerald-200 dark:bg-[#80FF00] hover:bg-emerald-300 dark:hover:bg-[#99ff33] rounded-lg transition-colors shadow-[0_0_10px_rgba(128,255,0,0.2)]"
              >
                Paste Job Description
              </button>
            </div>
          )}
        </div>

        {/* Cover Letter CTA Banner */}
        {!isMasterCV && hasJobDesc && (state.journeyId || state.jobData?._id || state.jobData?.id) && (
          <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-200 dark:border-orange-500/20 relative overflow-hidden group shrink-0">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex flex-col">
              <h4 className="text-orange-700 dark:text-orange-400 font-bold text-sm flex items-center gap-1.5 mb-1.5">
                <FileText className="w-4 h-4 fill-current text-orange-400 dark:text-orange-500" />
                Cover Letter
              </h4>
              <p className="text-orange-600/80 dark:text-orange-200/60 text-xs mb-3">
                Generate a tailored cover letter based on this job description.
              </p>
              <button 
                onClick={() => goToStep(4)}
                className="w-full py-2 bg-orange-500 text-white hover:bg-orange-600 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                Create Cover Letter <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Interview Coach CTA Banner */}
        {hasJobDesc && (state.journeyId || state.jobData?._id || state.jobData?.id) && (
          <div className="bg-indigo-600 dark:bg-indigo-900/30 rounded-xl p-4 border border-indigo-500/50 relative overflow-hidden group shrink-0">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl opacity-50"></div>
            <div className="relative z-10 flex flex-col">
              <h4 className="text-white font-bold text-sm flex items-center gap-1.5 mb-1.5">
                <Zap className="w-4 h-4 fill-current text-yellow-300" />
                Prep for Interview?
              </h4>
              <p className="text-indigo-100 dark:text-indigo-200/80 text-xs mb-3">
                Practice answering questions tailored specifically to this job description.
              </p>
              <button 
                onClick={handleStartCoaching}
                className="w-full py-2 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                Start Coaching <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ATSMeterPanel;

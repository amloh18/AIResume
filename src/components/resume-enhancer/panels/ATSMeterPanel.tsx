'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { UtilityPanelPill } from '../components/UtilityPanelPill';
import {
  Sparkles, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Award, Zap, FileText, ShieldAlert, ChevronDown, ChevronUp, Check, X, HelpCircle, Briefcase, Palette, LayoutTemplate, FileJson, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import guestCVService from '@/lib/services/guestCVService';
import { SENIORITY_LEVELS, filterJobTitles, SeniorityLevel } from '@/lib/data/role-profiler-data';

interface ATSMeterPanelProps {
  isUtilityPanelOpen?: boolean;
  onClose?: () => void;
  showMoriChat?: boolean;
  onToggleMoriChat?: () => void;
}

import {
  ProfilerDemo,
  MoriDemo,
  DesignDemo,
  LayoutDemo,
  JsonDemo,
  Step5ScanDemo
} from '@/components/resume-enhancer/components/PremiumWorkflowDemos';

const PanelWorkflowDemo: React.FC<{ panelType: string }> = ({ panelType }) => {
  const getPanelData = () => {
    switch (panelType) {
      case 'role':
        return { name: 'Target Position', icon: <Briefcase className="w-3.5 h-3.5" />, desc: 'Set your target role and seniority to align ATS keyword scoring.', component: <ProfilerDemo /> };
      case 'mori':
        return { name: 'Mori AI Assistant', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'AI co-pilot that rewrites CV bullets in natural language.', component: <MoriDemo /> };
      case 'design':
        return { name: 'Global Design', icon: <Palette className="w-3.5 h-3.5" />, desc: 'Modify fonts, margins, spacing and accent colors live.', component: <DesignDemo /> };
      case 'layout':
        return { name: 'Template Library', icon: <LayoutTemplate className="w-3.5 h-3.5" />, desc: 'Hot-swap modular layout templates while preserving all data.', component: <LayoutDemo /> };
      case 'json':
        return { name: 'Raw JSON Editor', icon: <FileJson className="w-3.5 h-3.5" />, desc: 'View and directly edit your raw CV data structure.', component: <JsonDemo /> };
      case 'refresh':
        return { name: 'Refresh Analysis', icon: <RefreshCw className="w-3.5 h-3.5" />, desc: 'Run deep content scan, grammar audit, and ATS rescoring.', component: <Step5ScanDemo /> };
      default:
        return { name: '', icon: null, desc: '', component: null };
    }
  };

  const panelInfo = getPanelData();

  return (
    <div className="space-y-2.5">
      {/* Pure visual animation — no text labels inside the viewport */}
      <div className="w-full aspect-video bg-gray-50 dark:bg-black/30 rounded-xl relative overflow-hidden flex items-center justify-center border border-gray-150 dark:border-white/5">
        {panelInfo.component}
      </div>

      {/* Bottom strip — icon + name + short description */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-white/[0.04]">
        <div className="text-teal-600 dark:text-teal-400 shrink-0">{panelInfo.icon}</div>
        <div className="space-y-0.5 text-left flex-1 min-w-0">
          <div className="text-[9px] font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">{panelInfo.name}</div>
          <div className="text-[8px] text-gray-400 dark:text-gray-500 leading-normal">{panelInfo.desc}</div>
        </div>
      </div>
    </div>
  );
};


const AnalysisSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse">
      {/* 1. Header Skeleton */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-gray-250 dark:bg-white/10 shrink-0" />
        <div className="flex-grow space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-2/3 animate-pulse" />
          <div className="h-3 bg-gray-150 dark:bg-white/5 rounded w-1/2 animate-pulse" />
        </div>
      </div>

      {/* 2. Track Indicator Skeleton */}
      <div className="bg-lime-500/5 border border-lime-500/10 rounded-2xl p-3 flex items-center justify-between">
        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-lime-500/20 rounded w-1/4 animate-pulse" />
      </div>

      {/* 3. Collapsible Panels Mockup Skeletons */}
      <div className="space-y-3">
        {/* Panel 1: Category Scores */}
        <div className="border border-gray-200 dark:border-white/[0.05] rounded-2xl p-4 space-y-3 bg-white dark:bg-[#141810]/50">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-gray-200 dark:bg-white/10 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-150 dark:bg-white/5 rounded w-8 animate-pulse" />
          </div>
          <div className="space-y-2.5 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded w-1/6 animate-pulse" />
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded w-10 animate-pulse" />
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full w-full animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded w-1/5 animate-pulse" />
                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded w-8 animate-pulse" />
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full w-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Panel 2: Keyword Audit */}
        <div className="border border-gray-200 dark:border-white/[0.05] rounded-2xl p-4 space-y-3 bg-white dark:bg-[#141810]/50">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-gray-200 dark:bg-white/10 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-150 dark:bg-white/5 rounded w-8 animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <div className="h-6 bg-gray-100 dark:bg-white/5 rounded-lg w-16 animate-pulse" />
            <div className="h-6 bg-gray-200 dark:bg-white/10 rounded-lg w-20 animate-pulse" />
            <div className="h-6 bg-gray-150 dark:bg-white/5 rounded-lg w-14 animate-pulse" />
            <div className="h-6 bg-gray-100 dark:bg-white/5 rounded-lg w-24 animate-pulse" />
          </div>
        </div>

        {/* Panel 3: Suggestions */}
        <div className="border border-gray-200 dark:border-white/[0.05] rounded-2xl p-4 space-y-3 bg-white dark:bg-[#141810]/50">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-gray-200 dark:bg-white/10 rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-150 dark:bg-white/5 rounded w-8 animate-pulse" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-full animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-5/6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading message */}
      <div className="text-center py-4 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-lime-500" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Generating AI Analysis Report...</span>
      </div>
    </div>
  );
};

export const ATSMeterPanel: React.FC<ATSMeterPanelProps> = ({ 
  isUtilityPanelOpen = false, 
  onClose,
  showMoriChat = true,
  onToggleMoriChat
}) => {
  const { state, dispatch, goToStep } = useResumeEnhancer();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);

  // Target Role Profiler states (Inline)
  const [isEditingRole, setIsEditingRole] = useState(!state.targetRole || !state.seniorityLevel);
  const [targetRoleInput, setTargetRoleInput] = useState(state.targetRole || '');
  const [seniorityLevelInput, setSeniorityLevelInput] = useState<any>(state.seniorityLevel);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setTargetRoleInput(state.targetRole || '');
    setSeniorityLevelInput(state.seniorityLevel);
    setIsEditingRole(!state.targetRole || !state.seniorityLevel);
  }, [state.targetRole, state.seniorityLevel]);

  useEffect(() => {
    if (targetRoleInput) {
      setSuggestions(filterJobTitles(targetRoleInput));
    } else {
      setSuggestions([]);
    }
  }, [targetRoleInput]);

  const handleSaveRoleContext = () => {
    if (targetRoleInput && seniorityLevelInput) {
      dispatch({
        type: 'SET_ROLE_CONTEXT',
        payload: { targetRole: targetRoleInput, seniorityLevel: seniorityLevelInput }
      });
      setIsEditingRole(false);
    } else {
      toast.error('Please specify both target role and seniority level.');
    }
  };

  // Collapsible panels states
  const [expanded, setExpanded] = useState({
    categories: true,
    keywords: true,
    strengths: true,
    gaps: true,
    actions: true
  });

  const togglePanel = (panel: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Dispatch a targeted fix to Mori chat
  const sendToMori = (prompt: string, section?: string) => {
    // Ensure analysis panel triggers mori panel too
    window.dispatchEvent(new CustomEvent('mori-fix-issue', { detail: { prompt, section } }));
    toast.success('⚡ Sending to Mori AI...', { duration: 1500, icon: '✨' });
  };

  if (!state.cvData) {
    return <AnalysisSkeleton />;
  }

  const report = state.scoreReport;
  const isMasterCV = state.cvType === 'master';

  const runAnalysis = async (signal?: AbortSignal) => {
    if (!state.cvId) return;
    const isRoleReady = state.cvType === 'journey' || Boolean(state.targetRole && state.seniorityLevel);
    if (!isRoleReady) {
      dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: true });
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze-cv-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          CV_DATA: state.cvData,
          CV_TYPE: state.cvType,
          JD_DATA: state.jobData || (state.jdText ? { description: state.jdText } : undefined),
          TARGET_ROLE: state.targetRole,
          MASTER_CV_DATA: null
        })
      });

      if (!response.ok) {
        let errMsg = 'Analysis request failed';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success && data.scoreReport) {
        const report = data.scoreReport;
        
        // Dispatch to context
        dispatch({
          type: 'SET_SURGEON_ANALYSIS',
          payload: {
            score: report.overall_score || 0,
            fixes: [],
            scoreReport: report
          }
        });

        // Save to cache (database for authenticated user, guest draft for guest user)
        if (state.cvId !== 'guest-draft') {
          await fetch(`/api/cvs/${state.cvId}/surgeon-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              score: report.overall_score || 0,
              fixes: [],
              annotations: [],
              targetRole: state.targetRole || '',
              seniorityLevel: state.seniorityLevel || '',
              scoreReport: report
            })
          });
        } else {
          const currentDraft = await guestCVService.loadGuestDraft();
          if (currentDraft.success && currentDraft.data) {
            await guestCVService.saveGuestDraft({
              ...currentDraft.data,
              aiAnalysis: {
                score: report.overall_score || 0,
                scoreReport: report
              }
            });
          }
        }

        toast.success('Analysis completed successfully!');
      } else {
        throw new Error(data.error || 'Failed to parse report');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Analysis request aborted');
        return;
      }
      console.error('Analysis error:', err);
      toast.error('Failed to run analysis: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const abortController = new AbortController();

    if (!report && !isAnalyzing && state.cvId) {
      timeoutId = setTimeout(() => {
        runAnalysis(abortController.signal);
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [report, state.cvId]);

  const handleOptimizeCV = async () => {
    if (!state.cvId || !report) return;
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/ai/tailor-cv-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CV_DATA: state.cvData,
          CV_TYPE: state.cvType,
          SCORE_REPORT: report,
          MASTER_CV_DATA: state.cvData, // Fallback to current CV
          JD_DATA: state.jobData || (state.jdText ? { description: state.jdText } : undefined),
          TARGET_ROLE: state.targetRole,
          OPTIMISATION_TARGET: {
            primaryRole: state.targetRole,
            seniority: state.seniorityLevel
          }
        })
      });

      if (!response.ok) {
        let errMsg = 'Tailoring request failed';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success && data.optimised_cv) {
        const optimised_cv = data.optimised_cv;
        const mappedCV: any = { ...state.cvData };

        if (optimised_cv.personal_details || optimised_cv.professional_summary) {
          mappedCV.basics = {
            ...mappedCV.basics,
            name: optimised_cv.personal_details?.name || mappedCV.basics?.name,
            label: optimised_cv.personal_details?.title || mappedCV.basics?.label,
            email: optimised_cv.personal_details?.email || mappedCV.basics?.email,
            phone: optimised_cv.personal_details?.phone || mappedCV.basics?.phone,
            url: optimised_cv.personal_details?.portfolio || mappedCV.basics?.url,
            summary: optimised_cv.professional_summary || mappedCV.basics?.summary
          };
          const profiles = [];
          if (optimised_cv.personal_details?.linkedin) {
            profiles.push({ network: 'LinkedIn', url: optimised_cv.personal_details.linkedin });
          }
          if (optimised_cv.personal_details?.github) {
            profiles.push({ network: 'GitHub', url: optimised_cv.personal_details.github });
          }
          if (profiles.length > 0) {
            mappedCV.basics.profiles = profiles;
          }
        }

        if (optimised_cv.work_experience) {
          mappedCV.work = optimised_cv.work_experience.map((w: any) => ({
            company: w.company,
            position: w.title,
            startDate: w.start_date,
            endDate: w.end_date,
            location: w.location,
            highlights: w.bullets
          }));
        }

        if (optimised_cv.projects) {
          mappedCV.projects = optimised_cv.projects.map((p: any) => ({
            name: p.name,
            description: p.bullets ? p.bullets.join('\n') : '',
            highlights: p.bullets || [],
            startDate: p.start_date,
            endDate: p.end_date
          }));
        }

        if (optimised_cv.education) {
          mappedCV.education = optimised_cv.education.map((e: any) => ({
            institution: e.institution,
            area: e.area,
            studyType: e.degree,
            startDate: e.start_date,
            endDate: e.end_date,
            description: e.description
          }));
        }

        if (optimised_cv.skills) {
          if (Array.isArray(optimised_cv.skills) && optimised_cv.skills[0]?.category) {
            mappedCV.skills = optimised_cv.skills.map((s: any) => ({
              category: s.category,
              skills: s.items || []
            }));
          } else if (Array.isArray(optimised_cv.skills)) {
            mappedCV.skills = [{ category: 'Skills', skills: optimised_cv.skills }];
          }
        }

        dispatch({ type: 'SET_CV_DATA', payload: mappedCV });
        toast.success('CV optimized successfully!');
        
        // Auto run re-analysis on the new CV
        setTimeout(() => {
          runAnalysis();
        }, 800);
      } else {
        throw new Error(data.error || 'Failed to parse optimized CV');
      }
    } catch (err: any) {
      console.error('Optimization error:', err);
      toast.error('Failed to optimize CV: ' + err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCreateCoverLetter = async () => {
    if (!state.cvId || !report) return;
    setIsGeneratingLetter(true);
    try {
      const response = await fetch('/api/ai/generate-cover-letter-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CV_DATA: state.cvData,
          CV_TYPE: state.cvType,
          SCORE_REPORT: report,
          MASTER_CV_DATA: state.cvData,
          JD_DATA: state.jobData || (state.jdText ? { description: state.jdText } : undefined),
          TARGET_ROLE: state.targetRole,
          COMPANY_NAME: state.jobData?.company || state.jobData?.companyName || 'Target Company',
          CANDIDATE_NAME: state.cvData?.basics?.name || 'Candidate',
          TONE_PREFERENCE: 'confident and direct'
        })
      });

      if (!response.ok) {
        let errMsg = 'Cover letter generation failed';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success && data.letter_body) {
        dispatch({
          type: 'SET_AUTO_COVER_LETTER',
          payload: {
            draft: data.letter_body,
            score: data.letter_metadata?.estimated_score || 85
          }
        });
        toast.success('Cover letter generated successfully! Proceed to Step 4.');
        goToStep(4);
      } else {
        throw new Error(data.error || 'Failed to parse cover letter');
      }
    } catch (err: any) {
      console.error('Cover letter error:', err);
      toast.error('Failed to generate cover letter: ' + err.message);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  // Compute values for UI elements
  const categoryScores = useMemo(() => {
    if (!report) return [];
    if (report.category_scores) return report.category_scores;

    // Fallbacks if Master CV
    if (report.completeness_audit) {
      return [
        { name: 'Content completeness', score: report.completeness_audit.completeness_score || 0 },
        { name: 'Bullet quality & strength', score: report.bullet_quality_audit?.avg_strength === 'strong' ? 90 : report.bullet_quality_audit?.avg_strength === 'moderate' ? 65 : 40 },
        { name: 'Quantification rate', score: report.bullet_quality_audit?.quantified_pct || 0 },
        { name: 'ATS structure & readability', score: 80 },
        { name: 'Derivation potential', score: report.derivation_potential?.derivation_score || 0 }
      ];
    }
    return [];
  }, [report]);

  const categoryAverage = useMemo(() => {
    if (categoryScores.length === 0) return 0;
    return Math.round(categoryScores.reduce((sum: number, c: any) => sum + c.score, 0) / categoryScores.length);
  }, [categoryScores]);

  const matchedKeywordsCount = useMemo(() => {
    if (!report) return 0;
    if (report.jd_keyword_match) {
      return report.jd_keyword_match.keywords_hit || 0;
    }
    const kwPreview = report.always_visible?.keyword_preview || [];
    return kwPreview.filter((k: any) => k.status === 'hit').length;
  }, [report]);

  const gapKeywordsCount = useMemo(() => {
    if (!report) return 0;
    if (report.jd_keyword_match) {
      return report.jd_keyword_match.keywords_missed || 0;
    }
    const kwPreview = report.always_visible?.keyword_preview || [];
    return kwPreview.filter((k: any) => k.status === 'miss').length;
  }, [report]);

  const partialKeywordsCount = useMemo(() => {
    if (!report) return 0;
    if (report.jd_keyword_match) {
      return report.jd_keyword_match.keywords_partial || 0;
    }
    const kwPreview = report.always_visible?.keyword_preview || [];
    return kwPreview.filter((k: any) => k.status === 'partial').length;
  }, [report]);

  const keywordsList = useMemo(() => {
    if (!report) return [];
    if (report.jd_keyword_match?.keywords) return report.jd_keyword_match.keywords;
    return report.always_visible?.keyword_preview || [];
  }, [report]);

  const strengthsList = useMemo(() => {
    if (!report) return [];
    return report.strengths || [];
  }, [report]);

  const gapsList = useMemo(() => {
    if (!report) return [];
    return report.gaps || [];
  }, [report]);

  const actionsList = useMemo(() => {
    if (!report) return [];
    return report.actions || [];
  }, [report]);

  const recommendedTrack = useMemo(() => {
    if (!report) return null;
    return report.recommended_track || null;
  }, [report]);

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] dark:bg-[var(--bg-secondary)] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-y-auto scrollbar-hide text-gray-900 dark:text-white snap-y snap-mandatory scroll-smooth">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 relative flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-sm border-b border-gray-100 dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-200">Analysis</h3>
          {/* Refresh Analysis next to text */}
          <button
            onClick={() => runAnalysis()}
            disabled={isAnalyzing}
            onMouseEnter={() => setHoveredIcon('refresh')}
            onMouseLeave={() => setHoveredIcon(null)}
            className="p-1 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10 transition-all disabled:opacity-40 hover:scale-110 active:scale-95 duration-150 cursor-pointer shrink-0 animate-fadeIn"
            title="Refresh Analysis"
          >
            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <UtilityPanelPill activePanel={showMoriChat ? 'mori' : null} onHoverPanel={(panel) => setHoveredIcon(panel)} onToggleMori={onToggleMoriChat} />
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-150 dark:hover:bg-white/5 transition-colors lg:hidden border-none bg-transparent"
              title="Close Analysis"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Floating rich hover info card with animated motion graphics */}
        {hoveredIcon && (
          <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-white dark:bg-[#191c1b] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 shadow-[0_12px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.5)] z-50 animate-fadeIn pointer-events-none">
            <PanelWorkflowDemo panelType={hoveredIcon} />
          </div>
        )}
      </div>


      <div className="flex-1 p-4 space-y-4">
        {/* ── Inline Target Role Profiler (for non-journey CVs) ── */}
        {state.cvType !== 'journey' && (
          <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[color:var(--accent-primary)]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">Target Position</h4>
              </div>
              {!isEditingRole && (
                <button
                  onClick={() => setIsEditingRole(true)}
                  className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {isEditingRole ? (
              <div className="space-y-4">
                {(!state.targetRole || !state.seniorityLevel) && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-normal">
                    ⚠️ Configure your target position below to begin resume analysis.
                  </p>
                )}
                {/* Target Role Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={targetRoleInput}
                    onChange={(e) => setTargetRoleInput(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="e.g., Data Analyst, Software Engineer..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all animate-fadeIn"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                      {suggestions.map((role, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setTargetRoleInput(role);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-gray-800 dark:text-gray-200 hover:bg-teal-500/10 transition-colors"
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seniority Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  {SENIORITY_LEVELS.map((level) => (
                    <button
                      key={level.level}
                      onClick={() => setSeniorityLevelInput(level.level)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold text-center border transition-all ${
                        seniorityLevelInput === level.level
                          ? 'bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {level.level}
                    </button>
                  ))}
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveRoleContext}
                  disabled={!targetRoleInput || !seniorityLevelInput}
                  className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-40"
                >
                  Save Profile Context
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-gray-900 dark:text-white">{state.targetRole}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium capitalize mt-0.5">{state.seniorityLevel} Level</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Main Content Area ── */}
        {!report ? (
          isAnalyzing ? (
            <AnalysisSkeleton />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-250 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-black/5">
              <ShieldAlert className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
              <h4 className="text-base font-black text-gray-900 dark:text-white mb-2">No Analysis Report Available</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-6 leading-relaxed">
                Run an AI analysis scan to see your overall score, keywords matches, strengths, and optimized suggestions.
              </p>
              <button
                onClick={() => runAnalysis()}
                disabled={isAnalyzing}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing CV...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> Run V3 Analysis Scan
                  </>
                )}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4 animate-fadeIn">
            
            {/* ── 1. MAIN SCORE HEADER ── */}
            <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              {/* Radial Score Gauge */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-100 dark:text-white/5"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="#D97706" // Match orange color theme of score 65
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - (report.overall_score || 0) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-gray-900 dark:text-white leading-none">
                    {report.overall_score || 0}
                  </span>
                  <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">/100</span>
                </div>
              </div>

              {/* Verdict text details */}
              <div className="min-w-0 flex-grow">
                <h4 className="text-sm font-black text-gray-900 dark:text-white leading-snug">
                  {state.jobData?.title || state.jobData?.jobTitle || state.targetRole || 'Target Role'}
                </h4>
                <p 
                  className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed font-semibold truncate"
                  title={`${report.verdict || 'Moderate match'} · ${report.verdict_sub || 'strong foundation'}`}
                >
                  {report.verdict || 'Moderate match'} · {report.verdict_sub || 'strong foundation'}
                </p>
                
                {/* Visual Status Pills below header */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {matchedKeywordsCount} matched
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {gapKeywordsCount} gaps
                  </span>
                  {partialKeywordsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {partialKeywordsCount} partial
                    </span>
                  )}
                  {recommendedTrack && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {recommendedTrack.label || 'Early-mid track'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Fix All with Mori CTA ── */}
            {(gapsList.length > 0 || actionsList.length > 0) && (
              <button
                onClick={() => sendToMori(
                  `Fix all critical issues found in my CV analysis: ${gapsList.map((g: any) => g.title).join(', ')}. Also apply these priority actions: ${actionsList.map((a: any) => a.title).join(', ')}. Apply all improvements now.`
                )}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fix All Issues with Mori
                <span className="text-[10px] font-black opacity-70">{gapsList.length + actionsList.length} fixes</span>
              </button>
            )}

            {/* ── 2. CATEGORY SCORES PANEL ── */}
            {categoryScores.length > 0 && (
              <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => togglePanel('categories')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors border-b border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">📊</span>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">Category scores</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Avg {categoryAverage}%
                    </span>
                    {expanded.categories ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                
                {/* Horizontal row of highest/lowest highlighted score pills */}
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-white/[0.02]">
                  {categoryScores.slice(0, 4).map((c: any, i: number) => {
                    const status = c.score >= 70 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : c.score >= 40 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
                    return (
                      <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${status}`}>
                        {c.name} {c.score}%
                      </span>
                    );
                  })}
                </div>

                {expanded.categories && (
                  <div className="p-4 space-y-3.5">
                    {categoryScores.map((c: any, i: number) => {
                      const color = c.score >= 70 ? 'bg-emerald-500' : c.score >= 40 ? 'bg-amber-500' : 'bg-rose-500';
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 dark:text-gray-300">
                            <span>{c.name}</span>
                            <span>{c.score}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${c.score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── 3. KEYWORD AUDIT PANEL ── */}
            {keywordsList.length > 0 && (
              <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => togglePanel('keywords')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors border-b border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">🏷️</span>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">Keyword audit</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{matchedKeywordsCount} hit</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">{gapKeywordsCount} miss</span>
                    </span>
                    {expanded.keywords ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                
                {/* Horizontal row of highlighted keywords */}
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-white/[0.02]">
                  {keywordsList.slice(0, 5).map((k: any, i: number) => {
                    const status = k.status === 'hit' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : k.status === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
                    return (
                      <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${status}`}>
                        {k.label}
                      </span>
                    );
                  })}
                </div>

                {expanded.keywords && (
                  <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                      {keywordsList.map((k: any, i: number) => {
                        const statusColors =
                          k.status === 'hit' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15' :
                          k.status === 'partial' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15' :
                          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15';
                        return (
                          <span key={i} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${statusColors}`}>
                            {k.label}
                          </span>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase text-gray-400 border-t border-gray-100 dark:border-white/5 pt-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Matched
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Missing
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 4. WHAT'S WORKING FOR YOU PANEL ── */}
            {strengthsList.length > 0 && (
              <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => togglePanel('strengths')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors border-b border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">👍</span>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">What's working for you</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {strengthsList.length} strengths
                    </span>
                    {expanded.strengths ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                
                {/* Horizontal row of highlight pills */}
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-white/[0.02]">
                  {strengthsList.slice(0, 4).map((s: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {s.title}
                    </span>
                  ))}
                </div>

                {expanded.strengths && (
                  <div className="p-4 divide-y divide-gray-100 dark:divide-white/5">
                    {strengthsList.map((s: any, i: number) => (
                      <div key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-black text-gray-900 dark:text-white leading-relaxed">
                            {s.title}
                          </h5>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                            {s.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 5. CRITICAL GAPS PANEL ── */}
            {gapsList.length > 0 && (
              <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => togglePanel('gaps')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors border-b border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">⚠️</span>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">Critical gaps</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      {gapsList.length} blockers
                    </span>
                    {expanded.gaps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                
                {/* Horizontal row of gap highlight pills */}
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-white/[0.02]">
                  {gapsList.slice(0, 4).map((g: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      {g.title}
                    </span>
                  ))}
                </div>

                {expanded.gaps && (
                  <div className="p-4 divide-y divide-gray-100 dark:divide-white/5">
                    {gapsList.map((g: any, i: number) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h5 className="text-[11px] font-black text-gray-900 dark:text-white leading-relaxed">
                              {g.title}
                            </h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                              {g.detail}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => sendToMori(
                            `Fix this CV gap: "${g.title}". ${g.detail || ''} Apply the fix directly to my CV now.`,
                            g.section || ''
                          )}
                          className="ml-8 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all border border-rose-500/20 hover:border-rose-500/40 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          Fix with Mori
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 6. PRIORITY ACTIONS PANEL ── */}
            {actionsList.length > 0 && (
              <div className="snap-start scroll-mt-14 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/[0.05] rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => togglePanel('actions')}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors border-b border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">🚀</span>
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200">Priority actions</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {actionsList.length} steps
                    </span>
                    {expanded.actions ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                
                {/* Horizontal row of actions highlight pills */}
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-white/[0.02]">
                  {actionsList.slice(0, 4).map((a: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {a.title}
                    </span>
                  ))}
                </div>

                {expanded.actions && (
                  <div className="p-4 space-y-4">
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {actionsList.map((a: any, i: number) => (
                        <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-2">
                          <div className="flex gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                              {a.step || (i + 1)}
                            </div>
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <h5 className="text-[11px] font-black text-gray-900 dark:text-white leading-relaxed">
                                {a.title}
                              </h5>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                                {a.detail}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => sendToMori(
                              `Action item ${a.step || i + 1}: "${a.title}". ${a.detail || ''} Apply this improvement to my CV right now.`,
                              a.section || ''
                            )}
                            className="ml-8 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all border border-blue-500/20 hover:border-blue-500/40 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            Fix with Mori
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Which track to target highlight card */}
                    {recommendedTrack && (
                      <div className="bg-gray-50 dark:bg-white/[0.015] border border-gray-150 dark:border-white/5 rounded-xl p-3.5 mt-2 space-y-1 select-text">
                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">
                          Which track to target
                        </span>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                          Apply to the <strong className="font-extrabold text-gray-900 dark:text-white">{recommendedTrack.label || 'Early-mid track'}</strong>. {recommendedTrack.rationale}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Bottom tip ── */}
            <p className="text-[10px] text-gray-400 dark:text-gray-600 flex items-start gap-1.5 pb-1">
              <span className="text-yellow-400 shrink-0 mt-0.5">💡</span>
              Tip: Fix all blockers and priority actions above to increase your overall score!
            </p>

          </div>
        )}
      </div>
    </div>
  );
};

export default ATSMeterPanel;

'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { CVSurgeonService, type SurgicalFix } from '@/lib/services/cv-surgeon-service';
import type { KeywordGap, KeywordGapAnalysisResult } from '@/types/keyword-gap';
import { type AnalysisMode, type AnalysisModeInfo } from '@/lib/utils/analysis-mode';

// State Interface - focused only on analysis and AI features
export interface AnalysisState {
  // Role context
  targetRole: string;
  seniorityLevel: string;
  
  // Job context
  jobData?: any;
  
  // AI Analysis
  surgeonAnalysis: { score: number; fixes: SurgicalFix[] } | null;
  isAnalyzing: boolean;
  
  // Surgical fixes
  surgicalFixes: SurgicalFix[];
  
  // Report / Review & Fix mode
  fixAnnotations: FixAnnotation[];
  reportOpen: boolean;
  reviewMode: boolean;
  activeFixId?: string;
  
  // ATS Score & Template Cap
  atsScoreCap: number;
  atsScore: number;
  
  // Keyword Gap Analysis
  keywordGaps: KeywordGap[];
  keywordGapAnalysis: KeywordGapAnalysisResult | null;
  isAnalyzingKeywords: boolean;
  
  // Analysis Mode
  analysisMode: AnalysisMode;
  analysisModeInfo: AnalysisModeInfo | null;
  lastAnalysisContext: {
    mode: AnalysisMode;
    roleHash: string;
    jdHash: string;
  } | null;
  
  // Loop breaker state
  currentCVHash?: string;
  suppressedFixHashes: string[];
}

// Action Types
type AnalysisAction =
  | { type: 'SET_TARGET_ROLE'; payload: string }
  | { type: 'SET_SENIORITY_LEVEL'; payload: string }
  | { type: 'SET_JOB_DATA'; payload: any }
  | { type: 'SET_SURGEON_ANALYSIS'; payload: { score: number; fixes: SurgicalFix[] } | null }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_SURGICAL_FIXES'; payload: SurgicalFix[] }
  | { type: 'SET_FIX_ANNOTATIONS'; payload: FixAnnotation[] }
  | { type: 'SET_REPORT_OPEN'; payload: boolean }
  | { type: 'SET_REVIEW_MODE'; payload: boolean }
  | { type: 'SET_ACTIVE_FIX'; payload: string | undefined }
  | { type: 'MARK_FIX_APPLIED'; payload: string }
  | { type: 'MARK_FIX_DISMISSED'; payload: string }
  | { type: 'SET_ATS_SCORE_CAP'; payload: number }
  | { type: 'SET_ATS_SCORE'; payload: number }
  | { type: 'SET_KEYWORD_GAPS'; payload: KeywordGap[] }
  | { type: 'SET_KEYWORD_GAP_ANALYSIS'; payload: KeywordGapAnalysisResult | null }
  | { type: 'SET_ANALYZING_KEYWORDS'; payload: boolean }
  | { type: 'SET_ANALYSIS_MODE'; payload: AnalysisMode }
  | { type: 'SET_ANALYSIS_MODE_INFO'; payload: AnalysisModeInfo | null }
  | { type: 'SET_LAST_ANALYSIS_CONTEXT'; payload: { mode: AnalysisMode; roleHash: string; jdHash: string } | null }
  | { type: 'SET_CV_HASH'; payload: string }
  | { type: 'SUPPRESS_FIX_HASH'; payload: string }
  | { type: 'RESET_ANALYSIS' };

// Initial State
const initialAnalysisState: AnalysisState = {
  targetRole: '',
  seniorityLevel: '',
  jobData: undefined,
  surgeonAnalysis: null,
  isAnalyzing: false,
  surgicalFixes: [],
  fixAnnotations: [],
  reportOpen: false,
  reviewMode: false,
  activeFixId: undefined,
  atsScoreCap: 100,
  atsScore: 0,
  keywordGaps: [],
  keywordGapAnalysis: null,
  isAnalyzingKeywords: false,
  analysisMode: 'role-based',
  analysisModeInfo: null,
  lastAnalysisContext: null,
  currentCVHash: undefined,
  suppressedFixHashes: [],
};

// Reducer
function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'SET_TARGET_ROLE':
      return { ...state, targetRole: action.payload };
    
    case 'SET_SENIORITY_LEVEL':
      return { ...state, seniorityLevel: action.payload };
    
    case 'SET_JOB_DATA':
      return { ...state, jobData: action.payload };
    
    case 'SET_SURGEON_ANALYSIS':
      return { ...state, surgeonAnalysis: action.payload };
    
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload };
    
    case 'SET_SURGICAL_FIXES':
      return { ...state, surgicalFixes: action.payload };
    
    case 'SET_FIX_ANNOTATIONS':
      return { ...state, fixAnnotations: action.payload };
    
    case 'SET_REPORT_OPEN':
      return { ...state, reportOpen: action.payload };
    
    case 'SET_REVIEW_MODE':
      return { ...state, reviewMode: action.payload };
    
    case 'SET_ACTIVE_FIX':
      return { ...state, activeFixId: action.payload };
    
    case 'MARK_FIX_APPLIED':
      return {
        ...state,
        surgicalFixes: state.surgicalFixes.map(f =>
          f.id === action.payload ? { ...f, status: 'accepted' as const } : f
        ),
        fixAnnotations: state.fixAnnotations.map(f =>
          f.id === action.payload ? { ...f, status: 'applied' } : f
        ),
      };
    
    case 'MARK_FIX_DISMISSED':
      return {
        ...state,
        surgicalFixes: state.surgicalFixes.map(f =>
          f.id === action.payload ? { ...f, status: 'rejected' as const } : f
        ),
        fixAnnotations: state.fixAnnotations.map(f =>
          f.id === action.payload ? { ...f, status: 'dismissed' } : f
        ),
      };
    
    case 'SET_ATS_SCORE_CAP':
      return { ...state, atsScoreCap: action.payload };
    
    case 'SET_ATS_SCORE':
      return { ...state, atsScore: action.payload };
    
    case 'SET_KEYWORD_GAPS':
      return { ...state, keywordGaps: action.payload };
    
    case 'SET_KEYWORD_GAP_ANALYSIS':
      return { ...state, keywordGapAnalysis: action.payload };
    
    case 'SET_ANALYZING_KEYWORDS':
      return { ...state, isAnalyzingKeywords: action.payload };
    
    case 'SET_ANALYSIS_MODE':
      return { ...state, analysisMode: action.payload };
    
    case 'SET_ANALYSIS_MODE_INFO':
      return { ...state, analysisModeInfo: action.payload };
    
    case 'SET_LAST_ANALYSIS_CONTEXT':
      return { ...state, lastAnalysisContext: action.payload };
    
    case 'SET_CV_HASH':
      return { ...state, currentCVHash: action.payload };
    
    case 'SUPPRESS_FIX_HASH':
      if (state.suppressedFixHashes.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        suppressedFixHashes: [...state.suppressedFixHashes, action.payload]
      };
    
    case 'RESET_ANALYSIS':
      return initialAnalysisState;
    
    default:
      return state;
  }
}

// Context
interface AnalysisContextType {
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;
  
  // Convenience methods
  setTargetRole: (role: string) => void;
  setSeniorityLevel: (level: string) => void;
  setJobData: (data: any) => void;
  setSurgeonAnalysis: (analysis: { score: number; fixes: SurgicalFix[] } | null) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setSurgicalFixes: (fixes: SurgicalFix[]) => void;
  setFixAnnotations: (annotations: FixAnnotation[]) => void;
  setReportOpen: (open: boolean) => void;
  setReviewMode: (mode: boolean) => void;
  setActiveFix: (fixId: string | undefined) => void;
  markFixApplied: (fixId: string) => void;
  markFixDismissed: (fixId: string) => void;
  setAtsScoreCap: (cap: number) => void;
  setAtsScore: (score: number) => void;
  setKeywordGaps: (gaps: KeywordGap[]) => void;
  setKeywordGapAnalysis: (analysis: KeywordGapAnalysisResult | null) => void;
  setAnalyzingKeywords: (isAnalyzing: boolean) => void;
  setAnalysisMode: (mode: AnalysisMode) => void;
  setAnalysisModeInfo: (info: AnalysisModeInfo | null) => void;
  
  // Computed values
  pendingFixes: SurgicalFix[];
  appliedFixes: SurgicalFix[];
  dismissedFixes: SurgicalFix[];
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

// Provider
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);

  const setTargetRole = (role: string) => dispatch({ type: 'SET_TARGET_ROLE', payload: role });
  const setSeniorityLevel = (level: string) => dispatch({ type: 'SET_SENIORITY_LEVEL', payload: level });
  const setJobData = (data: any) => dispatch({ type: 'SET_JOB_DATA', payload: data });
  const setSurgeonAnalysis = (analysis: { score: number; fixes: SurgicalFix[] } | null) => 
    dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: analysis });
  const setAnalyzing = (isAnalyzing: boolean) => dispatch({ type: 'SET_ANALYZING', payload: isAnalyzing });
  const setSurgicalFixes = (fixes: SurgicalFix[]) => dispatch({ type: 'SET_SURGICAL_FIXES', payload: fixes });
  const setFixAnnotations = (annotations: FixAnnotation[]) => dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: annotations });
  const setReportOpen = (open: boolean) => dispatch({ type: 'SET_REPORT_OPEN', payload: open });
  const setReviewMode = (mode: boolean) => dispatch({ type: 'SET_REVIEW_MODE', payload: mode });
  const setActiveFix = (fixId: string | undefined) => dispatch({ type: 'SET_ACTIVE_FIX', payload: fixId });
  const markFixApplied = (fixId: string) => dispatch({ type: 'MARK_FIX_APPLIED', payload: fixId });
  const markFixDismissed = (fixId: string) => dispatch({ type: 'MARK_FIX_DISMISSED', payload: fixId });
  const setAtsScoreCap = (cap: number) => dispatch({ type: 'SET_ATS_SCORE_CAP', payload: cap });
  const setAtsScore = (score: number) => dispatch({ type: 'SET_ATS_SCORE', payload: score });
  const setKeywordGaps = (gaps: KeywordGap[]) => dispatch({ type: 'SET_KEYWORD_GAPS', payload: gaps });
  const setKeywordGapAnalysis = (analysis: KeywordGapAnalysisResult | null) => 
    dispatch({ type: 'SET_KEYWORD_GAP_ANALYSIS', payload: analysis });
  const setAnalyzingKeywords = (isAnalyzing: boolean) => dispatch({ type: 'SET_ANALYZING_KEYWORDS', payload: isAnalyzing });
  const setAnalysisMode = (mode: AnalysisMode) => dispatch({ type: 'SET_ANALYSIS_MODE', payload: mode });
  const setAnalysisModeInfo = (info: AnalysisModeInfo | null) => dispatch({ type: 'SET_ANALYSIS_MODE_INFO', payload: info });

  // Computed values
  const pendingFixes = state.surgicalFixes.filter(f => f.status === 'pending');
  const appliedFixes = state.surgicalFixes.filter(f => f.status === 'accepted');
  const dismissedFixes = state.surgicalFixes.filter(f => f.status === 'rejected');

  const contextValue: AnalysisContextType = {
    state,
    dispatch,
    setTargetRole,
    setSeniorityLevel,
    setJobData,
    setSurgeonAnalysis,
    setAnalyzing,
    setSurgicalFixes,
    setFixAnnotations,
    setReportOpen,
    setReviewMode,
    setActiveFix,
    markFixApplied,
    markFixDismissed,
    setAtsScoreCap,
    setAtsScore,
    setKeywordGaps,
    setKeywordGapAnalysis,
    setAnalyzingKeywords,
    setAnalysisMode,
    setAnalysisModeInfo,
    pendingFixes,
    appliedFixes,
    dismissedFixes,
  };

  return (
    <AnalysisContext.Provider value={contextValue}>
      {children}
    </AnalysisContext.Provider>
  );
}

// Hook to use context
export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return context;
}

// Export for testing
export { AnalysisContext };

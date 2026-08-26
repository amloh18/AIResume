'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  matchedKeywords?: string[];
  strengths: string[];
  suggestions: string[];
  extractedKeywords?: string[];
  warnings?: string[];
  keywordAnalysis?: any;
  scoreResult?: any;
  formatScore?: number;
  actionVerbsCount?: number;
  readabilityScore?: number;
  factorBreakdown?: {
    hardKeywords: { score: number; weight: number; matched: number; total: number };
    jobTitles: { score: number; weight: number; matched: boolean };
    experienceLength: { score: number; weight: number; years: number };
    formatting: { score: number; weight: number; issues: string[] };
    softSkills: { score: number; weight: number; matched: number; total: number };
  };
  knockOutFactors?: {
    fileFormat: { passed: boolean; issue?: string };
    sectionHeaders: { passed: boolean; issues: string[] };
    contactInfo: { passed: boolean; issues: string[] };
  };
  audit_report?: {
    cv_profile_strength?: {
      score: number;
      breakdown: { C: number; I?: number; Q?: number; F: number; R: number };
      multiplier?: number;
      penalty_reasons?: string[];
    };
    ats_match_score?: {
      score: number;
      breakdown: { K?: number; F: number; S?: number; R: number; C: number };
      multiplier?: number;
      context?: string;
    };
  };
  updatedAt?: string;
}

export interface SurgeonAnalysis {
  score: number;
  fixes: any[];
  annotations: any[];
  targetRole: string;
  seniorityLevel: string;
  analyzedAt: Date;
  contentHash?: string;
  jobDataHash?: string;
  isRestricted?: boolean;
  scoreReport?: any;
}

// Deep Dive types (merged from ATSDeepDiveContext)
export type ParserType = 'taleo' | 'greenhouse' | 'lever' | 'generic';
export type ActiveLayer = 'reading-path' | 'timeline' | 'heatmap' | null;

interface ATSDeepDiveState {
  isActive: boolean;
  activeLayers: Set<ActiveLayer>;
  selectedParser: ParserType;
  showCriticalOnly: boolean;
  selectedFactor: string | null;
}

interface ATSContextState {
  // ATS Score and Analysis
  atsScore: number | null;
  atsAnalysis: ATSAnalysis | null;
  isATSLoading: boolean;
  atsError: string | null;

  // Surgeon Analysis
  surgeonAnalysis: SurgeonAnalysis | null;
  isSurgeonLoading: boolean;
  surgeonError: string | null;

  // Deep Dive UI State (merged from ATSDeepDiveContext)
  deepDive: ATSDeepDiveState;

  // Metadata
  lastUpdated: Date | null;
  cvId: string | null;
  journeyId: string | null;
  jobId: string | null;
}

interface ATSContextValue extends ATSContextState {
  // ATS Score methods
  updateATSScore: (score: number, analysis: ATSAnalysis, cvId: string, journeyId?: string, jobId?: string) => Promise<void>;
  refreshATSScore: (cvId?: string, jobId?: string, userId?: string) => Promise<number | null>;

  // Surgeon Analysis methods
  updateSurgeonAnalysis: (analysis: SurgeonAnalysis, cvId: string) => Promise<void>;
  refreshSurgeonAnalysis: (cvId: string) => Promise<void>;

  // Deep Dive methods (merged from ATSDeepDiveContext)
  activateDeepDive: () => void;
  deactivateDeepDive: () => void;
  toggleDeepDiveLayer: (layer: ActiveLayer) => void;
  setDeepDiveParser: (parser: ParserType) => void;
  toggleDeepDiveCriticalOnly: () => void;
  selectDeepDiveFactor: (factor: string | null) => void;
  isDeepDiveLayerActive: (layer: ActiveLayer) => boolean;

  // Combined refresh
  refreshAll: (cvId: string, journeyId?: string, jobId?: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const ATSContext = createContext<ATSContextValue | undefined>(undefined);

export function ATSProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ATSContextState>({
    atsScore: null,
    atsAnalysis: null,
    isATSLoading: false,
    atsError: null,
    surgeonAnalysis: null,
    isSurgeonLoading: false,
    surgeonError: null,
    deepDive: {
      isActive: false,
      activeLayers: new Set(['timeline']),
      selectedParser: 'generic',
      showCriticalOnly: true,
      selectedFactor: null,
    },
    lastUpdated: null,
    cvId: null,
    journeyId: null,
    jobId: null,
  });

  // Update ATS Score - saves to database and updates context
  const updateATSScore = useCallback(async (
    score: number,
    analysis: ATSAnalysis,
    cvId: string,
    journeyId?: string,
    jobId?: string
  ) => {
    try {
      setState(prev => ({ ...prev, isATSLoading: true, atsError: null }));

      // The API route /api/ats/calculate-score already saves to database
      // This method is called after the API call, so we just update context
      setState(prev => ({
        ...prev,
        atsScore: score,
        atsAnalysis: {
          ...analysis,
          updatedAt: new Date().toISOString(),
        },
        isATSLoading: false,
        lastUpdated: new Date(),
        cvId,
        journeyId: journeyId || prev.journeyId,
        jobId: jobId || prev.jobId,
      }));

      console.log('✅ ATSContext - ATS score updated:', { score, cvId, journeyId, jobId });
    } catch (error) {
      console.error('❌ ATSContext - Error updating ATS score:', error);
      setState(prev => ({
        ...prev,
        isATSLoading: false,
        atsError: error instanceof Error ? error.message : 'Failed to update ATS score',
      }));
    }
  }, []);

  // Refresh ATS Score from database
  const refreshATSScore = useCallback(async (cvId?: string, jobId?: string, userId?: string) => {
    try {
      setState(prev => ({ ...prev, isATSLoading: true, atsError: null }));

      const effectiveCvId = cvId || state.cvId;
      const effectiveJobId = jobId || state.jobId;

      if (!effectiveCvId) {
        setState(prev => ({ ...prev, isATSLoading: false }));
        return null;
      }

      if (!effectiveJobId) {
        // Try to get score from CV metadata
        const response = await fetch(`/api/cvs/${effectiveCvId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.cv?.metadata?.atsScore !== undefined) {
            const score = data.data.cv.metadata.atsScore;
            setState(prev => ({
              ...prev,
              atsScore: score,
              isATSLoading: false,
              cvId: effectiveCvId,
              jobId: effectiveJobId || prev.jobId,
            }));
            return score;
          }
        }
      } else {
        // Fetch from the unified jobs/match API
        const response = await fetch('/api/jobs/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvId: effectiveCvId, jobId: effectiveJobId, userId }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const score = result.data.atsScore || result.data.score;
            const analysis: ATSAnalysis = {
              score,
              missingKeywords: result.data.keywordAnalysis?.gaps?.map((g: any) => g.keyword) || result.data.missingKeywords || [],
              matchedKeywords: result.data.keywordAnalysis?.matchedKeywords || result.data.matchedKeywords || result.data.strengths || [],
              strengths: result.data.keywordAnalysis?.matchedKeywords || result.data.strengths || [],
              suggestions: result.data.suggestions || [],
              extractedKeywords: result.data.keywordAnalysis?.matchedKeywords || [],
              warnings: result.data.warnings || [],
              keywordAnalysis: result.data.keywordAnalysis,
              scoreResult: result.data.scoreResult,
              factorBreakdown: result.data.factorBreakdown || result.data.atsScoreBreakdown,
              knockOutFactors: result.data.knockOutFactors,
              updatedAt: new Date().toISOString(),
            };

            setState(prev => ({
              ...prev,
              atsScore: score,
              atsAnalysis: analysis,
              isATSLoading: false,
              lastUpdated: new Date(),
              cvId: effectiveCvId,
              jobId: effectiveJobId,
            }));
            return score;
          }
        }
      }

      setState(prev => ({ ...prev, isATSLoading: false }));
      return null;
    } catch (error) {
      console.error('❌ ATSContext - Error refreshing ATS score:', error);
      setState(prev => ({
        ...prev,
        isATSLoading: false,
        atsError: error instanceof Error ? error.message : 'Failed to refresh ATS score',
      }));
      return null;
    }
  }, [state.cvId, state.jobId]);

  // Update Surgeon Analysis - saves to database and updates context
  const updateSurgeonAnalysis = useCallback(async (
    analysis: SurgeonAnalysis,
    cvId: string
  ) => {
    try {
      setState(prev => ({ ...prev, isSurgeonLoading: true, surgeonError: null }));

      // Save to database via API
      const response = await fetch(`/api/cvs/${cvId}/surgeon-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '', // Will be extracted from session in API
          score: analysis.score,
          fixes: analysis.fixes,
          annotations: analysis.annotations,
          targetRole: analysis.targetRole,
          seniorityLevel: analysis.seniorityLevel,
          jobData: null, // Can be passed if needed
          scoreReport: analysis.scoreReport,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save surgeon analysis');
      }

      setState(prev => ({
        ...prev,
        surgeonAnalysis: analysis,
        isSurgeonLoading: false,
        lastUpdated: new Date(),
        cvId,
      }));

      console.log('✅ ATSContext - Surgeon analysis updated:', { score: analysis.score, cvId });
    } catch (error) {
      console.error('❌ ATSContext - Error updating surgeon analysis:', error);
      setState(prev => ({
        ...prev,
        isSurgeonLoading: false,
        surgeonError: error instanceof Error ? error.message : 'Failed to update surgeon analysis',
      }));
    }
  }, []);

  // Refresh Surgeon Analysis from database
  const refreshSurgeonAnalysis = useCallback(async (cvId: string) => {
    try {
      setState(prev => ({ ...prev, isSurgeonLoading: true, surgeonError: null }));

      const response = await fetch(`/api/cvs/${cvId}/surgeon-analysis`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const analysis: SurgeonAnalysis = {
            score: result.data.score,
            fixes: result.data.fixes || [],
            annotations: result.data.annotations || [],
            targetRole: result.data.targetRole || '',
            seniorityLevel: result.data.seniorityLevel || '',
            analyzedAt: new Date(result.data.analyzedAt),
            contentHash: result.data.contentHash,
            jobDataHash: result.data.jobDataHash,
            scoreReport: result.data.scoreReport || null,
          };

          setState(prev => ({
            ...prev,
            surgeonAnalysis: analysis,
            isSurgeonLoading: false,
            lastUpdated: new Date(),
            cvId,
          }));
          return;
        }
      }

      setState(prev => ({ ...prev, isSurgeonLoading: false }));
    } catch (error) {
      console.error('❌ ATSContext - Error refreshing surgeon analysis:', error);
      setState(prev => ({
        ...prev,
        isSurgeonLoading: false,
        surgeonError: error instanceof Error ? error.message : 'Failed to refresh surgeon analysis',
      }));
    }
  }, []);

  // Deep Dive methods (merged from ATSDeepDiveContext)
  const activateDeepDive = useCallback(() => {
    setState(prev => ({
      ...prev,
      deepDive: { ...prev.deepDive, isActive: true },
    }));
  }, []);

  const deactivateDeepDive = useCallback(() => {
    setState(prev => ({
      ...prev,
      deepDive: {
        ...prev.deepDive,
        isActive: false,
        activeLayers: new Set(['timeline']),
        selectedFactor: null,
      },
    }));
  }, []);

  const toggleDeepDiveLayer = useCallback((layer: ActiveLayer) => {
    setState(prev => {
      const newLayers = new Set(prev.deepDive.activeLayers);
      if (layer === null) {
        newLayers.clear();
      } else if (newLayers.has(layer)) {
        newLayers.delete(layer);
      } else {
        newLayers.add(layer);
      }
      return {
        ...prev,
        deepDive: { ...prev.deepDive, activeLayers: newLayers },
      };
    });
  }, []);

  const setDeepDiveParser = useCallback((parser: ParserType) => {
    setState(prev => ({
      ...prev,
      deepDive: { ...prev.deepDive, selectedParser: parser },
    }));
  }, []);

  const toggleDeepDiveCriticalOnly = useCallback(() => {
    setState(prev => ({
      ...prev,
      deepDive: { ...prev.deepDive, showCriticalOnly: !prev.deepDive.showCriticalOnly },
    }));
  }, []);

  const selectDeepDiveFactor = useCallback((factor: string | null) => {
    setState(prev => ({
      ...prev,
      deepDive: { ...prev.deepDive, selectedFactor: factor },
    }));
  }, []);

  const isDeepDiveLayerActive = useCallback(
    (layer: ActiveLayer) => {
      return state.deepDive.activeLayers.has(layer);
    },
    [state.deepDive.activeLayers]
  );

  // Refresh all data
  const refreshAll = useCallback(async (cvId: string, journeyId?: string, jobId?: string) => {
    setState(prev => ({
      ...prev,
      cvId,
      journeyId: journeyId || prev.journeyId,
      jobId: jobId || prev.jobId,
    }));

    await Promise.all([
      refreshATSScore(cvId, jobId),
      refreshSurgeonAnalysis(cvId),
    ]);
  }, [refreshATSScore, refreshSurgeonAnalysis]);

  // Reset context
  const reset = useCallback(() => {
    setState({
      atsScore: null,
      atsAnalysis: null,
      isATSLoading: false,
      atsError: null,
      surgeonAnalysis: null,
      isSurgeonLoading: false,
      surgeonError: null,
      deepDive: {
        isActive: false,
        activeLayers: new Set(['timeline']),
        selectedParser: 'generic',
        showCriticalOnly: true,
        selectedFactor: null,
      },
      lastUpdated: null,
      cvId: null,
      journeyId: null,
      jobId: null,
    });
  }, []);

  const value: ATSContextValue = {
    ...state,
    updateATSScore,
    refreshATSScore,
    updateSurgeonAnalysis,
    refreshSurgeonAnalysis,
    activateDeepDive,
    deactivateDeepDive,
    toggleDeepDiveLayer,
    setDeepDiveParser,
    toggleDeepDiveCriticalOnly,
    selectDeepDiveFactor,
    isDeepDiveLayerActive,
    refreshAll,
    reset,
  };

  return <ATSContext.Provider value={value}>{children}</ATSContext.Provider>;
}

export function useATS() {
  const context = useContext(ATSContext);
  if (context === undefined) {
    throw new Error('useATS must be used within an ATSProvider');
  }
  return context;
}

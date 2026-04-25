'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  matchedKeywords?: string[];
  strengths: string[];
  suggestions: string[];
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
  // New: Rich audit report from CV Surgeon
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

  // Metadata
  lastUpdated: Date | null;
  cvId: string | null;
  journeyId: string | null;
  jobId: string | null;
}

interface ATSContextValue extends ATSContextState {
  // ATS Score methods
  updateATSScore: (score: number, analysis: ATSAnalysis, cvId: string, journeyId?: string, jobId?: string) => Promise<void>;
  refreshATSScore: (cvId: string, jobId?: string, userId?: string) => Promise<number | null>;

  // Surgeon Analysis methods
  updateSurgeonAnalysis: (analysis: SurgeonAnalysis, cvId: string) => Promise<void>;
  refreshSurgeonAnalysis: (cvId: string) => Promise<void>;

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
  const refreshATSScore = useCallback(async (cvId: string, jobId?: string, userId?: string) => {
    try {
      setState(prev => ({ ...prev, isATSLoading: true, atsError: null }));

      if (!jobId) {
        // Try to get score from CV metadata
        const response = await fetch(`/api/cvs/${cvId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.cv?.metadata?.atsScore !== undefined) {
            const score = data.data.cv.metadata.atsScore;
            setState(prev => ({
              ...prev,
              atsScore: score,
              isATSLoading: false,
              cvId,
              jobId: jobId || prev.jobId,
            }));
            return score;
          }
        }
      } else {
        // Fetch from ATS API
        const response = await fetch('/api/ats/calculate-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cvId, jobId, userId }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const score = result.data.score || result.data.atsScore;
            const analysis: ATSAnalysis = {
              score,
              missingKeywords: result.data.missingKeywords || [],
              strengths: result.data.strengths || [],
              suggestions: result.data.suggestions || [],
              factorBreakdown: result.data.factorBreakdown || result.data.analysis?.factorBreakdown,
              knockOutFactors: result.data.knockOutFactors || result.data.analysis?.knockOutFactors,
              updatedAt: new Date().toISOString(),
            };

            setState(prev => ({
              ...prev,
              atsScore: score,
              atsAnalysis: analysis,
              isATSLoading: false,
              lastUpdated: new Date(),
              cvId,
              jobId,
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
  }, []);

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


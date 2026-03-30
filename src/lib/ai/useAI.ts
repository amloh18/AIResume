import { useState, useCallback } from 'react';
import { 
  buildAIContext, 
  AIContext, 
  SectionType,
  EnhancedAIEngine,
  ATSKeywordService,
  ResumeScoringService,
  KeywordGapResult,
  ATSAnalysisResult,
  ResumeScoreResult,
  Suggestion
} from '../ai';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface UseAIOptions {
  resumeData: UnifiedCVDataStructure | null;
  targetRole?: string;
  targetCompany?: string;
  targetIndustry?: string;
  jobDescription?: string;
}

interface UseAIReturn {
  isProcessing: boolean;
  error: string | null;
  improveBullet: (bullet: string, section: SectionType) => Promise<string | null>;
  generateAchievements: (role: string, company: string) => Promise<string[] | null>;
  getSuggestions: (text: string, section: SectionType) => Promise<Suggestion[] | null>;
  optimizeForATS: (jobDescription: string) => Promise<UnifiedCVDataStructure | null>;
  detectKeywordGaps: (jobDescription: string) => Promise<KeywordGapResult | null>;
  analyzeATSCompatibility: (jobDescription: string) => Promise<ATSAnalysisResult | null>;
  scoreResume: () => Promise<ResumeScoreResult | null>;
  rewriteResume: (targetRole: string) => Promise<UnifiedCVDataStructure | null>;
  currentContext: AIContext | null;
}

export const useAI = (options: UseAIOptions): UseAIReturn => {
  const { resumeData, targetRole, targetCompany, targetIndustry, jobDescription } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<AIContext | null>(null);

  const getContext = useCallback((section?: SectionType): AIContext => {
    if (!resumeData) {
      throw new Error('Resume data is required');
    }
    
    const context = buildAIContext({
      resumeData,
      section: section || 'basics',
      targetRole,
      targetCompany,
      targetIndustry,
      jobDescription,
    });
    
    setCurrentContext(context);
    return context;
  }, [resumeData, targetRole, targetCompany, targetIndustry, jobDescription]);

  const improveBullet = useCallback(async (bullet: string, section: SectionType): Promise<string | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const context = getContext(section);
      const response = await EnhancedAIEngine.improveBullet(bullet, context);
      
      if (response.success && response.content) {
        return response.content;
      }
      
      setError(response.error || 'Failed to improve bullet');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData, getContext]);

  const generateAchievements = useCallback(async (role: string, company: string): Promise<string[] | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const context = getContext('work');
      const response = await EnhancedAIEngine.generateAchievements(role, company, context);
      
      if (response.success && response.content) {
        return response.content.split('\n').filter(Boolean);
      }
      
      setError(response.error || 'Failed to generate achievements');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData, getContext]);

  const getSuggestions = useCallback(async (text: string, section: SectionType): Promise<Suggestion[] | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const context = getContext(section);
      const suggestions = await EnhancedAIEngine.suggestImprovements(text, context);
      
      return suggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData, getContext]);

  const optimizeForATS = useCallback(async (jobDesc: string): Promise<UnifiedCVDataStructure | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const context = getContext('basics');
      const response = await EnhancedAIEngine.optimizeForATS(resumeData, jobDesc, context);
      
      if (response.success && response.content) {
        try {
          return JSON.parse(response.content);
        } catch {
          setError('Failed to parse optimized resume');
          return null;
        }
      }
      
      setError(response.error || 'Failed to optimize for ATS');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData, getContext]);

  const detectKeywordGaps = useCallback(async (jobDesc: string): Promise<KeywordGapResult | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await ATSKeywordService.detectKeywordGaps(resumeData, jobDesc);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData]);

  const analyzeATSCompatibility = useCallback(async (jobDesc: string): Promise<ATSAnalysisResult | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await ATSKeywordService.analyzeATSCompatibility(resumeData, jobDesc);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData]);

  const scoreResume = useCallback(async (): Promise<ResumeScoreResult | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await ResumeScoringService.scoreResume(resumeData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData]);

  const rewriteResume = useCallback(async (role: string): Promise<UnifiedCVDataStructure | null> => {
    if (!resumeData) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await EnhancedAIEngine.rewriteResume(resumeData, role);
      
      if (response.success && response.content) {
        try {
          return JSON.parse(response.content);
        } catch {
          setError('Failed to parse rewritten resume');
          return null;
        }
      }
      
      setError(response.error || 'Failed to rewrite resume');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [resumeData]);

  return {
    isProcessing,
    error,
    improveBullet,
    generateAchievements,
    getSuggestions,
    optimizeForATS,
    detectKeywordGaps,
    analyzeATSCompatibility,
    scoreResume,
    rewriteResume,
    currentContext,
  };
};

export default useAI;
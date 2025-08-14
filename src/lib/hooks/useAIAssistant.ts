import { useCallback, useEffect, useRef } from 'react';
import { useAIStore } from '@/lib/stores/aiStore';
import { useCVStore } from '@/lib/stores/cvStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { debounce } from 'lodash';

export const useAIAssistant = (cvId: string | null, documentType: 'cv' | 'cover-letter' = 'cv') => {
  const {
    ats,
    sections,
    generatingInitial,
    outOfDate,
    hasRealDataBySection,
    loadingBySection,
    setATSUpdating,
    setATSScore,
    setSectionLoading,
    setSectionSuggestions,
    setSectionError,
    setGeneratingInitial,
    markSectionOutOfDate,
    markAllJobBasedSectionsOutOfDate,
    setHasRealData,
    setLoadingBySection
  } = useAIStore();

  const { cvData } = useCVStore();
  const { currentJob } = useJobStore();
  
  const debouncedATSCalculation = useRef(
    debounce(async (cvData: any, jobData: any) => {
      if (!cvId) return;
      
      try {
        setATSUpdating(true);
        const analysis = await AIAssistantService.calculateATSScore(cvData, jobData);
        const isBaseline = !jobData;
        setATSScore(analysis.score, analysis, isBaseline);
      } catch (error) {
        console.error('ATS calculation error:', error);
        setSectionError('ats-score', error instanceof Error ? error.message : 'Failed to calculate ATS score');
      }
    }, 1500)
  ).current;

  // Calculate ATS score whenever CV data or job changes
  useEffect(() => {
    if (cvData && cvId) {
      debouncedATSCalculation(cvData, currentJob);
    }
  }, [cvData, currentJob, cvId, debouncedATSCalculation]);

  // Mark job-based sections as out of date when CV data changes
  useEffect(() => {
    if (cvData && currentJob) {
      markAllJobBasedSectionsOutOfDate();
    }
  }, [cvData, currentJob, markAllJobBasedSectionsOutOfDate]);

  // Generate initial suggestions when job is selected
  const generateInitialSuggestions = useCallback(async () => {
    if (!cvId || !currentJob || !cvData) return;

    setGeneratingInitial(true);

    const jobDependentSections = [
      'content-optimizer',
      'quantification',
      'skills-mapper',
      'gap-analyzer',
      'achievement-generator',
      'summary-builder',
      ...(documentType === 'cover-letter' ? ['cover-letter-draft'] : [])
    ];

    try {
      // Generate suggestions in parallel with concurrency limit
      const promises = jobDependentSections.map(async (sectionId) => {
        setSectionLoading(sectionId, true);
        setLoadingBySection(sectionId, true);
        
        try {
          let suggestions;
          switch (sectionId) {
            case 'content-optimizer':
              suggestions = await AIAssistantService.optimizeContent(cvData, currentJob);
              break;
            case 'quantification':
              suggestions = await AIAssistantService.quantifyAchievements(cvData, currentJob);
              break;
            case 'skills-mapper':
              suggestions = await AIAssistantService.mapSkillsAndKeywords(cvData, currentJob);
              break;
            case 'gap-analyzer':
              suggestions = await AIAssistantService.analyzeGaps(cvData, currentJob);
              break;
            case 'achievement-generator':
              suggestions = await AIAssistantService.generateAchievements(cvData, currentJob);
              break;
            case 'summary-builder':
              suggestions = await AIAssistantService.buildTailoredSummary(cvData, currentJob);
              break;
            case 'cover-letter-draft':
              suggestions = await AIAssistantService.draftCoverLetter(cvData, currentJob);
              break;
            default:
              return;
          }
          
          setSectionSuggestions(sectionId, suggestions);
          setHasRealData(sectionId, true);
          markSectionOutOfDate(sectionId, false);
        } catch (error) {
          console.error(`Error generating suggestions for ${sectionId}:`, error);
          setSectionError(sectionId, error instanceof Error ? error.message : 'Failed to generate suggestions');
        } finally {
          setLoadingBySection(sectionId, false);
        }
      });

      // Execute with concurrency limit of 3
      const concurrencyLimit = 3;
      for (let i = 0; i < promises.length; i += concurrencyLimit) {
        const batch = promises.slice(i, i + concurrencyLimit);
        await Promise.all(batch);
      }

    } catch (error) {
      console.error('Error generating initial suggestions:', error);
    } finally {
      setGeneratingInitial(false);
    }
  }, [cvId, currentJob, cvData, setGeneratingInitial, setSectionLoading, setSectionSuggestions, setSectionError, markSectionOutOfDate]);

  // Generate suggestions for a specific section
  const generateSectionSuggestions = useCallback(async (sectionId: string) => {
    if (!cvId || !cvData) return;

    setSectionLoading(sectionId, true);
    setLoadingBySection(sectionId, true);

    try {
      let suggestions;
      switch (sectionId) {
        case 'content-optimizer':
          suggestions = await AIAssistantService.optimizeContent(cvData, currentJob);
          break;
        case 'quantification':
          suggestions = await AIAssistantService.quantifyAchievements(cvData, currentJob);
          break;
        case 'skills-mapper':
          suggestions = await AIAssistantService.mapSkillsAndKeywords(cvData, currentJob);
          break;
        case 'gap-analyzer':
          suggestions = await AIAssistantService.analyzeGaps(cvData, currentJob);
          break;
        case 'achievement-generator':
          suggestions = await AIAssistantService.generateAchievements(cvData, currentJob);
          break;
        case 'summary-builder':
          suggestions = await AIAssistantService.buildTailoredSummary(cvData, currentJob);
          break;
        case 'consistency-checker':
          suggestions = await AIAssistantService.checkConsistency(cvData);
          break;
        case 'cover-letter-draft':
          suggestions = await AIAssistantService.draftCoverLetter(cvData, currentJob);
          break;
        default:
          throw new Error(`Unknown section: ${sectionId}`);
      }

      setSectionSuggestions(sectionId, suggestions);
      setHasRealData(sectionId, true);
      markSectionOutOfDate(sectionId, false);
    } catch (error) {
      console.error(`Error generating suggestions for ${sectionId}:`, error);
      setSectionError(sectionId, error instanceof Error ? error.message : 'Failed to generate suggestions');
    } finally {
      setLoadingBySection(sectionId, false);
    }
  }, [cvId, cvData, currentJob, setSectionLoading, setSectionSuggestions, setSectionError, markSectionOutOfDate, setHasRealData, setLoadingBySection]);

  // Refresh all job-based suggestions
  const refreshAllJobBasedSuggestions = useCallback(async () => {
    if (!cvId || !currentJob || !cvData) return;

    const jobDependentSections = [
      'content-optimizer',
      'quantification',
      'skills-mapper',
      'gap-analyzer',
      'achievement-generator',
      'summary-builder',
      ...(documentType === 'cover-letter' ? ['cover-letter-draft'] : [])
    ];

    const promises = jobDependentSections.map(sectionId => generateSectionSuggestions(sectionId));
    await Promise.all(promises);
  }, [cvId, currentJob, cvData, generateSectionSuggestions]);

  return {
    // State
    ats,
    sections,
    generatingInitial,
    outOfDate,
    hasRealDataBySection,
    loadingBySection,
    
    // Actions
    generateInitialSuggestions,
    generateSectionSuggestions,
    refreshAllJobBasedSuggestions,
    
    // Utilities
    isJobDependentSection: (sectionId: string) => [
      'content-optimizer',
      'quantification',
      'skills-mapper',
      'gap-analyzer',
      'achievement-generator',
      'summary-builder',
      'cover-letter-draft'
    ].includes(sectionId)
  };
};

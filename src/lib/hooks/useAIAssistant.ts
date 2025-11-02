import { useCallback, useEffect, useRef } from 'react';
import { useAIStore } from '@/lib/stores/aiStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { debounce } from 'lodash';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export const useAIAssistant = (
  cvId: string | null, 
  cvData: UnifiedCVDataStructure | null,
  documentType: 'cv' | 'cover-letter' = 'cv'
) => {
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

  const { currentJob } = useJobStore();
  
  const debouncedATSCalculation = useRef(
    debounce(async (cvData: UnifiedCVDataStructure | null, jobData: any) => {
      if (!cvId || !cvData) {
        console.log('❌ ATS calculation skipped - missing data:', { hasCvId: !!cvId, hasCvData: !!cvData });
        return;
      }
      
      // Check if CV data has meaningful content
      const hasContent = cvData.personalInfo?.name || 
                        cvData.experience?.length > 0 || 
                        cvData.education?.length > 0 || 
                        cvData.skills?.length > 0;
      
      if (!hasContent) {
        console.log('❌ ATS calculation skipped - CV data is empty:', { cvId });
        return;
      }
      
      console.log('🎯 ATS calculation triggered:', {
        hasJobData: !!jobData,
        jobTitle: jobData?.title || jobData?.jobTitle,
        cvId
      });
      
      try {
        setATSUpdating(true);
        const analysis = await AIAssistantService.calculateATSScore(cvData, jobData);
        const isBaseline = !jobData;
        
        console.log('📊 ATS calculation result:', {
          score: analysis.score,
          missingKeywords: analysis.missingKeywords?.length || 0,
          strengths: analysis.strengths?.length || 0,
          isBaseline
        });
        
        setATSScore(analysis.score, analysis, isBaseline);
      } catch (error) {
        console.error('ATS calculation error:', error);
        setSectionError('ats-score', error instanceof Error ? error.message : 'Failed to calculate ATS score');
      }
    }, 1500)
  ).current;

  // Generate initial suggestions when job is selected
  const generateInitialSuggestions = useCallback(async () => {
    if (!cvId || !currentJob || !cvData) {
      console.log('❌ useAIAssistant - Missing required data:', {
        hasCvId: !!cvId,
        hasCurrentJob: !!currentJob,
        hasCvData: !!cvData,
        currentJobData: currentJob
      });
      return;
    }

    console.log('🚀 useAIAssistant - Starting generation with job:', {
      jobId: currentJob.id,
      jobTitle: currentJob.title || currentJob.jobTitle,
      company: currentJob.company
    });

    setGeneratingInitial(true);

    try {
      // Perform comprehensive analysis first
      console.log('🔍 useAIAssistant - Starting comprehensive analysis...');
      const comprehensiveAnalysis = await AIAssistantService.performComprehensiveAnalysis(cvData, currentJob);
      
      // Process comprehensive analysis results and update sections
      if (comprehensiveAnalysis) {
        // Update ATS score
        if (comprehensiveAnalysis.ATSScoreAndKeywords) {
          console.log('🎯 Setting ATS score from comprehensive analysis:', {
            score: comprehensiveAnalysis.ATSScoreAndKeywords.score,
            missingKeywords: comprehensiveAnalysis.ATSScoreAndKeywords.missingKeywords?.length || 0,
            matchedKeywords: comprehensiveAnalysis.ATSScoreAndKeywords.matchedKeywords?.length || 0
          });
          
          setATSScore(
            comprehensiveAnalysis.ATSScoreAndKeywords.score,
            {
              score: comprehensiveAnalysis.ATSScoreAndKeywords.score,
              missingKeywords: comprehensiveAnalysis.ATSScoreAndKeywords.missingKeywords,
              strengths: comprehensiveAnalysis.ATSScoreAndKeywords.matchedKeywords,
              suggestions: []
            },
            false
          );
        } else {
          console.log('⚠️ No ATS score data in comprehensive analysis');
        }

        // Update sections with comprehensive analysis data
        const sectionsToUpdate = [
          { id: 'content-optimizer', data: comprehensiveAnalysis.ContentOptimizer },
          { id: 'quantification', data: comprehensiveAnalysis.QuantificationAssistant },
          { id: 'skills-mapper', data: comprehensiveAnalysis.SkillsAndKeywordsMapper },
          { id: 'gap-analyzer', data: comprehensiveAnalysis.GapAnalyzer },
          { id: 'achievement-generator', data: comprehensiveAnalysis.AchievementGenerator },
          { id: 'consistency-checker', data: comprehensiveAnalysis.ConsistencyAndCompliance },
          { id: 'summary-builder', data: comprehensiveAnalysis.TailoredSummaryBuilder }
        ];

        sectionsToUpdate.forEach(({ id, data }) => {
          if (data) {
            const suggestions = convertAnalysisToSuggestions(id, data);
            setSectionSuggestions(id, suggestions);
            // Only mark as having real data if there are actual suggestions
            if (suggestions && suggestions.length > 0) {
              setHasRealData(id, true);
              markSectionOutOfDate(id, false);
            } else {
              setHasRealData(id, false);
            }
          } else {
            // No data means no real suggestions
            setHasRealData(id, false);
          }
        });
      }

    } catch (error) {
      console.error('Error generating initial suggestions:', error);
    } finally {
      setGeneratingInitial(false);
    }
  }, [cvId, currentJob, cvData, setGeneratingInitial, setSectionSuggestions, setSectionError, markSectionOutOfDate, setATSScore, setHasRealData]);

  // Generate baseline suggestions without job context
  const generateBaselineSuggestions = useCallback(async () => {
    if (!cvData) return;

    try {
      console.log('🔧 useAIAssistant - Generating baseline suggestions...');
      
      const [contentOptimizer, quantification, skillsMapper, gapAnalyzer, achievementGenerator] = await Promise.all([
        AIAssistantService.optimizeContent(cvData, null),
        AIAssistantService.quantifyAchievements(cvData, null),
        AIAssistantService.mapSkillsAndKeywords(cvData, null),
        AIAssistantService.analyzeGaps(cvData, null),
        AIAssistantService.generateAchievements(cvData, null)
      ]);

      // Update sections with baseline suggestions
      const sectionsToUpdate = [
        { id: 'content-optimizer', suggestions: contentOptimizer },
        { id: 'quantification', suggestions: quantification },
        { id: 'skills-mapper', suggestions: skillsMapper },
        { id: 'gap-analyzer', suggestions: gapAnalyzer },
        { id: 'achievement-generator', suggestions: achievementGenerator }
      ];

      sectionsToUpdate.forEach(({ id, suggestions }) => {
        if (suggestions && suggestions.length > 0) {
          setSectionSuggestions(id, suggestions);
          setHasRealData(id, true);
          markSectionOutOfDate(id, false);
        } else {
          // No suggestions means no real data
          setHasRealData(id, false);
        }
      });

      console.log('✅ useAIAssistant - Baseline suggestions generated');
    } catch (error) {
      console.error('❌ useAIAssistant - Error generating baseline suggestions:', error);
    }
  }, [cvData, setSectionSuggestions, setHasRealData, markSectionOutOfDate]);

  // Calculate ATS score whenever CV data or job changes
  useEffect(() => {
    if (cvData && cvId) {
      debouncedATSCalculation(cvData, currentJob);
    }
  }, [cvData, currentJob, cvId, debouncedATSCalculation]);

  // Initialize sections when AI Assistant loads
  useEffect(() => {
    if (cvData && cvId) {
      console.log('🔧 useAIAssistant - Initializing sections for CV:', cvId);
      
      // Generate baseline suggestions without job context
      if (!currentJob) {
        console.log('📊 useAIAssistant - Generating baseline suggestions without job context');
        generateBaselineSuggestions();
      }
    }
  }, [cvData, cvId, currentJob, generateBaselineSuggestions]);

  // Auto-trigger AI analysis when job is selected or CV data changes
  useEffect(() => {
    console.log('🔍 useAIAssistant - Job/CV change detected:', {
      hasCvData: !!cvData,
      hasCurrentJob: !!currentJob,
      hasCvId: !!cvId,
      currentJobId: currentJob?.id,
      cvId
    });

    if (cvData && currentJob && cvId) {
      console.log('🚀 useAIAssistant - Starting auto-generation for job:', currentJob.jobTitle);
      
      // Mark sections as out of date first
      markAllJobBasedSectionsOutOfDate();
      
      // Automatically generate initial suggestions after a short delay
      const timer = setTimeout(() => {
        console.log('⚡ useAIAssistant - Executing generateInitialSuggestions');
        generateInitialSuggestions();
      }, 1000); // 1 second delay to avoid too many API calls
      
      return () => clearTimeout(timer);
    }
  }, [cvData, currentJob, cvId, markAllJobBasedSectionsOutOfDate, generateInitialSuggestions]);

  // Helper function to convert analysis data to suggestions format
  const convertAnalysisToSuggestions = (sectionId: string, data: any): AISuggestion[] => {
    const suggestions: AISuggestion[] = [];
    
    switch (sectionId) {
      case 'content-optimizer':
        if (data.improvements) {
          data.improvements.forEach((improvement: string, index: number) => {
            suggestions.push({
              id: `content-${index}`,
              title: 'Content Improvement',
              content: improvement,
              type: 'improvement',
              section: 'content',
              field: 'general',
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          });
        }
        break;
      case 'quantification':
        if (data.recommendations) {
          data.recommendations.forEach((rec: string, index: number) => {
            suggestions.push({
              id: `quantify-${index}`,
              title: 'Quantification Recommendation',
              content: rec,
              type: 'improvement',
              section: 'achievements',
              field: 'quantification',
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          });
        }
        break;
      case 'skills-mapper':
        if (data.gaps) {
          suggestions.push({
            id: 'skills-gaps',
            title: 'Missing Skills',
            content: `Skills to add: ${data.gaps.join(', ')}`,
            type: 'improvement',
            section: 'skills',
            field: 'keywords',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
        break;
      case 'gap-analyzer':
        if (data.skillGaps) {
          suggestions.push({
            id: 'skill-gaps',
            title: 'Skill Gaps',
            content: `Areas to develop: ${data.skillGaps.join(', ')}`,
            type: 'improvement',
            section: 'skills',
            field: 'development',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
        break;
      case 'achievement-generator':
        if (data.enhancedAchievements) {
          data.enhancedAchievements.forEach((achievement: string, index: number) => {
            suggestions.push({
              id: `achievement-${index}`,
              title: 'Enhanced Achievement',
              content: achievement,
              type: 'improvement',
              section: 'work',
              field: 'achievements',
              generatedAt: new Date().toISOString(),
              isOutOfDate: false
            });
          });
        }
        break;
      case 'summary-builder':
        if (data.optimizedSummary) {
          suggestions.push({
            id: 'summary-optimized',
            title: 'Optimized Summary',
            content: data.optimizedSummary,
            type: 'improvement',
            section: 'summary',
            field: 'summary',
            generatedAt: new Date().toISOString(),
            isOutOfDate: false
          });
        }
        break;
    }
    
    return suggestions;
  };

  // Generate suggestions for a specific section
  const generateSectionSuggestions = useCallback(async (sectionId: string) => {
    if (!cvId || !cvData) return;

    setSectionLoading(sectionId, true);
    setLoadingBySection(sectionId, true);

    try {
      let suggestions;
      switch (sectionId) {
        case 'ats-score':
          // ATS score is calculated separately, not through suggestions
          console.log('🎯 ATS score section - triggering ATS calculation');
          await debouncedATSCalculation(cvData, currentJob);
          suggestions = []; // ATS doesn't generate suggestions
          break;
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

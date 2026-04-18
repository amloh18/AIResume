'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useUserData, getUserDisplayName } from '@/lib/hooks/useUserData';
import CareerTrajectoryGraph from '@/components/career-report/CareerTrajectoryGraph';
import CVHealthScore from '@/components/career-report/widgets/CVHealthScore';
import ATSCompatibilityMeter from '@/components/career-report/widgets/ATSCompatibilityMeter';
import TopActionsPanel from '@/components/career-report/widgets/TopActionsPanel';
import SkillsRadarChart from '@/components/career-report/widgets/SkillsRadarChart';
import KeywordMatchHeatmap from '@/components/career-report/widgets/KeywordMatchHeatmap';
import ImpactDensityChart from '@/components/career-report/widgets/ImpactDensityChart';
import ImpactScoreAnalysisCard from '@/components/career-report/widgets/ImpactScoreAnalysisCard';
import SkillsGapAnalysisCard from '@/components/career-report/widgets/SkillsGapAnalysisCard';
import StrategicRecommendationsCard from '@/components/career-report/widgets/StrategicRecommendationsCard';
import { personalizeCareerAnalysis } from '@/lib/utils/career-report-transform';
import { Skeleton } from '@/components/ui/SkeletonLoader';

export interface CareerAnalysis {
  experienceLevel: {
    level: string;
    rationale: string;
  };
  careerPath: {
    step1: { title: string; reasoning: string };
    step2: { title: string; reasoning: string };
    step3: { title: string; reasoning: string };
  };
  strategicSuggestions: {
    hardSkill?: { skill: string; rationale: string } | string;
    softSkill?: { skill: string; rationale: string } | string;
    experienceReframe?: { original: string; improved: string; rationale: string };
    improvedExperience?: string;
  };
  impactScore?: {
    quantifiableStatements: number;
    highImpactVerbs: number;
    industryKeywords: number;
  };
  careerCoherence?: {
    score: number;
    strengths: string[];
    redFlags: string[];
  };
  cvOptimization?: {
    totalLength: string;
    bulletPointLength: string;
    educationPlacement: string;
  };
  skillsGap?: {
    skills: Array<{
      name: string;
      mentions: number;
      quantifiedUse: number;
      gapInsight: string;
    }>;
    focusDistribution: Array<{
      area: string;
      percentage: number;
    }>;
  };
  seniorTranslation?: Array<{
    current: string;
    improved: string;
    shift: string;
  }>;
  industrySpecialization?: {
    specialization: string;
    keywords: string[];
    contactIssues: string[];
  };
}

interface CVDocument {
  id: string;
  title: string;
  cvData?: any;
  metadata?: {
    isMaster?: boolean;
    aiAnalysis?: CareerAnalysis;
  };
  isMaster?: boolean;
}

interface FullCareerReportProps {
  cvId: string;
  cvData?: any;
  userId: string;
  selectedCV: CVDocument | null;
  allCVs?: CVDocument[];
  onEditCV?: () => void;
  onClose?: () => void;
  onCVSelect?: (cv: CVDocument) => void;
  compact?: boolean; // For sidebar vs full page
}

const FullCareerReport: React.FC<FullCareerReportProps> = ({
  cvId,
  cvData,
  userId,
  selectedCV,
  allCVs = [],
  onEditCV,
  onClose,
  onCVSelect,
  compact = false
}) => {
  const { userData } = useUserData();
  const [careerAnalysis, setCareerAnalysis] = useState<CareerAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const lastLoadedCVIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'recommendations' | 'trajectory'>('overview');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Cache for analysis data per CV
  const analysisCacheRef = useRef<Map<string, CareerAnalysis>>(new Map());

  // Load analysis for a specific CV - fetch from database if needed
  const loadAnalysisForCV = useCallback(async (cv: CVDocument) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check in-memory cache first
      const cachedAnalysis = analysisCacheRef.current.get(cv.id);
      if (cachedAnalysis) {
        console.log('✅ FullCareerReport - Using in-memory cache');
        setCareerAnalysis(cachedAnalysis);
        setLoading(false);
        return;
      }
      
      // Check if CV has cached analysis in metadata
      let cvWithMetadata = cv;
      if (cv.metadata?.aiAnalysis) {
        console.log('✅ FullCareerReport - Using cached AI analysis from CV metadata');
        // Personalize the analysis for viewing (convert to "you" with name)
        const userName = getUserDisplayName(userData);
        const personalizedAnalysis = personalizeCareerAnalysis(cv.metadata.aiAnalysis, userName);
        
        // Cache it
        analysisCacheRef.current.set(cv.id, personalizedAnalysis);
        
        setCareerAnalysis(personalizedAnalysis);
        setLoading(false);
        return;
      }
      
      // If no cached analysis in CV object, fetch full CV from database
      console.log('🔍 FullCareerReport - Fetching CV from database to check for cached analysis');
      try {
        const cvResponse = await fetch(`/api/cvs/${cv.id}`);
        const cvResult = await cvResponse.json();
        
        if (cvResult.success && cvResult.data?.cv) {
          cvWithMetadata = {
            ...cv,
            ...cvResult.data.cv,
            metadata: {
              ...cv.metadata,
              ...cvResult.data.cv.metadata
            }
          };
          
          // Check if fetched CV has cached analysis
          if (cvWithMetadata.metadata?.aiAnalysis) {
            console.log('✅ FullCareerReport - Found cached AI analysis in database');
            // Personalize the analysis for viewing
            const userName = getUserDisplayName(userData);
            const personalizedAnalysis = personalizeCareerAnalysis(cvWithMetadata.metadata.aiAnalysis, userName);
            
            // Cache it
            analysisCacheRef.current.set(cv.id, personalizedAnalysis);
            
            setCareerAnalysis(personalizedAnalysis);
            setLoading(false);
            return;
          }
        }
      } catch (fetchError) {
        console.warn('⚠️ FullCareerReport - Failed to fetch CV from database:', fetchError);
        // Continue to show empty state
      }
      
      // If no cached analysis found, show message to regenerate
      console.log('ℹ️ FullCareerReport - No cached analysis found, showing regenerate option');
      setCareerAnalysis(null);
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('❌ FullCareerReport - Error loading analysis:', error);
      setError('Failed to load analysis');
      setLoading(false);
    }
  }, [userData]);

  // Load analysis when CV changes
  useEffect(() => {
    if (selectedCV) {
      const currentCVId = selectedCV.id;
      // Only reload if CV actually changed
      if (lastLoadedCVIdRef.current !== currentCVId) {
        lastLoadedCVIdRef.current = currentCVId;
        loadAnalysisForCV(selectedCV);
      }
    }
  }, [selectedCV?.id, loadAnalysisForCV]);

  // Calculate overall health score - memoized
  const calculateHealthScore = useMemo((): number => {
    if (!careerAnalysis) return 0;
    
    const impactScore = careerAnalysis.impactScore ? (
      ((careerAnalysis.impactScore.quantifiableStatements || 0) / 15) * 30 +
      ((careerAnalysis.impactScore.highImpactVerbs || 0) / 30) * 40 +
      ((careerAnalysis.impactScore.industryKeywords || 0) / 100) * 30
    ) : 0;
    
    const coherenceScore = careerAnalysis.careerCoherence?.score || 0;
    
    // Weighted average: 60% impact, 40% coherence
    return Math.round(impactScore * 0.6 + coherenceScore * 0.4);
  }, [careerAnalysis]);

  const handleRegenerateAnalysis = async () => {
    if (!selectedCV) {
      setError('No CV selected for analysis');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Fetch CV data if not available
      let cvDataToUse = selectedCV.cvData || cvData;
      if (!cvDataToUse) {
        const cvResponse = await fetch(`/api/cvs/${selectedCV.id}`);
        const cvResult = await cvResponse.json();
        if (cvResult.success && cvResult.data?.cv) {
          cvDataToUse = cvResult.data.cv.cvData;
        } else {
          setError('Failed to load CV data');
          setIsGenerating(false);
          return;
        }
      }
      
      const analysisResponse = await fetch('/api/ai/career-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cvData: cvDataToUse,
          jobData: null,
          jobId: null,
          userId
        })
      });
      
      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json();
          if (analysisResult.success) {
          // Personalize the analysis for viewing
          const userName = getUserDisplayName(userData);
          const personalizedAnalysis = personalizeCareerAnalysis(analysisResult.analysis, userName);
          
          // Cache it
          if (selectedCV) {
            analysisCacheRef.current.set(selectedCV.id, personalizedAnalysis);
          }
          
          setCareerAnalysis(personalizedAnalysis);
          
          // Update CV with new analysis (store in original third-person format)
          try {
            await fetch(`/api/cvs/${selectedCV.id}/metadata`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                aiAnalysis: analysisResult.analysis, // Store original third-person format
                lastModified: new Date().toISOString()
              })
            });
            console.log('✅ FullCareerReport - Analysis cached successfully');
          } catch (updateError) {
            console.warn('⚠️ Failed to update CV with analysis:', updateError);
          }
        } else {
          setError(analysisResult.message || 'Failed to generate analysis');
        }
      } else {
        const errorData = await analysisResponse.json();
        setError(errorData.message || 'Failed to generate analysis');
      }
    } catch (error) {
      console.error('❌ Error regenerating analysis:', error);
      setError('Failed to regenerate analysis');
    } finally {
      setIsGenerating(false);
    }
  };

  // Skeleton loader for report cards
  const ReportCardSkeleton = () => (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6 animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="rounded" height={24} width="40%" />
          <Skeleton variant="circular" width={48} height={48} />
        </div>
        <Skeleton variant="rounded" height={120} width="100%" />
        <div className="space-y-2">
          <Skeleton variant="text" height={16} width="100%" />
          <Skeleton variant="text" height={16} width="80%" />
          <Skeleton variant="text" height={16} width="60%" />
        </div>
      </div>
    </div>
  );

  // Error state
  if (error && !careerAnalysis) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Error Loading Report</h2>
        <p className="text-gray-600 dark:text-gray-400 text-center">{error}</p>
        <button
          onClick={handleRegenerateAnalysis}
          disabled={isGenerating}
          className="px-4 py-2 bg-lime-500 text-white rounded-lg font-semibold hover:bg-lime-600 transition-colors disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Regenerate Analysis'}
        </button>
      </div>
    );
  }

  // No analysis state
  if (!careerAnalysis && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">No Career Analysis Found</h2>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          Click "Regenerate Analysis" to generate your AI-powered career report
        </p>
        <button
          onClick={handleRegenerateAnalysis}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-md font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Regenerate Analysis'}
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={compact ? 'space-y-4' : 'space-y-6'}>
        <div className={compact ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'}>
          <ReportCardSkeleton />
          <ReportCardSkeleton />
          {!compact && (
            <>
              <ReportCardSkeleton />
              <ReportCardSkeleton />
            </>
          )}
        </div>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isSectionCollapsed = (sectionId: string) => collapsedSections.has(sectionId);

  // Main content
  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {careerAnalysis && (
        <>
          {/* Tabbed Interface - Only show if not compact */}
          {!compact && (
            <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 mb-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'analysis', label: 'Analysis' },
                { id: 'recommendations', label: 'Recommendations' },
                { id: 'trajectory', label: 'Trajectory' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#80FF00] text-[#80FF00]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Overview Tab */}
          {(activeTab === 'overview' || compact) && (
            <div className={compact ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'}>
            {/* Column 1 */}
            <div className="flex flex-col gap-4 md:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0 }}
              >
                <CVHealthScore
                  score={calculateHealthScore}
                  experienceLevel={careerAnalysis.experienceLevel}
                  impactScore={careerAnalysis.impactScore}
                  careerCoherence={careerAnalysis.careerCoherence}
                  cvOptimization={careerAnalysis.cvOptimization}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <TopActionsPanel
                  impactScore={careerAnalysis.impactScore}
                  strategicSuggestions={careerAnalysis.strategicSuggestions}
                  cvOptimization={careerAnalysis.cvOptimization}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <SkillsRadarChart
                  skillsGap={careerAnalysis.skillsGap}
                  impactScore={careerAnalysis.impactScore}
                />
              </motion.div>

              {!compact && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <SkillsGapAnalysisCard careerAnalysis={careerAnalysis} />
                </motion.div>
              )}
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-4 md:gap-6">
              {/* Only show ATS Compatibility Meter if CV is not a Master CV */}
              {!(selectedCV?.metadata?.isMaster || selectedCV?.isMaster) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <ATSCompatibilityMeter
                    cvData={selectedCV?.cvData || cvData}
                    impactScore={careerAnalysis.impactScore}
                    cvOptimization={careerAnalysis.cvOptimization}
                    industrySpecialization={careerAnalysis.industrySpecialization}
                  />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <KeywordMatchHeatmap
                  industrySpecialization={careerAnalysis.industrySpecialization}
                  impactScore={careerAnalysis.impactScore}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <ImpactDensityChart
                  impactScore={careerAnalysis.impactScore}
                  skillsGap={careerAnalysis.skillsGap}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <ImpactScoreAnalysisCard careerAnalysis={careerAnalysis} />
              </motion.div>

              {!compact && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  <StrategicRecommendationsCard careerAnalysis={careerAnalysis} />
                </motion.div>
              )}
            </div>
          </div>
          )}

          {/* Analysis Tab */}
          {!compact && activeTab === 'analysis' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {!(selectedCV?.metadata?.isMaster || selectedCV?.isMaster) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <ATSCompatibilityMeter
                    cvData={selectedCV?.cvData || cvData}
                    impactScore={careerAnalysis.impactScore}
                    cvOptimization={careerAnalysis.cvOptimization}
                    industrySpecialization={careerAnalysis.industrySpecialization}
                  />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <KeywordMatchHeatmap
                  industrySpecialization={careerAnalysis.industrySpecialization}
                  impactScore={careerAnalysis.impactScore}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <ImpactDensityChart
                  impactScore={careerAnalysis.impactScore}
                  skillsGap={careerAnalysis.skillsGap}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <ImpactScoreAnalysisCard careerAnalysis={careerAnalysis} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <SkillsRadarChart
                  skillsGap={careerAnalysis.skillsGap}
                  impactScore={careerAnalysis.impactScore}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <SkillsGapAnalysisCard careerAnalysis={careerAnalysis} />
              </motion.div>
            </div>
          )}

          {/* Recommendations Tab */}
          {!compact && activeTab === 'recommendations' && (
            <div className="space-y-4 md:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <StrategicRecommendationsCard careerAnalysis={careerAnalysis} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <TopActionsPanel
                  impactScore={careerAnalysis.impactScore}
                  strategicSuggestions={careerAnalysis.strategicSuggestions}
                  cvOptimization={careerAnalysis.cvOptimization}
                />
              </motion.div>
            </div>
          )}

          {/* Trajectory Tab */}
          {!compact && activeTab === 'trajectory' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="w-full"
            >
              <CareerTrajectoryGraph
                careerPath={careerAnalysis.careerPath}
                careerCoherence={careerAnalysis.careerCoherence}
                experienceLevel={careerAnalysis.experienceLevel?.level}
              />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(FullCareerReport);


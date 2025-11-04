'use client';

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  BookOpen, 
  ArrowRight,
  RefreshCw,
  BarChart3,
  Lightbulb,
  CheckCircle,
  Eye,
  AlertCircle,
  AlertTriangle,
  X,
  Menu,
  ChevronDown
} from 'lucide-react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useRouter } from 'next/navigation';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import PageHeader from '@/components/dashboard/PageHeader';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
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

interface CareerAnalysis {
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
  // Additional analysis sections
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

const CareerReportPage: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { userData, loading: userLoading } = useUserData();
  const { toggleSidebar, isOpen } = useMobileSidebar();
  const router = useRouter();
  const [careerAnalysis, setCareerAnalysis] = useState<CareerAnalysis | null>(null);
  const [selectedCV, setSelectedCV] = useState<CVDocument | null>(null);
  const [allCVs, setAllCVs] = useState<CVDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Loading Career Report...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCVDropdown, setShowCVDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load analysis for a specific CV
  const loadAnalysisForCV = useCallback(async (cv: CVDocument) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingMessage('Loading analysis...');
      
      // Check if CV has cached analysis
      if (cv.metadata?.aiAnalysis) {
        console.log('✅ Career Report - Using cached AI analysis');
        setCareerAnalysis(cv.metadata.aiAnalysis);
        setLoading(false);
        return;
      }
      
      // Generate new analysis if CV data is available
      if (cv.cvData) {
        setLoadingMessage('Generating AI analysis...');
        const analysisResponse = await fetch('/api/ai/career-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            cvData: cv.cvData,
            jobData: null,
            jobId: null
          })
        });
        
        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          if (analysisResult.success) {
            console.log('✅ Career Report - Generated AI analysis successfully');
            setCareerAnalysis(analysisResult.analysis);
            
            // Cache the analysis in the CV metadata
            try {
              await fetch(`/api/cvs/${cv.id}/metadata`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user?.id,
                  aiAnalysis: analysisResult.analysis,
                  lastModified: new Date().toISOString()
                })
              });
            } catch (updateError) {
              console.warn('⚠️ Career Report - Failed to cache analysis:', updateError);
            }
          }
        }
      } else {
        setError('CV data not available for analysis');
      }
    } catch (error) {
      console.error('❌ Career Report - Error loading analysis:', error);
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch all CVs and set default to Master CV
  useEffect(() => {
    const fetchAllCVs = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        setLoadingMessage('Loading your CVs...');
        
        const response = await fetch(`/api/cvs?userId=${user.id}`);
        const result = await response.json();
        
        if (result.success && result.data?.cvs) {
          const cvs = result.data.cvs as CVDocument[];
          setAllCVs(cvs);
          
          // Find and set Master CV as default
          const masterCV = cvs.find((cv: CVDocument) => 
            cv.metadata?.isMaster === true || cv.isMaster === true
          );
          
          if (masterCV) {
            setSelectedCV(masterCV);
            await loadAnalysisForCV(masterCV);
          } else if (cvs.length > 0) {
            // Fallback to first CV if no Master CV
            setSelectedCV(cvs[0]);
            await loadAnalysisForCV(cvs[0]);
          } else {
            setError('No CVs found. Please create a CV first.');
          }
        }
      } catch (error) {
        console.error('❌ Career Report - Error fetching CVs:', error);
        setError('Failed to load CVs');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCVs();
  }, [user, loadAnalysisForCV]);

  // Handle CV selection
  const handleCVSelect = async (cv: CVDocument) => {
    // If CV doesn't have cvData, fetch it first
    if (!cv.cvData) {
      try {
        const cvResponse = await fetch(`/api/cvs/${cv.id}`);
        const cvResult = await cvResponse.json();
        if (cvResult.success && cvResult.data?.cv) {
          cv.cvData = cvResult.data.cv.cvData;
        }
      } catch (error) {
        console.error('Error fetching CV data:', error);
        setError('Failed to load CV data');
        return;
      }
    }
    
    setSelectedCV(cv);
    setShowCVDropdown(false);
    await loadAnalysisForCV(cv);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCVDropdown(false);
      }
    };

    if (showCVDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCVDropdown]);

  // Calculate overall health score
  const calculateHealthScore = (): number => {
    if (!careerAnalysis) return 0;
    
    const impactScore = careerAnalysis.impactScore ? (
      ((careerAnalysis.impactScore.quantifiableStatements || 0) / 15) * 30 +
      ((careerAnalysis.impactScore.highImpactVerbs || 0) / 30) * 40 +
      ((careerAnalysis.impactScore.industryKeywords || 0) / 100) * 30
    ) : 0;
    
    const coherenceScore = careerAnalysis.careerCoherence?.score || 0;
    
    // Weighted average: 60% impact, 40% coherence
    return Math.round(impactScore * 0.6 + coherenceScore * 0.4);
  };

  const handleRegenerateAnalysis = async () => {
    if (!selectedCV || !selectedCV.cvData) {
      setError('No CV selected for analysis');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const analysisResponse = await fetch('/api/ai/career-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cvData: selectedCV.cvData,
          jobData: null,
          jobId: null
        })
      });
      
      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json();
        if (analysisResult.success) {
          setCareerAnalysis(analysisResult.analysis);
          
          // Update CV with new analysis
          try {
            await fetch(`/api/cvs/${selectedCV.id}/metadata`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user?.id,
                aiAnalysis: analysisResult.analysis,
                lastModified: new Date().toISOString()
              })
            });
          } catch (updateError) {
            console.warn('⚠️ Failed to update CV with analysis:', updateError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error regenerating analysis:', error);
      setError('Failed to regenerate analysis');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will automatically retry when loading state changes
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Career Report"
          description="AI-powered career insights and recommendations"
          user={{
            name: getUserDisplayName(userData),
            email: getUserEmail(userData),
            username: userData?.username || '',
            profilePhoto: getUserAvatar(userData),
            designation: userData?.role || '',
          }}
          showSettings={true}
          onMobileMenuToggle={toggleSidebar}
          isMobileMenuOpen={isOpen}
        />
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Career Report"
          description="AI-powered career insights and recommendations"
          user={{
            name: getUserDisplayName(userData),
            email: getUserEmail(userData),
            username: userData?.username || '',
            profilePhoto: getUserAvatar(userData),
            designation: userData?.role || '',
          }}
          showSettings={true}
          onMobileMenuToggle={toggleSidebar}
          isMobileMenuOpen={isOpen}
        />
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Report</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-lime-500 text-white rounded-lg font-semibold hover:bg-lime-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/ai-career-report')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 transition-colors"
              >
                Create New Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!careerAnalysis) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Career Report"
          description="AI-powered career insights and recommendations"
          user={{
            name: getUserDisplayName(userData),
            email: getUserEmail(userData),
            username: userData?.username || '',
            profilePhoto: getUserAvatar(userData),
            designation: userData?.role || '',
          }}
          showSettings={true}
          onMobileMenuToggle={toggleSidebar}
          isMobileMenuOpen={isOpen}
        />
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Career Analysis Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Create a Master CV to get your AI-powered career report</p>
            <button
              onClick={() => router.push('/ai-career-report')}
              className="px-6 py-3 bg-lime-500 text-white rounded-lg font-semibold hover:bg-lime-600 transition-colors flex items-center gap-2 mx-auto"
            >
              Create Master CV
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Career Report"
        description="AI-powered career insights and recommendations"
        user={{
          name: getUserDisplayName(userData),
          email: getUserEmail(userData),
          username: userData?.username || '',
          profilePhoto: getUserAvatar(userData),
          designation: userData?.role || '',
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isOpen}
      />

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        {/* CV Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowCVDropdown(!showCVDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors shadow-sm"
          >
            <span className="text-gray-900 dark:text-white">
              {selectedCV ? (
                <>
                  <span className="font-semibold">{selectedCV.title}</span>
                  {selectedCV.metadata?.isMaster || selectedCV.isMaster ? (
                    <span className="ml-2 px-2 py-0.5 bg-[#80FF00]/20 text-[#80FF00] rounded text-xs">
                      Master
                    </span>
                  ) : null}
                </>
              ) : 'Select CV'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${showCVDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showCVDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {allCVs.map((cv) => (
                <button
                  key={cv.id}
                  onClick={() => handleCVSelect(cv)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors ${
                    selectedCV?.id === cv.id ? 'bg-gray-50 dark:bg-[#313a28]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{cv.title}</span>
                    {cv.metadata?.isMaster || cv.isMaster ? (
                      <span className="px-2 py-0.5 bg-[#80FF00]/20 text-[#80FF00] rounded text-xs">
                        Master
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Regenerate Button */}
        <motion.button
          onClick={handleRegenerateAnalysis}
          disabled={isGenerating || !selectedCV}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-400 hover:to-pink-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: isGenerating ? 1 : 1.05 }}
          whileTap={{ scale: isGenerating ? 1 : 0.95 }}
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Regenerate Analysis'}
        </motion.button>
      </div>

      {/* Main Content */}
      {careerAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Column 1 */}
          <div className="flex flex-col gap-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
            >
              <CVHealthScore
                score={calculateHealthScore()}
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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <CareerTrajectoryGraph
                careerPath={careerAnalysis.careerPath}
                careerCoherence={careerAnalysis.careerCoherence}
                experienceLevel={careerAnalysis.experienceLevel?.level}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <SkillsGapAnalysisCard careerAnalysis={careerAnalysis} />
            </motion.div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <ATSCompatibilityMeter
                impactScore={careerAnalysis.impactScore}
                cvOptimization={careerAnalysis.cvOptimization}
                industrySpecialization={careerAnalysis.industrySpecialization}
              />
            </motion.div>

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

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <StrategicRecommendationsCard careerAnalysis={careerAnalysis} />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerReportPage;

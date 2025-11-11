'use client';

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
  ChevronDown,
  Download
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
import CareerReportDownloadModal, { ReportFormatType } from '@/components/career-report/CareerReportDownloadModal';
import { personalizeCareerAnalysis, makeShareableCareerAnalysis } from '@/lib/utils/career-report-transform';
import { Skeleton } from '@/components/ui/SkeletonLoader';

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
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Track if data has been loaded to prevent re-fetching on tab switch
  const hasLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Load analysis for a specific CV - only fetch cached, don't generate
  const loadAnalysisForCV = useCallback(async (cv: CVDocument) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingMessage('Loading analysis...');
      
      // Only use cached analysis - don't generate new one
      if (cv.metadata?.aiAnalysis) {
        console.log('✅ Career Report - Using cached AI analysis');
        // Personalize the analysis for viewing (convert to "you" with name)
        const userName = getUserDisplayName(userData);
        const personalizedAnalysis = personalizeCareerAnalysis(cv.metadata.aiAnalysis, userName);
        setCareerAnalysis(personalizedAnalysis);
        setLoading(false);
        return;
      }
      
      // If no cached analysis, show message to regenerate
      setCareerAnalysis(null);
      setError(null); // Don't show error, just show empty state with regenerate button
      setLoading(false);
    } catch (error) {
      console.error('❌ Career Report - Error loading analysis:', error);
      setError('Failed to load analysis');
      setLoading(false);
    }
  }, [userData]);

  // Fetch all CVs and set default to Master CV
  useEffect(() => {
    const fetchAllCVs = async () => {
      if (!user?.id) return;

      // Prevent re-fetching on tab switch - only fetch if user ID changed or first load
      const currentUserId = user.id;
      if (hasLoadedRef.current && lastUserIdRef.current === currentUserId) {
        console.log('⏭️ Career Report - Skipping reload (data already loaded for this user)');
        return;
      }

      // Reset refs if user ID actually changed (different user logged in)
      if (lastUserIdRef.current && lastUserIdRef.current !== currentUserId) {
        console.log('🔄 Career Report - User ID changed, resetting load state');
        hasLoadedRef.current = false;
      }

      try {
        setLoading(true);
        setError(null);
        setLoadingMessage('Loading Career Report...');
        
        const response = await fetch(`/api/cvs?userId=${currentUserId}`);
        const result = await response.json();
        
        if (result.success && result.data?.cvs) {
          const cvs = result.data.cvs as CVDocument[];
          
          // Fetch full CV data with metadata for each CV (always fetch to ensure we have aiAnalysis)
          const cvsWithData = await Promise.all(
            cvs.map(async (cv) => {
              try {
                // Always fetch individual CV to get complete metadata including aiAnalysis
                const cvResponse = await fetch(`/api/cvs/${cv.id}`);
                const cvResult = await cvResponse.json();
                if (cvResult.success && cvResult.data?.cv) {
                  return {
                    ...cv,
                    metadata: {
                      ...cv.metadata,
                      ...cvResult.data.cv.metadata, // Merge to ensure aiAnalysis is included
                      aiAnalysis: cvResult.data.cv.metadata?.aiAnalysis || cv.metadata?.aiAnalysis
                    },
                    cvData: cvResult.data.cv.cvData || cv.cvData
                  };
                }
              } catch (error) {
                console.warn(`Failed to fetch metadata for CV ${cv.id}:`, error);
              }
              return cv;
            })
          );
          
          setAllCVs(cvsWithData);
          
          // Find and set Master CV as default
          const masterCV = cvsWithData.find((cv: CVDocument) => 
            cv.metadata?.isMaster === true || cv.isMaster === true
          );
          
          if (masterCV) {
            setSelectedCV(masterCV);
            await loadAnalysisForCV(masterCV);
          } else if (cvsWithData.length > 0) {
            // Fallback to first CV if no Master CV
            setSelectedCV(cvsWithData[0]);
            await loadAnalysisForCV(cvsWithData[0]);
          } else {
            setError('No CVs found. Please create a CV first.');
          }

          // Mark as loaded
          hasLoadedRef.current = true;
          lastUserIdRef.current = currentUserId;
        }
      } catch (error) {
        console.error('❌ Career Report - Error fetching CVs:', error);
        setError('Failed to load CVs');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCVs();
  }, [user?.id, loadAnalysisForCV]); // Use user.id instead of user object to prevent unnecessary re-runs

  // Handle CV selection
  const handleCVSelect = async (cv: CVDocument) => {
    // Always fetch individual CV to ensure we have complete metadata including aiAnalysis
    try {
      const cvResponse = await fetch(`/api/cvs/${cv.id}`);
      const cvResult = await cvResponse.json();
      if (cvResult.success && cvResult.data?.cv) {
        const updatedCV: CVDocument = {
          ...cv,
          metadata: {
            ...cv.metadata,
            ...cvResult.data.cv.metadata, // Merge to ensure aiAnalysis is included
            aiAnalysis: cvResult.data.cv.metadata?.aiAnalysis || cv.metadata?.aiAnalysis
          },
          cvData: cvResult.data.cv.cvData || cv.cvData
        };
        setSelectedCV(updatedCV);
        setShowCVDropdown(false);
        await loadAnalysisForCV(updatedCV);
      } else {
        setError('Failed to load CV data');
      }
    } catch (error) {
      console.error('Error fetching CV data:', error);
      setError('Failed to load CV data');
    }
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

  // Handle download
  const handleDownload = async (format: ReportFormatType) => {
    if (!careerAnalysis || !selectedCV) {
      setError('No analysis available to download');
      return;
    }

    setIsDownloading(true);
    try {
      // Get the original analysis from CV metadata (third person format)
      const originalAnalysis = selectedCV.metadata?.aiAnalysis || careerAnalysis;
      
      // Ensure it's in shareable format (third person)
      const userName = getUserDisplayName(userData);
      const shareableAnalysis = makeShareableCareerAnalysis(originalAnalysis, userName);

      // Generate HTML content
      const htmlContent = generateReportHTML(shareableAnalysis, selectedCV, userName, format);

      if (format === 'pdf') {
        // For PDF, we'll create a blob and use browser print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } else {
        // For HTML, create a download link
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCV.title || 'Career Report'}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      setShowDownloadModal(false);
    } catch (error) {
      console.error('❌ Error downloading report:', error);
      setError('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate HTML content for the report
  const generateReportHTML = (
    analysis: CareerAnalysis,
    cv: CVDocument,
    userName: string | null | undefined,
    format: ReportFormatType
  ): string => {
    const reportDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Career Report - ${cv.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #80FF00;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    h1 {
      color: #111827;
      font-size: 2.5rem;
      margin: 0 0 10px 0;
    }
    .subtitle {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }
    .section {
      margin-bottom: 40px;
      padding: 30px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #80FF00;
    }
    .section h2 {
      color: #111827;
      font-size: 1.5rem;
      margin: 0 0 20px 0;
    }
    .section h3 {
      color: #374151;
      font-size: 1.25rem;
      margin: 20px 0 10px 0;
    }
    .section p, .section li {
      color: #4b5563;
      margin: 10px 0;
    }
    .section ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .metric {
      display: inline-block;
      padding: 10px 20px;
      background: #80FF00;
      color: #000;
      border-radius: 6px;
      font-weight: bold;
      margin: 10px 10px 10px 0;
    }
    @media print {
      body {
        padding: 20px;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Career Report</h1>
    <p class="subtitle">${cv.title} • Generated on ${reportDate}</p>
    ${userName ? `<p class="subtitle">Report for: ${userName}</p>` : ''}
  </div>

  ${analysis.experienceLevel ? `
    <div class="section">
      <h2>Experience Level</h2>
      <div class="metric">${analysis.experienceLevel.level}</div>
      <p>${analysis.experienceLevel.rationale}</p>
    </div>
  ` : ''}

  ${analysis.careerPath ? `
    <div class="section">
      <h2>Career Trajectory</h2>
      ${analysis.careerPath.step1 ? `
        <h3>Step 1: ${analysis.careerPath.step1.title}</h3>
        <p>${analysis.careerPath.step1.reasoning}</p>
      ` : ''}
      ${analysis.careerPath.step2 ? `
        <h3>Step 2: ${analysis.careerPath.step2.title}</h3>
        <p>${analysis.careerPath.step2.reasoning}</p>
      ` : ''}
      ${analysis.careerPath.step3 ? `
        <h3>Step 3: ${analysis.careerPath.step3.title}</h3>
        <p>${analysis.careerPath.step3.reasoning}</p>
      ` : ''}
    </div>
  ` : ''}

  ${analysis.strategicSuggestions ? `
    <div class="section">
      <h2>Strategic Recommendations</h2>
      ${analysis.strategicSuggestions.hardSkill && typeof analysis.strategicSuggestions.hardSkill === 'object' ? `
        <h3>Hard Skill: ${analysis.strategicSuggestions.hardSkill.skill}</h3>
        <p>${analysis.strategicSuggestions.hardSkill.rationale}</p>
      ` : ''}
      ${analysis.strategicSuggestions.softSkill && typeof analysis.strategicSuggestions.softSkill === 'object' ? `
        <h3>Soft Skill: ${analysis.strategicSuggestions.softSkill.skill}</h3>
        <p>${analysis.strategicSuggestions.softSkill.rationale}</p>
      ` : ''}
    </div>
  ` : ''}

  ${analysis.impactScore ? `
    <div class="section">
      <h2>Impact Score</h2>
      <p>Quantifiable Statements: ${analysis.impactScore.quantifiableStatements || 0}/15</p>
      <p>High-Impact Verbs: ${analysis.impactScore.highImpactVerbs || 0}/30</p>
      <p>Industry Keywords: ${analysis.impactScore.industryKeywords || 0}/100</p>
    </div>
  ` : ''}

  ${analysis.careerCoherence ? `
    <div class="section">
      <h2>Career Coherence</h2>
      <div class="metric">${analysis.careerCoherence.score || 0}%</div>
      ${analysis.careerCoherence.strengths && analysis.careerCoherence.strengths.length > 0 ? `
        <h3>Strengths</h3>
        <ul>
          ${analysis.careerCoherence.strengths.map((s: string) => `<li>${s}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  ` : ''}
</body>
</html>`;
  };

  const handleRegenerateAnalysis = async () => {
    if (!selectedCV) {
      setError('No CV selected for analysis');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setLoadingMessage('Generating AI analysis...');
    
    try {
      // Fetch CV data if not available
      let cvDataToUse = selectedCV.cvData;
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
          jobId: null
        })
      });
      
      if (analysisResponse.ok) {
        const analysisResult = await analysisResponse.json();
        if (analysisResult.success) {
          // Personalize the analysis for viewing (convert to "you" with name)
          const userName = getUserDisplayName(userData);
          const personalizedAnalysis = personalizeCareerAnalysis(analysisResult.analysis, userName);
          setCareerAnalysis(personalizedAnalysis);
          
          // Update CV with new analysis (store in original third-person format)
          try {
            await fetch(`/api/cvs/${selectedCV.id}/metadata`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user?.id,
                aiAnalysis: analysisResult.analysis, // Store original third-person format
                lastModified: new Date().toISOString()
              })
            });
            console.log('✅ Career Report - Analysis cached successfully');
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
      setLoadingMessage('');
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // The useEffect will automatically retry when loading state changes
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

  if (!careerAnalysis && !loading) {
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
            className="flex items-center gap-2 px-4 py-2 bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-md font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isGenerating ? 1 : 1.05 }}
            whileTap={{ scale: isGenerating ? 1 : 0.95 }}
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Regenerate Analysis'}
          </motion.button>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Career Analysis Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Click "Regenerate Analysis" in the header to generate your AI-powered career report</p>
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        {/* CV Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowCVDropdown(!showCVDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-colors shadow-sm w-full md:w-auto"
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
            <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ml-auto md:ml-0 ${showCVDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showCVDropdown && (
            <div className="absolute top-full left-0 mt-2 w-full md:w-64 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
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

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Download Button */}
          <motion.button
            onClick={() => setShowDownloadModal(true)}
            disabled={!careerAnalysis || !selectedCV}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm h-[32px] bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-md font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1a2015] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            whileHover={{ scale: (!careerAnalysis || !selectedCV) ? 1 : 1.05 }}
            whileTap={{ scale: (!careerAnalysis || !selectedCV) ? 1 : 0.95 }}
          >
            <Download className="w-3.5 h-3.5" />
            Download Report
          </motion.button>

          {/* Regenerate Button */}
          <motion.button
            onClick={handleRegenerateAnalysis}
            disabled={isGenerating || !selectedCV}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm h-[32px] bg-[rgb(129,255,0)] hover:bg-[rgb(110,230,0)] text-black rounded-md font-medium border border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            whileHover={{ scale: isGenerating ? 1 : 1.05 }}
            whileTap={{ scale: isGenerating ? 1 : 0.95 }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Regenerate Analysis'}
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Column 1 - Skeleton Loaders */}
            <div className="flex flex-col gap-4 md:gap-6">
              <ReportCardSkeleton />
              <ReportCardSkeleton />
              <ReportCardSkeleton />
              <ReportCardSkeleton />
            </div>
            {/* Column 2 - Skeleton Loaders */}
            <div className="flex flex-col gap-4 md:gap-6">
              <ReportCardSkeleton />
              <ReportCardSkeleton />
              <ReportCardSkeleton />
              <ReportCardSkeleton />
              <ReportCardSkeleton />
            </div>
          </div>
          {/* Career Trajectory Skeleton */}
          <div className="w-full mt-6">
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6 animate-pulse">
              <Skeleton variant="rounded" height={300} width="100%" />
            </div>
          </div>
        </>
      ) : careerAnalysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Column 1 */}
            <div className="flex flex-col gap-4 md:gap-6">
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
                <SkillsGapAnalysisCard careerAnalysis={careerAnalysis} />
              </motion.div>
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <StrategicRecommendationsCard careerAnalysis={careerAnalysis} />
              </motion.div>
            </div>
          </div>

          {/* Career Trajectory Analysis - Full Width Row at the End */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="w-full"
          >
            <CareerTrajectoryGraph
              careerPath={careerAnalysis.careerPath}
              careerCoherence={careerAnalysis.careerCoherence}
              experienceLevel={careerAnalysis.experienceLevel?.level}
            />
          </motion.div>
        </>
      )}

      {/* Download Modal */}
      <CareerReportDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        isDownloading={isDownloading}
      />
    </div>
  );
};

export default CareerReportPage;

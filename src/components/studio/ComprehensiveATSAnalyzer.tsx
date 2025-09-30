'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  BarChart3,
  Lightbulb,
  Sparkles,
  Copy,
  Wand2,
  TrendingUp,
  FileText,
  Zap,
  ArrowRight,
  Eye
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import JobSelector from './JobSelector';
import { useJobJourney } from '@/contexts/JobJourneyContext';

interface ATSResult {
  score: number;
  breakdown: {
    keywordMatch: number;
    experienceEducation: number;
    actionVerbs: number;
    formatting: number;
    skills: number;
  };
  details: {
    matchedKeywords: string[];
    missingKeywords: string[];
    experienceYears: number;
    educationLevel: string;
    actionVerbMatches: string[];
    skillsMatched: string[];
    skillsMissing: string[];
    formatIssues: string[];
  };
  suggestions: string[];
  optimizations: {
    summary: string;
    workExperience: Array<{
      index: number;
      optimizedText: string;
    }>;
    skills: string[];
    keywords: string[];
  };
}

interface ComprehensiveATSAnalyzerProps {
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  userId: string;
  cvData: any;
  jobData: any;
  cvId?: string;
  onUpdateField?: (path: string, value: any) => void;
  onScoreUpdate?: (score: number) => void;
}

export default function ComprehensiveATSAnalyzer({ 
  selectedJobId,
  onJobSelection,
  userId,
  cvData,
  jobData,
  cvId,
  onUpdateField,
  onScoreUpdate
}: ComprehensiveATSAnalyzerProps) {
  const themeClasses = getThemeClasses;
  const { state: journeyState } = useJobJourney();
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'optimization' | 'preview'>('analysis');
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [linkedJobData, setLinkedJobData] = useState<any>(null);

  // Load linked job from journey
  useEffect(() => {
    const loadLinkedJob = async () => {
      if (journeyState.currentJobId && journeyState.currentJobId !== selectedJobId) {
        try {
          const response = await fetch(`/api/jobs/${journeyState.currentJobId}?userId=${userId}`);
          if (response.ok) {
            const result = await response.json();
            setLinkedJobData(result.job || result.data?.job);
            // Auto-select the linked job if no job is currently selected
            if (!selectedJobId && onJobSelection) {
              onJobSelection(journeyState.currentJobId);
            }
          }
        } catch (error) {
          console.error('Error loading linked job:', error);
        }
      }
    };

    loadLinkedJob();
  }, [journeyState.currentJobId, selectedJobId, userId, onJobSelection]);

  // Convert CV data to text for analysis
  const getCVText = useCallback(() => {
    if (!cvData) return '';
    
    let cvText = '';
    
    // Add basics
    if (cvData.basics) {
      if (cvData.basics.name) cvText += `Name: ${cvData.basics.name}\n`;
      if (cvData.basics.label) cvText += `Title: ${cvData.basics.label}\n`;
      if (cvData.basics.summary) cvText += `Summary: ${cvData.basics.summary}\n`;
      if (cvData.basics.email) cvText += `Email: ${cvData.basics.email}\n`;
      if (cvData.basics.phone) cvText += `Phone: ${cvData.basics.phone}\n`;
    }
    
    // Add work experience
    if (cvData.work && Array.isArray(cvData.work)) {
      cvText += '\nWork Experience:\n';
      cvData.work.forEach((job: any) => {
        if (job.name) cvText += `Company: ${job.name}\n`;
        if (job.position) cvText += `Position: ${job.position}\n`;
        if (job.startDate) cvText += `Start Date: ${job.startDate}\n`;
        if (job.endDate) cvText += `End Date: ${job.endDate}\n`;
        if (job.summary) cvText += `Description: ${job.summary}\n`;
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: string) => {
            cvText += `- ${highlight}\n`;
          });
        }
        cvText += '\n';
      });
    }
    
    // Add skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvText += 'Skills:\n';
      cvData.skills.forEach((skill: any) => {
        if (skill.name) cvText += `${skill.name}, `;
      });
      cvText += '\n';
    }
    
    // Add education
    if (cvData.education && Array.isArray(cvData.education)) {
      cvText += '\nEducation:\n';
      cvData.education.forEach((edu: any) => {
        if (edu.institution) cvText += `Institution: ${edu.institution}\n`;
        if (edu.area) cvText += `Degree: ${edu.area}\n`;
        if (edu.studyType) cvText += `Type: ${edu.studyType}\n`;
        if (edu.description) cvText += `Description: ${edu.description}\n`;
      });
    }
    
    return cvText;
  }, [cvData]);

  const calculateComprehensiveATSScore = useCallback(async () => {
    if (!cvData || !jobData) {
      console.log('🔍 Comprehensive ATS Analyzer - Missing data:', { hasCvData: !!cvData, hasJobData: !!jobData });
      return;
    }
    
    setIsLoading(true);
    try {
      const cvText = getCVText();
      const jobDescription = jobData.description || jobData.jobDescription || jobData.requirements || jobData.jobRequirements || '';
      
      console.log('🔍 Comprehensive ATS Analyzer - Request data:', {
        cvTextLength: cvText.length,
        jobDescriptionLength: jobDescription.length,
        hasCvText: !!cvText,
        hasJobDescription: !!jobDescription
      });
      
      if (!cvText) {
        console.error('🔍 Comprehensive ATS Analyzer - Missing CV text');
        throw new Error('CV text is required for ATS analysis');
      }
      
      // Create a basic job description if none is provided
      let finalJobDescription = jobDescription;
      if (!jobDescription) {
        const jobTitle = jobData.title || jobData.jobTitle || 'Software Engineer';
        const company = jobData.company || 'Technology Company';
        finalJobDescription = `${jobTitle} position at ${company}. This role requires relevant experience and skills in the field.`;
        console.log('🔍 Comprehensive ATS Analyzer - Created fallback job description:', finalJobDescription);
      }
      
      const requestBody = {
        cvText,
        jobDescription: finalJobDescription,
        cvData,
        jobData,
        cvId,
        comprehensive: true
      };
      
      console.log('🔍 Comprehensive ATS Analyzer - Sending request to API');
      
      const response = await fetch('/api/ats/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('🔍 Comprehensive ATS Analyzer - Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🔍 Comprehensive ATS Analyzer - API error:', errorData);
        throw new Error(errorData.error || 'Failed to calculate comprehensive ATS score');
      }
      
      const result: ATSResult = await response.json();
      console.log('🔍 Comprehensive ATS Analyzer - Success:', result);
      setAtsResult(result);
      
      // Update parent component with score
      if (onScoreUpdate) {
        onScoreUpdate(result.score);
      }
      
    } catch (error) {
      console.error('🔍 Comprehensive ATS Analyzer - Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Set a default result to prevent UI issues
      setAtsResult({
        score: 0,
        breakdown: { 
          keywordMatch: 0, 
          experienceEducation: 0, 
          actionVerbs: 0, 
          formatting: 0, 
          skills: 0 
        },
        details: { 
          matchedKeywords: [], 
          missingKeywords: [], 
          experienceYears: 0, 
          educationLevel: 'Not specified', 
          actionVerbMatches: [],
          skillsMatched: [],
          skillsMissing: [],
          formatIssues: []
        },
        suggestions: [`Unable to calculate ATS score: ${errorMessage}. Please try again or contact support if the issue persists.`],
        optimizations: {
          summary: '',
          workExperience: [],
          skills: [],
          keywords: []
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [cvData, jobData, getCVText, cvId]);

  const applyOptimizations = useCallback(async () => {
    if (!atsResult || !onUpdateField || !cvId) return;
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    try {
      // Apply summary optimization
      if (atsResult.optimizations.summary) {
        setOptimizationProgress(20);
        onUpdateField('basics.summary', atsResult.optimizations.summary);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Apply work experience optimizations
      if (atsResult.optimizations.workExperience.length > 0) {
        setOptimizationProgress(50);
        atsResult.optimizations.workExperience.forEach(({ index, optimizedText }) => {
          onUpdateField(`work.${index}.summary`, optimizedText);
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Apply skills optimizations
      if (atsResult.optimizations.skills.length > 0) {
        setOptimizationProgress(80);
        const currentSkills = cvData.skills || [];
        const newSkills = atsResult.optimizations.skills.map(skill => ({
          name: skill,
          level: 'Intermediate',
          keywords: []
        }));
        onUpdateField('skills', [...currentSkills, ...newSkills]);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setOptimizationProgress(100);
      
      // Save optimizations to database
      try {
        const response = await fetch(`/api/cvs/${cvId}/ats-optimization`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            jobId: selectedJobId || journeyState.currentJobId,
            atsScore: atsResult.score,
            optimizations: atsResult.optimizations,
            appliedAt: new Date().toISOString()
          }),
        });
        
        if (response.ok) {
          console.log('✅ ATS optimizations saved to database');
        }
      } catch (dbError) {
        console.error('❌ Failed to save optimizations to database:', dbError);
      }
      
      // Recalculate score after optimizations
      setTimeout(() => {
        calculateComprehensiveATSScore();
        setOptimizationProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('Error applying optimizations:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [atsResult, onUpdateField, cvData, cvId, userId, selectedJobId, journeyState.currentJobId, calculateComprehensiveATSScore]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-lime-600" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Comprehensive ATS Analyzer
          </h3>
        </div>
        <div className="flex items-center space-x-3">
          {/* ATS Compatibility Score Display */}
          {atsResult && (
            <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ATS Compatibility Score</span>
                <span className={`text-sm font-bold ${
                  atsResult.score >= 80 ? 'text-green-600' : 
                  atsResult.score >= 60 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {atsResult.score}%
                </span>
              </div>
              <div className={`text-xs mt-1 ${
                atsResult.score >= 80 ? 'text-green-700 dark:text-green-300' :
                atsResult.score >= 60 ? 'text-yellow-700 dark:text-yellow-300' :
                'text-red-700 dark:text-red-300'
              }`}>
                {atsResult.score >= 80 ? 'Excellent' : 
                 atsResult.score >= 60 ? 'Good' : 
                 'Needs optimization to pass ATS screening'}
              </div>
            </div>
          )}
          <button
            onClick={calculateComprehensiveATSScore}
            disabled={isLoading || !cvData || !jobData}
            className="flex items-center space-x-2 px-3 py-1.5 bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isLoading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <BarChart3 className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{isLoading ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>
      </div>

      {/* Linked Job Display */}
      {(linkedJobData || jobData) && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  {(linkedJobData || jobData)?.title || 'Target Position'}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {(linkedJobData || jobData)?.company || 'Company'}
                </p>
                {journeyState.currentJobId && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full mt-1">
                    <CheckCircle className="w-3 h-3" />
                    Linked from Journey
                  </span>
                )}
              </div>
            </div>
            {!selectedJobId && (
              <button
                onClick={() => onJobSelection && onJobSelection(journeyState.currentJobId)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Select Job
              </button>
            )}
          </div>
        </div>
      )}

      {/* Job Selection */}
      {!linkedJobData && !jobData && (
        <div className="mb-4">
          <JobSelector
            selectedJobId={selectedJobId}
            onJobSelection={onJobSelection}
            userId={userId}
            autoLoadedFromJourney={!!journeyState.currentJobId}
          />
        </div>
      )}

      {atsResult && (
        <div className="space-y-4">

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-4">
              {[
                { id: 'analysis', label: 'Analysis', icon: BarChart3 },
                { id: 'optimization', label: 'Auto-Fix', icon: Sparkles },
                { id: 'preview', label: 'Preview', icon: Eye }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1 py-2 px-1 border-b-2 font-medium text-xs transition-colors ${
                    activeTab === tab.id
                      ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                {/* Breakdown Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(atsResult.breakdown).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className={`text-sm font-bold ${value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {value}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-2">
                        <div 
                          className={`h-1.5 rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Keywords Analysis */}
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Matched Keywords ({atsResult.details.matchedKeywords.length})
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {atsResult.details.matchedKeywords.slice(0, 10).map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Missing Keywords ({atsResult.details.missingKeywords.length})
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {atsResult.details.missingKeywords.slice(0, 10).map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'optimization' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    AI-Powered Optimization
                  </h4>
                  <motion.button
                    onClick={applyOptimizations}
                    disabled={isOptimizing || !onUpdateField}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isOptimizing ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    <span>{isOptimizing ? 'Optimizing...' : 'One-Click Fix'}</span>
                  </motion.button>
                </div>

                {isOptimizing && (
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${optimizationProgress}%` }}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {atsResult.optimizations.summary && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Professional Summary Enhancement
                      </h5>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        AI-optimized summary with better keyword integration
                      </p>
                    </div>
                  )}

                  {atsResult.optimizations.workExperience.length > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h5 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        Work Experience Optimization
                      </h5>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        {atsResult.optimizations.workExperience.length} job descriptions will be enhanced
                      </p>
                    </div>
                  )}

                  {atsResult.optimizations.skills.length > 0 && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <h5 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Skills Enhancement
                      </h5>
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        {atsResult.optimizations.skills.length} relevant skills will be added
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Optimization Preview
                </h4>
                
                {atsResult.optimizations.summary && (
                  <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Enhanced Professional Summary
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {atsResult.optimizations.summary}
                    </p>
                  </div>
                )}

                {atsResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                      Improvement Suggestions
                    </h5>
                    {atsResult.suggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                      >
                        <Lightbulb className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {suggestion}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!atsResult && !jobData && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Select a job position to start comprehensive ATS analysis
          </p>
        </div>
      )}

      {!atsResult && jobData && (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Click "Analyze" to get comprehensive ATS insights and optimizations
          </p>
        </div>
      )}
    </div>
  );
}
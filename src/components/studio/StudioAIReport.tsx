'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import ATSCompatibilityMeter from '@/components/career-report/widgets/ATSCompatibilityMeter';
import KeywordMatchHeatmap from '@/components/career-report/widgets/KeywordMatchHeatmap';
import SkillsRadarChart from '@/components/career-report/widgets/SkillsRadarChart';
import ImpactDensityChart from '@/components/career-report/widgets/ImpactDensityChart';

interface StudioAIReportProps {
  cvData: any;
  jobData?: any;
  cvId?: string;
  userId: string;
  selectedJobId?: string | null;
  onJobSelection?: (jobId: string | null) => void;
  onScoreUpdate?: (score: number) => void;
}

interface CareerAnalysis {
  impactScore?: {
    quantifiableStatements?: number;
    highImpactVerbs?: number;
    industryKeywords?: number;
  };
  cvOptimization?: {
    totalLength?: string;
    bulletPointLength?: string;
    educationPlacement?: string;
  };
  industrySpecialization?: {
    keywords?: string[];
    specialization?: string;
    contactIssues?: string[];
  };
  skillsGap?: {
    focusDistribution?: Array<{
      area: string;
      percentage: number;
    }>;
    skills?: Array<{
      name: string;
      mentions: number;
      quantifiedUse: number;
    }>;
  };
}

const StudioAIReport: React.FC<StudioAIReportProps> = ({
  cvData,
  jobData,
  cvId,
  userId,
  selectedJobId,
  onJobSelection,
  onScoreUpdate
}) => {
  const [careerAnalysis, setCareerAnalysis] = useState<CareerAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate or fetch career analysis
  const generateAnalysis = useCallback(async () => {
    if (!cvData) {
      setError('CV data is required');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/career-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData,
          jobData: jobData || null,
          jobId: selectedJobId || null,
          userId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success && result.analysis) {
        setCareerAnalysis(result.analysis);
        
        // Calculate ATS score and notify parent
        if (onScoreUpdate) {
          const atsScore = calculateATSScore(result.analysis);
          onScoreUpdate(atsScore);
        }
      } else {
        throw new Error(result.error || 'Failed to generate analysis');
      }
    } catch (err: any) {
      console.error('❌ StudioAIReport - Error generating analysis:', err);
      setError(err.message || 'Failed to generate career analysis');
    } finally {
      setIsGenerating(false);
    }
  }, [cvData, jobData, selectedJobId, userId, onScoreUpdate]);

  // Calculate ATS score from analysis
  const calculateATSScore = (analysis: CareerAnalysis): number => {
    let score = 0;
    let maxScore = 0;

    // Quantifiable statements (30 points)
    maxScore += 30;
    const quantifiableScore = Math.min(
      ((analysis.impactScore?.quantifiableStatements || 0) / 15) * 30,
      30
    );
    score += quantifiableScore;

    // Industry keywords (25 points)
    maxScore += 25;
    const keywordScore = Math.min(
      ((analysis.impactScore?.industryKeywords || 0) / 100) * 25,
      25
    );
    score += keywordScore;

    // CV structure (20 points)
    maxScore += 20;
    let structureScore = 0;
    if (analysis.cvOptimization?.totalLength === '1 Page' || analysis.cvOptimization?.totalLength?.includes('1')) {
      structureScore += 10;
    } else if (analysis.cvOptimization?.totalLength === '2 Pages') {
      structureScore += 7;
    }
    if (analysis.cvOptimization?.bulletPointLength?.includes('2.') || analysis.cvOptimization?.bulletPointLength?.includes('Max 2')) {
      structureScore += 10;
    } else {
      structureScore += 5;
    }
    score += structureScore;

    // High-impact verbs (15 points)
    maxScore += 15;
    const verbScore = Math.min(
      ((analysis.impactScore?.highImpactVerbs || 0) / 30) * 15,
      15
    );
    score += verbScore;

    // Contact info quality (10 points)
    maxScore += 10;
    const contactScore = (analysis.industrySpecialization?.contactIssues?.length || 0) === 0 ? 10 : 5;
    score += contactScore;

    return Math.round((score / maxScore) * 100);
  };

  // Auto-generate analysis when cvData or jobData changes
  useEffect(() => {
    if (cvData && !careerAnalysis && !isGenerating && !isLoading) {
      // Small delay to prevent rapid re-renders
      const timer = setTimeout(() => {
        generateAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cvData, jobData, selectedJobId]);

  // Loading state
  if (isGenerating || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-[#80FF00] animate-spin" />
        <p className="text-sm text-gray-400">Generating AI analysis...</p>
      </div>
    );
  }

  // Error state
  if (error && !careerAnalysis) {
    return (
      <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <h3 className="text-sm font-semibold text-red-400">Analysis Error</h3>
        </div>
        <p className="text-red-300 mb-4 text-sm">{error}</p>
        <button
          onClick={generateAnalysis}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry Analysis
        </button>
      </div>
    );
  }

  // No data state
  if (!careerAnalysis) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          No analysis data available
        </p>
        <button
          onClick={generateAnalysis}
          className="px-6 py-2 bg-[#80FF00] text-black rounded-lg hover:bg-[#60CC00] font-medium text-sm"
        >
          Generate Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">AI Career Report</h2>
          <p className="text-sm text-gray-400 mt-1">
            Comprehensive analysis of your CV's performance
          </p>
        </div>
        <button
          onClick={generateAnalysis}
          disabled={isGenerating}
          className="px-4 py-2 bg-[#2D332D] border border-[#80FF00]/30 text-[#80FF00] rounded-lg hover:bg-[#80FF00]/10 transition-colors font-medium text-sm disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Widgets - Single Column Layout */}
      <div className="flex flex-col gap-6">
        {/* ATS Compatibility Meter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ATSCompatibilityMeter
            impactScore={careerAnalysis.impactScore}
            cvOptimization={careerAnalysis.cvOptimization}
            industrySpecialization={careerAnalysis.industrySpecialization}
          />
        </motion.div>

        {/* Keyword Match Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <KeywordMatchHeatmap
            industrySpecialization={careerAnalysis.industrySpecialization}
            impactScore={careerAnalysis.impactScore}
          />
        </motion.div>

        {/* Skills Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SkillsRadarChart
            skillsGap={careerAnalysis.skillsGap}
            impactScore={careerAnalysis.impactScore}
          />
        </motion.div>

        {/* Impact Density Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <ImpactDensityChart
            impactScore={careerAnalysis.impactScore}
            skillsGap={careerAnalysis.skillsGap}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default StudioAIReport;


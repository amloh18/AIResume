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
  Eye,
  X,
  Plus,
  Key,
  Camera,
  User,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import JobSelector from './JobSelector';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import FloatingATSAnalyzer from './FloatingATSAnalyzer';

interface ATSResult {
  score: number;
  profileLevel?: {
    title: string;
    yearsExperience: number;
    description: string;
  };
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
  const [activeTab, setActiveTab] = useState<'keywords' | 'formatting' | 'fixlog'>('keywords');
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [linkedJobData, setLinkedJobData] = useState<any>(null);
  
  // Auto Fix state
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixProgress, setAutoFixProgress] = useState(0);
  const [autoFixLogs, setAutoFixLogs] = useState<string[]>([]);
  
  // Floating ATS Analyzer state
  const [showFloatingAnalyzer, setShowFloatingAnalyzer] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<{
    missingKeywords: boolean;
    keywordsDensity: boolean;
    softSkills: boolean;
  }>({
    missingKeywords: false,
    keywordsDensity: false,
    softSkills: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
  const convertCVToText = useCallback((cvData: any) => {
    if (!cvData) return '';
    
    let text = '';
    
    // Personal Information
    if (cvData.personalInfo) {
      const { firstName, lastName, email, phone, location, linkedin, website } = cvData.personalInfo;
      text += `${firstName || ''} ${lastName || ''}\n`;
      text += `${email || ''}\n`;
      text += `${phone || ''}\n`;
      text += `${location || ''}\n`;
      text += `${linkedin || ''}\n`;
      text += `${website || ''}\n\n`;
    }

    // Professional Summary
    if (cvData.professionalSummary) {
      text += `Professional Summary:\n${cvData.professionalSummary}\n\n`;
    }

    // Work Experience
    if (cvData.workExperience && Array.isArray(cvData.workExperience)) {
      text += 'Work Experience:\n';
      cvData.workExperience.forEach((exp: any) => {
        text += `${exp.jobTitle || ''} at ${exp.company || ''}\n`;
        text += `${exp.startDate || ''} - ${exp.endDate || ''}\n`;
        text += `${exp.description || ''}\n\n`;
      });
    }

    // Education
    if (cvData.education && Array.isArray(cvData.education)) {
      text += 'Education:\n';
      cvData.education.forEach((edu: any) => {
        text += `${edu.degree || ''} from ${edu.institution || ''}\n`;
        text += `${edu.startDate || ''} - ${edu.endDate || ''}\n`;
        text += `${edu.description || ''}\n\n`;
      });
    }

    // Skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      text += 'Skills:\n';
      cvData.skills.forEach((skill: any) => {
        text += `${skill.name || ''} - ${skill.level || ''}\n`;
      });
      text += '\n';
    }

    // Projects
    if (cvData.projects && Array.isArray(cvData.projects)) {
      text += 'Projects:\n';
      cvData.projects.forEach((project: any) => {
        text += `${project.name || ''}\n`;
        text += `${project.description || ''}\n`;
        text += `${project.technologies || ''}\n\n`;
      });
    }

    return text;
  }, []);

  // Run ATS Analysis
  const runATSAnalysis = useCallback(async () => {
    if (!selectedJobId || !cvData) return;

    setIsLoading(true);
    try {
      const cvText = convertCVToText(cvData);
      const response = await fetch('/api/ats/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvText,
          jobId: selectedJobId,
          userId,
          cvId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAtsResult(result);
        if (onScoreUpdate) {
          onScoreUpdate(result.score);
        }
      } else {
        console.error('Failed to analyze CV');
      }
    } catch (error) {
      console.error('Error analyzing CV:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, cvData, convertCVToText, userId, cvId, onScoreUpdate]);

  // Auto Fix functionality
  const handleAutoFix = useCallback(async () => {
    if (!atsResult || !onUpdateField) return;

    setIsAutoFixing(true);
    setAutoFixProgress(0);
    setAutoFixLogs([]);

    try {
      // Simulate auto-fix progress
      const steps = [
        'Analyzing CV structure...',
        'Adding missing keywords...',
        'Optimizing formatting...',
        'Updating skills section...',
        'Finalizing improvements...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setAutoFixLogs(prev => [...prev, steps[i]]);
        setAutoFixProgress((i + 1) / steps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Apply optimizations
      if (atsResult.optimizations) {
        // Update skills
        if (atsResult.optimizations.skills.length > 0) {
          onUpdateField('skills', atsResult.optimizations.skills.map(skill => ({ name: skill, level: 'Intermediate' })));
        }

        // Update keywords in professional summary
        if (atsResult.optimizations.keywords.length > 0) {
          const currentSummary = cvData?.professionalSummary || '';
          const newSummary = currentSummary + '\n\nKey Skills: ' + atsResult.optimizations.keywords.join(', ');
          onUpdateField('professionalSummary', newSummary);
        }
      }

      setAutoFixLogs(prev => [...prev, 'Auto-fix completed successfully!']);
    } catch (error) {
      console.error('Error during auto-fix:', error);
      setAutoFixLogs(prev => [...prev, 'Error during auto-fix process']);
    } finally {
      setIsAutoFixing(false);
    }
  }, [atsResult, onUpdateField, cvData]);

  // Auto-run analysis when job is selected
  useEffect(() => {
    if (selectedJobId && cvData && !atsResult) {
      runATSAnalysis();
    }
  }, [selectedJobId, cvData, atsResult]);

  return (
    <div className="space-y-6">
      {/* Job Selector */}
      <JobSelector
        selectedJobId={selectedJobId}
        onJobSelection={onJobSelection}
        userId={userId}
        showCreateButton={true}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#80FF00]" />
            <span className="text-lg text-gray-600 dark:text-gray-400">Analyzing CV...</span>
          </div>
        </div>
      )}

      {/* No Job Selected */}
      {!selectedJobId && !jobData && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Select a job position to start comprehensive ATS analysis
          </p>
        </div>
      )}

      {/* ATS Match Report - Full Width Design */}
      {atsResult && !isLoading && (
        <div className="bg-[#1A201A] rounded-2xl shadow-2xl shadow-black/50 border border-gray-800/30 w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-gray-800/30">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                ATS Match Report
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                {jobData?.title || linkedJobData?.title || 'Position'}
              </p>
            </div>
            <button
              onClick={() => setShowFloatingAnalyzer(true)}
              className="p-3 hover:bg-gray-800/50 rounded-xl transition-colors"
            >
              <Eye className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Main Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Overall Match Score */}
                <div className="bg-gray-800/30 rounded-2xl p-8 text-center">
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-700"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - atsResult.score / 100)}`}
                        className="text-[#80FF00]"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">{atsResult.score}%</span>
                    </div>
                  </div>
                  <p className="text-white text-xl font-medium">Overall Match Score</p>
                </div>

                {/* Top 3 Actions */}
                <div className="bg-gray-800/30 rounded-2xl p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Top 3 Actions</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-[#80FF00] rounded-lg">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white text-base">
                        Add 5+ high-priority keywords to your skills section.
                      </p>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-[#80FF00] rounded-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white text-base">
                        Quantify achievements in your last role with metrics.
                      </p>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-[#80FF00] rounded-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white text-base">
                        Fix formatting errors in the experience section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Key className="w-5 h-5 text-[#80FF00]" />
                    </div>
                    <p className="text-white text-base font-medium">Keyword Gaps</p>
                    <p className="text-[#80FF00] text-sm mt-2">Needs Improvement</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Camera className="w-5 h-5 text-[#80FF00]" />
                    </div>
                    <p className="text-white text-base font-medium">Formatting & Parsability</p>
                    <p className="text-[#80FF00] text-sm mt-2">Good</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-5 h-5 text-[#80FF00]" />
                    </div>
                    <p className="text-white text-base font-medium">Experience Alignment</p>
                    <p className="text-[#80FF00] text-sm mt-2">Strong</p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-700">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => setActiveTab('keywords')}
                      className={`pb-4 text-base font-medium transition-colors ${
                        activeTab === 'keywords'
                          ? 'text-[#80FF00] border-b-2 border-[#80FF00]'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Keywords & Skills
                    </button>
                    <button
                      onClick={() => setActiveTab('formatting')}
                      className={`pb-4 text-base font-medium transition-colors ${
                        activeTab === 'formatting'
                          ? 'text-[#80FF00] border-b-2 border-[#80FF00]'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Formatting & Structure
                    </button>
                    <button
                      onClick={() => setActiveTab('fixlog')}
                      className={`pb-4 text-base font-medium transition-colors ${
                        activeTab === 'fixlog'
                          ? 'text-[#80FF00] border-b-2 border-[#80FF00]'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      Fix Log
                    </button>
                  </nav>
                </div>

                {/* Expandable Sections */}
                <div className="space-y-4">
                  {/* Missing Keywords */}
                  <div className="bg-gray-800/20 rounded-xl">
                    <button
                      onClick={() => toggleSection('missingKeywords')}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <span className="text-white font-medium text-lg">
                        Missing Keywords ({atsResult.details.missingKeywords.length})
                      </span>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </button>
                    {expandedSections.missingKeywords && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-6"
                      >
                        <div className="space-y-3">
                          {atsResult.details.missingKeywords.slice(0, 5).map((keyword, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg border border-red-800/30">
                              <span className="text-white text-base">{keyword}</span>
                              <button className="text-[#80FF00] hover:text-[#80FF00]/80 text-sm font-medium">
                                Add to CV
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Keywords to Increase Density */}
                  <div className="bg-gray-800/20 rounded-xl">
                    <button
                      onClick={() => toggleSection('keywordsDensity')}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <span className="text-white font-medium text-lg">Keywords to Increase Density</span>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </button>
                    {expandedSections.keywordsDensity && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-6"
                      >
                        <div className="space-y-3">
                          {atsResult.details.matchedKeywords.slice(0, 4).map((keyword, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg border border-yellow-800/30">
                              <span className="text-white text-base">{keyword}</span>
                              <span className="text-yellow-400 text-sm">Low density</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Soft Skills Alignment */}
                  <div className="bg-gray-800/20 rounded-xl">
                    <button
                      onClick={() => toggleSection('softSkills')}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <span className="text-white font-medium text-lg">Soft Skills Alignment</span>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </button>
                    {expandedSections.softSkills && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-6 pb-6"
                      >
                        <div className="space-y-3">
                          {atsResult.details.skillsMatched.slice(0, 4).map((skill, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-800/30">
                              <span className="text-white text-base">{skill}</span>
                              <span className="text-[#80FF00] text-sm">Well aligned</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-8 border-t border-gray-800/30 bg-gray-900/20">
            <button
              onClick={handleAutoFix}
              disabled={isAutoFixing}
              className="px-8 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800/50 transition-colors font-medium text-lg disabled:opacity-50"
            >
              {isAutoFixing ? 'Fixing...' : 'Fix Now'}
            </button>
            <button
              onClick={() => setShowFloatingAnalyzer(true)}
              className="px-8 py-3 bg-[#80FF00] text-white rounded-xl hover:bg-[#80FF00]/90 transition-colors font-medium text-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Floating ATS Analyzer */}
      <FloatingATSAnalyzer
        isOpen={showFloatingAnalyzer}
        onClose={() => setShowFloatingAnalyzer(false)}
        jobTitle={jobData?.title || linkedJobData?.title || 'Position'}
        onFixAll={() => {
          handleAutoFix();
          setShowFloatingAnalyzer(false);
        }}
      />
    </div>
  );
}
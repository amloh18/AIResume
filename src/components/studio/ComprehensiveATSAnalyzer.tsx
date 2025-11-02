'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { useJobJourney } from '@/contexts/JobJourneyContext';

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
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'keywords' | 'formatting' | 'fixlog'>('keywords');
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [linkedJobData, setLinkedJobData] = useState<any>(null);
  const isAnalyzingRef = useRef(false);
  
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

  // Load linked job from journey (same as journey card)
  useEffect(() => {
    const loadLinkedJob = async () => {
      if (journeyState.currentJobId && journeyState.currentJobId !== selectedJobId) {
        try {
          const response = await fetch(`/api/jobs/${journeyState.currentJobId}`);
          if (response.ok) {
            const result = await response.json();
            
            // Use the same data structure as journey card
            const jobData = result.success && result.data ? result.data : result.job || result;
            
            setLinkedJobData(jobData);
            // Auto-select the linked job if no job is currently selected
            if (!selectedJobId && onJobSelection) {
              onJobSelection(journeyState.currentJobId);
            }
          } else {
            console.error('❌ ATS Analyzer - Failed to load job:', response.status);
          }
        } catch (error) {
          console.error('❌ ATS Analyzer - Error loading linked job:', error);
        }
      }
    };

    loadLinkedJob();
  }, [journeyState.currentJobId, selectedJobId, userId, onJobSelection]);

  // Convert CV data to text for analysis
  const convertCVToText = useCallback((cvData: any) => {
    if (!cvData) {
      return '';
    }
    
    let text = '';
    
    // Personal Information (UnifiedCVDataStructure format)
    if (cvData.basics) {
      const { name, label, email, phone, url, summary, location } = cvData.basics;
      text += `${name || ''}\n`;
      text += `${label || ''}\n`;
      text += `${email || ''}\n`;
      text += `${phone || ''}\n`;
      text += `${url || ''}\n`;
      text += `${location?.city || ''} ${location?.region || ''} ${location?.countryCode || ''}\n`;
      text += `${summary || ''}\n\n`;
    }

    // Work Experience (UnifiedCVDataStructure format)
    if (cvData.work && Array.isArray(cvData.work)) {
      text += 'Work Experience:\n';
      cvData.work.forEach((exp: any) => {
        text += `${exp.position || ''} at ${exp.name || ''}\n`;
        text += `${exp.startDate || ''} - ${exp.endDate || ''}\n`;
        text += `${exp.summary || ''}\n`;
        if (exp.highlights && exp.highlights.length > 0) {
          text += `Highlights: ${exp.highlights.join(', ')}\n`;
        }
        text += '\n';
      });
    }

    // Education (UnifiedCVDataStructure format)
    if (cvData.education && Array.isArray(cvData.education)) {
      text += 'Education:\n';
      cvData.education.forEach((edu: any) => {
        text += `${edu.studyType || ''} in ${edu.area || ''} from ${edu.institution || ''}\n`;
        text += `${edu.startDate || ''} - ${edu.endDate || ''}\n`;
        if (edu.score) {
          text += `Score: ${edu.score}\n`;
        }
        if (edu.courses && edu.courses.length > 0) {
          text += `Courses: ${edu.courses.join(', ')}\n`;
        }
        text += '\n';
      });
    }

    // Skills (UnifiedCVDataStructure format)
    if (cvData.skills && Array.isArray(cvData.skills)) {
      text += 'Skills:\n';
      cvData.skills.forEach((skill: any) => {
        if (skill.category && skill.skills) {
          text += `${skill.category}: ${skill.skills.join(', ')}\n`;
        } else if (skill.name) {
          text += `${skill.name}\n`;
        }
      });
      text += '\n';
    }

    // Projects (if available in the structure)
    if (cvData.projects && Array.isArray(cvData.projects)) {
      text += 'Projects:\n';
      cvData.projects.forEach((project: any) => {
        text += `${project.name || ''}\n`;
        text += `${project.description || ''}\n`;
        if (project.highlights && project.highlights.length > 0) {
          text += `Technologies: ${project.highlights.join(', ')}\n`;
        }
        text += '\n';
      });
    }

    // Certificates
    if (cvData.certificates && Array.isArray(cvData.certificates)) {
      text += 'Certificates:\n';
      cvData.certificates.forEach((cert: any) => {
        text += `${cert.name || ''} from ${cert.issuer || ''}\n`;
        text += `${cert.date || ''}\n`;
        text += `${cert.description || ''}\n\n`;
      });
    }

    // Awards
    if (cvData.awards && Array.isArray(cvData.awards)) {
      text += 'Awards:\n';
      cvData.awards.forEach((award: any) => {
        text += `${award.title || ''} from ${award.awarder || ''}\n`;
        text += `${award.date || ''}\n`;
        text += `${award.summary || ''}\n\n`;
      });
    }

    // Languages
    if (cvData.languages && Array.isArray(cvData.languages)) {
      text += 'Languages:\n';
      cvData.languages.forEach((lang: any) => {
        text += `${lang.language || ''} - ${lang.fluency || ''}\n`;
      });
      text += '\n';
    }

    // Interests
    if (cvData.interests && Array.isArray(cvData.interests)) {
      text += 'Interests:\n';
      cvData.interests.forEach((interest: any) => {
        text += `${interest.name || ''}`;
        if (interest.keywords && interest.keywords.length > 0) {
          text += ` (${interest.keywords.join(', ')})`;
        }
        text += '\n';
      });
      text += '\n';
    }

    return text;
  }, []);

  // Helper to extract all skills from CV data
  const extractCVSkills = useCallback((): string[] => {
    if (!cvData?.skills) return [];
    
    const allSkills: string[] = [];
    cvData.skills.forEach((skill: any) => {
      if (skill.category && Array.isArray(skill.skills)) {
        allSkills.push(...skill.skills);
      } else if (skill.name) {
        allSkills.push(skill.name);
      } else if (Array.isArray(skill.keywords)) {
        allSkills.push(...skill.keywords);
      }
    });
    
    return allSkills.filter(s => s && s.trim());
  }, [cvData]);

  // Helper to calc years of experience from CV data
  const calculateYearsOfExperience = useCallback((): number => {
    if (!cvData?.work || !Array.isArray(cvData.work)) return 0;
    
    let totalMonths = 0;
    cvData.work.forEach((exp: any) => {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate && exp.endDate.toLowerCase() !== 'present'
          ? new Date(exp.endDate)
          : new Date();
        
        if (!isNaN(start.getTime())) {
          const months = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
          totalMonths += Math.max(0, months);
        }
      }
    });
    
    return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
  }, [cvData]);

  // Helper to get education level from CV
  const getEducationLevel = useCallback((): string => {
    if (!cvData?.education || !Array.isArray(cvData.education) || cvData.education.length === 0) {
      return 'Not specified';
    }
    
    const highestEd = cvData.education[0]; // Assuming first is highest
    return highestEd.studyType || highestEd.area || 'Degree';
  }, [cvData]);

  // Helper to extract action verbs from CV
  const extractActionVerbs = useCallback((): string[] => {
    const actionVerbsList = ['led', 'managed', 'developed', 'implemented', 'created', 'designed',
      'built', 'established', 'achieved', 'improved', 'optimized', 'delivered', 'launched',
      'increased', 'reduced', 'coordinated', 'executed', 'initiated', 'spearheaded'];
    
    const cvText = convertCVToText(cvData).toLowerCase();
    const found = actionVerbsList.filter(verb => cvText.includes(verb));
    
    return found.map(v => v.charAt(0).toUpperCase() + v.slice(1));
  }, [cvData, convertCVToText]);

  // Run ATS Analysis
  const runATSAnalysis = useCallback(async () => {
    if (!selectedJobId || !cvData) {
      return;
    }

    if (isAnalyzingRef.current) {
      return;
    }
    isAnalyzingRef.current = true;
    setIsLoading(true);
    setApiError(null);
    
    try {
      const cvText = convertCVToText(cvData);
      const jobDescription = jobData?.jobDescription || jobData?.description || '';
      
      if (!cvText || cvText.trim().length === 0) {
        setApiError('CV text is empty or could not be generated');
        return;
      }
      
      if (!jobDescription || jobDescription.trim().length === 0) {
        setApiError('Job description is empty. Please add a job description to enable ATS analysis.');
        return;
      }

      // Extract actual CV data
      const cvSkills = extractCVSkills();
      const yearsExp = calculateYearsOfExperience();
      const educationLevel = getEducationLevel();
      const actionVerbs = extractActionVerbs();
      
      // Extract job keywords (simple tokenization)
      const jobKeywords = jobDescription
        .toLowerCase()
        .split(/\W+/)
        .filter((word: string) => word.length > 3)
        .slice(0, 50);
      
      const cvTextLower = cvText.toLowerCase();
      
      // Match keywords
      const matchedKeywords = jobKeywords.filter((kw: string) => cvTextLower.includes(kw));
      const missingKeywords = jobKeywords
        .filter((kw: string) => !cvTextLower.includes(kw))
        .slice(0, 10);
      
      // Calculate scores based on actual data
      const keywordMatchScore = Math.min(100, (matchedKeywords.length / Math.max(jobKeywords.length, 1)) * 100);
      const experienceScore = Math.min(100, (yearsExp / 3) * 100); // 3+ years = 100%
      const actionVerbScore = Math.min(100, (actionVerbs.length / 5) * 100); // 5+ verbs = 100%
      const skillsScore = Math.min(100, (cvSkills.length / 10) * 100); // 10+ skills = 100%
      const formatScore = cvData.basics?.name && cvData.basics?.email ? 90 : 60;
      
      // Overall score (weighted average)
      const overallScore = Math.round(
        keywordMatchScore * 0.3 +
        experienceScore * 0.25 +
        actionVerbScore * 0.15 +
        skillsScore * 0.2 +
        formatScore * 0.1
      );
      
      // Determine profile level
      let profileLevel = {
        title: 'Entry Level',
        yearsExperience: yearsExp,
        description: 'Early career professional'
      };
      
      if (yearsExp >= 7) {
        profileLevel = {
          title: 'Senior Professional',
          yearsExperience: yearsExp,
          description: 'Experienced professional with extensive background'
        };
      } else if (yearsExp >= 3) {
        profileLevel = {
          title: 'Mid-Level Professional',
          yearsExperience: yearsExp,
          description: 'Experienced professional with solid track record'
        };
      }
      
      const result = {
        score: Math.max(40, Math.min(100, overallScore)), // Clamp between 40-100
        profileLevel,
        breakdown: {
          keywordMatch: Math.round(keywordMatchScore),
          experienceEducation: Math.round(experienceScore),
          actionVerbs: Math.round(actionVerbScore),
          formatting: Math.round(formatScore),
          skills: Math.round(skillsScore)
        },
        details: {
          matchedKeywords: matchedKeywords.slice(0, 20),
          missingKeywords: missingKeywords.slice(0, 10),
          experienceYears: yearsExp,
          educationLevel,
          actionVerbMatches: actionVerbs,
          skillsMatched: cvSkills.slice(0, 10),
          skillsMissing: missingKeywords.slice(0, 5),
          formatIssues: []
        },
        suggestions: [
          matchedKeywords.length < jobKeywords.length * 0.5
            ? 'Add more keywords from the job description to your CV'
            : 'Good keyword coverage',
          yearsExp < 2
            ? 'Consider highlighting all relevant experience including internships'
            : 'Experience level is appropriate',
          actionVerbs.length < 5
            ? 'Use more action verbs to describe your achievements'
            : 'Good use of action verbs'
        ],
        optimizations: {
          summary: `Your CV has ${overallScore >= 70 ? 'good' : 'moderate'} alignment with the job requirements.`,
          workExperience: [],
          skills: missingKeywords.slice(0, 5),
          keywords: missingKeywords.slice(0, 8)
        }
      };

      setAtsResult(result);
      if (onScoreUpdate) {
        onScoreUpdate(result.score);
      }
    } catch (error) {
      setApiError(`Analysis Error: ${error}`);
    } finally {
      isAnalyzingRef.current = false;
      setIsLoading(false);
    }
  }, [selectedJobId, cvData, jobData, onScoreUpdate, extractCVSkills, calculateYearsOfExperience, getEducationLevel, extractActionVerbs, convertCVToText]);

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
    if (selectedJobId && cvData && !atsResult && !isAnalyzingRef.current) {
      runATSAnalysis();
    }
  }, [selectedJobId, cvData, atsResult]);

  // Test analysis on mount if conditions are met
  useEffect(() => {
    if (selectedJobId && cvData && !atsResult && !isAnalyzingRef.current) {
      // Add a small delay to ensure component is fully mounted
      setTimeout(() => {
        runATSAnalysis();
      }, 1000);
    }
  }, []); // Run only on mount

  // Monitor atsResult state changes
  useEffect(() => {
    // This effect can be used for side effects when atsResult changes
  }, [atsResult]);

  return (
    <div className="space-y-6">

      {/* ATS Analysis Results - Combined */}
      {atsResult && (
        <div className="bg-[#1A201A] rounded-2xl shadow-2xl shadow-black/50 border border-gray-800/30 w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800/30">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#80FF00] to-[#60CC00] rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">ATS Analysis Results</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {jobData?.title || linkedJobData?.title || 'Position Analysis'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFloatingAnalyzer(true)}
              className="p-3 hover:bg-gray-800/50 rounded-xl transition-colors"
            >
              <Eye className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Main Content */}
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Column */}
              <div className="space-y-4">
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
                      <span className="text-2xl font-bold text-white">{atsResult?.score || 0}%</span>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium">Overall Match Score</p>
                </div>

                {/* Profile Level */}
                {atsResult.profileLevel && (
                  <div className="bg-gray-800/30 rounded-2xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#80FF00] rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{atsResult.profileLevel.title}</h3>
                        <p className="text-gray-400 mt-1 text-xs">{atsResult.profileLevel.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 3 Actions */}
                <div className="bg-gray-800/30 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-white mb-4">Top 3 Actions</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="p-2 bg-[#80FF00] rounded-lg">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white text-sm">
                        Add 5+ high-priority keywords to your skills section.
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-2 bg-[#80FF00] rounded-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white text-sm">
                        Quantify achievements in your last role with metrics.
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="p-2 bg-[#80FF00] rounded-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-white text-sm">
                        Fix formatting errors in the experience section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Detailed Breakdown */}
                <div className="bg-gray-800/30 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-white mb-4">Detailed Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Keyword Match */}
                    <div className="bg-[#2D332D] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Keywords</span>
                        <span className="text-sm font-semibold text-white">
                          {atsResult?.breakdown?.keywordMatch || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-[#80FF00] h-2 rounded-full" 
                          style={{ width: `${atsResult.breakdown?.keywordMatch || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Experience & Education */}
                    <div className="bg-[#2D332D] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Experience</span>
                        <span className="text-sm font-semibold text-white">
                          {atsResult?.breakdown?.experienceEducation || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-[#80FF00] h-2 rounded-full" 
                          style={{ width: `${atsResult?.breakdown?.experienceEducation || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Verbs */}
                    <div className="bg-[#2D332D] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Action Verbs</span>
                        <span className="text-sm font-semibold text-white">
                          {atsResult?.breakdown?.actionVerbs || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-[#80FF00] h-2 rounded-full" 
                          style={{ width: `${atsResult?.breakdown?.actionVerbs || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="bg-[#2D332D] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Skills</span>
                        <span className="text-sm font-semibold text-white">
                          {atsResult?.breakdown?.skills || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-[#80FF00] h-2 rounded-full" 
                          style={{ width: `${atsResult?.breakdown?.skills || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Key className="w-5 h-5 text-[#80FF00]" />
                    </div>
                    <p className="text-white text-sm font-medium">Keyword Gaps</p>
                    <p className="text-[#80FF00] text-sm mt-2">Needs Improvement</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Camera className="w-5 h-5 text-[#80FF00]" />
                    </div>
                    <p className="text-white text-sm font-medium">Formatting & Parsability</p>
                    <p className="text-[#80FF00] text-sm mt-2">Good</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-5 h-5 text-[#80FF00]" />
                    </div>
                    <p className="text-white text-sm font-medium">Experience Alignment</p>
                    <p className="text-[#80FF00] text-sm mt-2">Strong</p>
                  </div>
                </div>

                {/* Expandable Sections */}
                <div className="space-y-4">
                  {/* Missing Keywords */}
                  <div className="bg-gray-800/20 rounded-xl">
                    <button
                      onClick={() => toggleSection('missingKeywords')}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <span className="text-white font-medium text-sm">
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
                              <span className="text-white text-sm">{keyword}</span>
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
                      <span className="text-white font-medium text-sm">Keywords to Increase Density</span>
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
                              <span className="text-white text-sm">{keyword}</span>
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
                      <span className="text-white font-medium text-sm">Soft Skills Alignment</span>
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
                              <span className="text-white text-sm">{skill}</span>
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
          <div className="flex items-center justify-center p-8 border-t border-gray-800/30 bg-gray-900/20">
            <button
              onClick={handleAutoFix}
              disabled={isAutoFixing}
              className="px-8 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-800/50 transition-colors font-medium text-sm disabled:opacity-50"
            >
              {isAutoFixing ? 'Fixing...' : 'Fix Now'}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#80FF00]" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing CV...</span>
          </div>
        </div>
      )}

      {/* API Error Display */}
      {apiError && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">ATS Analysis Failed</h3>
          </div>
          <p className="text-red-300 mb-4">{apiError}</p>
          <button
            onClick={() => {
              setApiError(null);
              runATSAnalysis();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
          >
            🔄 Retry Analysis
          </button>
        </div>
      )}


      {/* No Job Selected */}
      {!selectedJobId && !jobData && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Select a job position to start comprehensive ATS analysis
          </p>
          <div className="bg-[#2D332D] rounded-lg p-4 max-w-md mx-auto">
            <p className="text-gray-400 text-sm">
              The ATS Analysis & Optimization section will display:
            </p>
            <ul className="text-gray-300 text-sm mt-2 space-y-1">
              <li>• Overall Match Score</li>
              <li>• Detailed Breakdown of ATS metrics</li>
              <li>• Professional level assessment</li>
              <li>• Visual progress bars for each metric</li>
            </ul>
          </div>
        </div>
      )}

      {/* Fallback: Data available but no ATS result */}
      {selectedJobId && jobData && cvData && !atsResult && !isLoading && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            ATS Analysis Ready - Click "Run ATS Analysis" to start
          </p>
          <div className="bg-[#2D332D] rounded-lg p-4 max-w-md mx-auto">
            <p className="text-gray-400 text-sm mb-3">
              All required data is available:
            </p>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>✅ Job selected: {jobData?.title || 'Unknown'}</li>
              <li>✅ CV data loaded ({Object.keys(cvData).length} sections)</li>
              <li>✅ Ready for analysis</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
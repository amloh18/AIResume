'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Plus,
  Minus,
  ExternalLink
} from 'lucide-react';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import JobSelector from './JobSelector';
import { useJobJourney } from '@/contexts/JobJourneyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

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

export default function EnhancedComprehensiveATSAnalyzer({ 
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
  const [isDetailedAnalysisOpen, setIsDetailedAnalysisOpen] = useState(false);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<any>(null);

  // Load linked job from journey
  useEffect(() => {
    const loadLinkedJob = async () => {
      if (journeyState.currentJobId && journeyState.currentJobId !== selectedJobId) {
        try {
          const response = await fetch(`/api/jobs/${journeyState.currentJobId}?userId=${userId}`);
          if (response.ok) {
            const result = await response.json();
            setLinkedJobData(result.job || result.data?.job);
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

  // Use the actual job data from props or linked job
  const currentJobData = jobData || linkedJobData;

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
      cvText += 'Education:\n';
      cvData.education.forEach((edu: any) => {
        if (edu.institution) cvText += `Institution: ${edu.institution}\n`;
        if (edu.studyType) cvText += `Degree: ${edu.studyType}\n`;
        if (edu.area) cvText += `Field: ${edu.area}\n`;
        cvText += '\n';
      });
    }
    
    return cvText;
  }, [cvData]);

  const calculateComprehensiveATSScore = useCallback(async () => {
    if (!cvData || !currentJobData) {
      return;
    }
    
    setIsLoading(true);
    try {
      const cvText = getCVText();
      const jobDescription = currentJobData.description || currentJobData.jobDescription || currentJobData.requirements || currentJobData.jobRequirements || '';
      
        hasCvText: !!cvText,
        hasJobDescription: !!jobDescription,
        currentJobData: currentJobData
      });
      
      if (!cvText) {
        console.error('🔍 Comprehensive ATS Analyzer - Missing CV text');
        throw new Error('CV text is required for ATS analysis');
      }
      
      // Create a basic job description if none is provided
      let finalJobDescription = jobDescription;
      if (!jobDescription) {
        const jobTitle = currentJobData.title || currentJobData.jobTitle || 'Software Engineer';
        const company = currentJobData.company || 'Technology Company';
        finalJobDescription = `${jobTitle} position at ${company}. This role requires relevant experience and skills in the field.`;
      }
      
      const requestBody = {
        cvText,
        jobDescription: finalJobDescription,
        cvData,
        jobData: currentJobData,
        cvId,
        comprehensive: true
      };
      
      
      // Try the new enhanced ATS analysis API first
      let response = await fetch('/api/ai/comprehensive-ats-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData,
          jobData: currentJobData
        })
      });

      // If the new API fails, fall back to the legacy API
      if (!response.ok) {
        response = await fetch('/api/ats/comprehensive-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      }
      
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🔍 Comprehensive ATS Analyzer - API error:', errorData);
        throw new Error(errorData.error || 'Failed to calculate ATS score');
      }
      
      const result: ATSResult = await response.json();
      setAtsResult(result);
      
      // Update parent component
      if (onScoreUpdate) {
        onScoreUpdate(result.score);
      }
      
    } catch (error) {
      console.error('🔍 Comprehensive ATS Analyzer - Error:', error);
      setAtsResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [cvData, currentJobData, getCVText, cvId, onScoreUpdate]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 75) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 50) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <X className="h-4 w-4 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'Needs Improvement';
  };

  const generateActionableGuidance = () => {
    if (!atsResult) return [];
    
    const guidance = [];
    
    // Keyword Match guidance
    if (atsResult.breakdown.keywordMatch < 60) {
      guidance.push({
        category: 'Skill Gaps',
        diagnosis: 'Your Keyword Match is low.',
        guidance: 'Go to the "Work Experience" and "Skills" sections to optimize your content with keywords from the job description.',
        action: 'Navigate to Skills section',
        icon: <Target className="h-4 w-4" />
      });
    }
    
    // Action Verbs guidance
    if (atsResult.breakdown.actionVerbs < 60) {
      guidance.push({
        category: 'Content Quality',
        diagnosis: 'Your Action Verb score is low.',
        guidance: 'Navigate to the "Work Experience" section and click "AI Generate" to rewrite your descriptions with stronger action verbs.',
        action: 'Navigate to Work Experience section',
        icon: <Zap className="h-4 w-4" />
      });
    }
    
    // Experience guidance
    if (atsResult.breakdown.experienceEducation < 60) {
      guidance.push({
        category: 'Experience Recommendations',
        diagnosis: 'Your experience alignment could be improved.',
        guidance: 'Consider highlighting transferable skills or adding relevant projects to demonstrate your capabilities.',
        action: 'Add relevant projects',
        icon: <FileText className="h-4 w-4" />
      });
    }
    
    // Skills guidance
    if (atsResult.breakdown.skills < 60) {
      guidance.push({
        category: 'Skill Gaps',
        diagnosis: 'Your skills match could be stronger.',
        guidance: 'Add missing skills from the job description to your Skills section.',
        action: 'Update Skills section',
        icon: <BarChart3 className="h-4 w-4" />
      });
    }
    
    return guidance;
  };

  const handleOptimize = async () => {
    if (!atsResult) return;
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    try {
      // Simulate optimization progress
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      
      // Show preview after optimization
      setTimeout(() => {
        setShowPreview(true);
        setPreviewChanges({
          summary: atsResult.optimizations?.summary || 'AI-optimized summary with better keyword integration',
          workExperience: atsResult.optimizations?.workExperience || [],
          skills: atsResult.optimizations?.skills || [],
          keywords: atsResult.optimizations?.keywords || []
        });
        setIsOptimizing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Optimization error:', error);
      setIsOptimizing(false);
    }
  };

  const applyOptimizations = () => {
    if (!previewChanges || !onUpdateField) return;
    
    // Apply summary optimization
    if (previewChanges.summary) {
      onUpdateField('basics.summary', previewChanges.summary);
    }
    
    // Apply work experience optimizations
    if (previewChanges.workExperience && Array.isArray(previewChanges.workExperience)) {
      previewChanges.workExperience.forEach((work: any) => {
        if (work.index !== undefined && work.optimizedText) {
          onUpdateField(`work.${work.index}.summary`, work.optimizedText);
        }
      });
    }
    
    // Apply skills optimizations
    if (previewChanges.skills && Array.isArray(previewChanges.skills)) {
      onUpdateField('skills', previewChanges.skills);
    }
    
    setShowPreview(false);
    setPreviewChanges(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Job Selector */}
      <JobSelector
        selectedJobId={selectedJobId}
        onJobSelection={onJobSelection}
        userId={userId}
        linkedJobData={currentJobData}
      />

      {/* Main Analysis Card */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">ATS Compatibility Analyzer</CardTitle>
            </div>
            <Button
              onClick={calculateComprehensiveATSScore}
              disabled={isLoading || !cvData || !currentJobData}
              variant="outline"
              size="sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze CV
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            Get detailed insights and actionable recommendations to improve your CV's ATS compatibility
          </CardDescription>
        </CardHeader>

        {atsResult && (
          <CardContent className="space-y-6">
            {/* Primary Score Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="text-5xl font-bold">
                <span className={getScoreColor(atsResult.score)}>{atsResult.score}%</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge variant={getScoreBadgeVariant(atsResult.score)} className="text-lg px-4 py-2">
                  {getScoreLabel(atsResult.score)}
                </Badge>
                {getScoreIcon(atsResult.score)}
              </div>
            </motion.div>

            {/* Collapsible Detailed Analysis */}
            <Collapsible open={isDetailedAnalysisOpen} onOpenChange={setIsDetailedAnalysisOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <span className="text-sm font-medium">Detailed Analysis</span>
                  {isDetailedAnalysisOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Keyword Match */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getScoreIcon(atsResult.breakdown.keywordMatch)}
                        <span className="text-sm font-medium">Keyword Match</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(atsResult.breakdown.keywordMatch)}`}>
                        {atsResult.breakdown.keywordMatch}%
                      </span>
                    </div>
                    <Progress value={atsResult.breakdown.keywordMatch} className="h-2" />
                  </div>

                  {/* Experience & Education */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getScoreIcon(atsResult.breakdown.experienceEducation)}
                        <span className="text-sm font-medium">Experience & Education</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(atsResult.breakdown.experienceEducation)}`}>
                        {atsResult.breakdown.experienceEducation}%
                      </span>
                    </div>
                    <Progress value={atsResult.breakdown.experienceEducation} className="h-2" />
                  </div>

                  {/* Action Verbs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getScoreIcon(atsResult.breakdown.actionVerbs)}
                        <span className="text-sm font-medium">Action Verbs</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(atsResult.breakdown.actionVerbs)}`}>
                        {atsResult.breakdown.actionVerbs}%
                      </span>
                    </div>
                    <Progress value={atsResult.breakdown.actionVerbs} className="h-2" />
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getScoreIcon(atsResult.breakdown.skills)}
                        <span className="text-sm font-medium">Skills Match</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(atsResult.breakdown.skills)}`}>
                        {atsResult.breakdown.skills}%
                      </span>
                    </div>
                    <Progress value={atsResult.breakdown.skills} className="h-2" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tabs for Analysis, Auto-Fix, and Preview */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="optimization" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Auto-Fix
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {/* Analysis Tab */}
              <TabsContent value="analysis" className="space-y-6">
                {/* Interactive Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Matched Keywords */}
                  {atsResult.details.matchedKeywords.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-green-700 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Matched Keywords ({atsResult.details.matchedKeywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {atsResult.details.matchedKeywords.slice(0, 10).map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer transition-colors"
                            onMouseEnter={() => setHoveredKeyword(keyword)}
                            onMouseLeave={() => setHoveredKeyword(null)}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      {hoveredKeyword && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          Found in your CV: {hoveredKeyword}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Missing Keywords */}
                  {atsResult.details.missingKeywords.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-red-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Missing Keywords ({atsResult.details.missingKeywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {atsResult.details.missingKeywords.slice(0, 10).map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="destructive"
                            className="hover:bg-red-600 cursor-pointer transition-colors"
                            onMouseEnter={() => setHoveredKeyword(keyword)}
                            onMouseLeave={() => setHoveredKeyword(null)}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      {hoveredKeyword && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          Add to Skills or Work Experience sections
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actionable Guidance Panel */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Actionable Steps to Boost Your Score</h3>
                  </div>
                  <div className="space-y-3">
                    {generateActionableGuidance().map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100"
                      >
                        <div className="text-blue-600 mt-0.5">{item.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.diagnosis}</div>
                          <div className="text-sm text-gray-600 mt-1">{item.guidance}</div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            {item.action}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Auto-Fix Tab */}
              <TabsContent value="optimization" className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Wand2 className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold">AI-Powered Optimization</h3>
                  </div>
                  <p className="text-gray-600">
                    Let AI analyze and optimize your CV content for better ATS compatibility
                  </p>
                  
                  {!isOptimizing && !showPreview && (
                    <Button
                      onClick={handleOptimize}
                      disabled={!atsResult}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start AI Optimization
                    </Button>
                  )}

                  {isOptimizing && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">Optimizing your CV...</div>
                      <Progress value={optimizationProgress} className="w-full" />
                      <div className="text-xs text-gray-500">{optimizationProgress}% complete</div>
                    </div>
                  )}

                  {showPreview && previewChanges && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="text-sm font-medium text-green-600">
                        ✓ Optimization complete! Review the changes below:
                      </div>
                      
                      <div className="space-y-3 text-left">
                        {previewChanges.summary && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium mb-2">Summary Optimization:</div>
                            <div className="text-sm text-gray-600">{previewChanges.summary}</div>
                          </div>
                        )}
                        
                        {previewChanges.workExperience && previewChanges.workExperience.length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium mb-2">Work Experience Enhancements:</div>
                            <div className="text-sm text-gray-600">
                              {previewChanges.workExperience.length} job description(s) will be enhanced
                            </div>
                          </div>
                        )}
                        
                        {previewChanges.skills && previewChanges.skills.length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium mb-2">Skills Optimization:</div>
                            <div className="text-sm text-gray-600">
                              {previewChanges.skills.length} skill(s) will be added/optimized
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={applyOptimizations}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Apply Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowPreview(false)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="h-6 w-6 text-blue-600" />
                    <h3 className="text-lg font-semibold">CV Preview</h3>
                  </div>
                  <p className="text-gray-600">
                    Preview how your CV will appear to ATS systems
                  </p>
                  
                  <div className="bg-gray-50 border rounded-lg p-4 text-left">
                    <div className="text-sm font-medium mb-2">Current CV Content:</div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {getCVText().substring(0, 500)}
                      {getCVText().length > 500 && '...'}
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full CV Preview
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}

        {!atsResult && !isLoading && (
          <CardContent>
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
              <p className="text-gray-600 mb-4">
                Select a job and click "Analyze CV" to get detailed ATS insights and recommendations
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  BarChart3,
  Lightbulb,
  Copy,
  Wand2
} from 'lucide-react';

interface ATSResult {
  score: number;
  breakdown: {
    keywordMatch: number;
    experienceEducation: number;
    actionVerbs: number;
  };
  details: {
    matchedKeywords: string[];
    missingKeywords: string[];
    experienceYears: number;
    educationLevel: string;
    actionVerbMatches: string[];
  };
  suggestions: string[];
}

interface ATSScoreAnalyzerProps {
  cvData: any;
  jobData: any;
  onScoreUpdate?: (score: number) => void;
  onRestructure?: (restructuredContent: string) => void;
  onUpdateField?: (path: string, value: any) => void;
}

export default function ATSScoreAnalyzer({ 
  cvData, 
  jobData, 
  onScoreUpdate,
  onRestructure,
  onUpdateField
}: ATSScoreAnalyzerProps) {
  const [atsResult, setAtsResult] = useState<ATSResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [restructuredContent, setRestructuredContent] = useState<string>('');
  const [isFormFilling, setIsFormFilling] = useState(false);
  const [formFillResult, setFormFillResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'score' | 'breakdown' | 'suggestions' | 'restructure' | 'form-fill'>('score');

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
      });
    }
    
    return cvText;
  }, [cvData]);

  const calculateATSScore = useCallback(async () => {
    if (!cvData || !jobData) {
      console.log('🔍 ATS Analyzer - Missing data:', { hasCvData: !!cvData, hasJobData: !!jobData });
      return;
    }
    
    setIsLoading(true);
    try {
      const cvText = getCVText();
      const jobDescription = jobData.description || jobData.jobDescription || jobData.requirements || jobData.jobRequirements || '';
      
      console.log('🔍 ATS Analyzer - Request data:', {
        cvTextLength: cvText.length,
        jobDescriptionLength: jobDescription.length,
        hasCvText: !!cvText,
        hasJobDescription: !!jobDescription
      });
      
      if (!cvText) {
        console.error('🔍 ATS Analyzer - Missing CV text');
        throw new Error('CV text is required for ATS analysis');
      }
      
      // Create a basic job description if none is provided
      let finalJobDescription = jobDescription;
      if (!jobDescription) {
        const jobTitle = jobData.title || jobData.jobTitle || 'Software Engineer';
        const company = jobData.company || 'Technology Company';
        finalJobDescription = `${jobTitle} position at ${company}. This role requires relevant experience and skills in the field.`;
        console.log('🔍 ATS Analyzer - Created fallback job description:', finalJobDescription);
      }
      
      const requestBody = {
        cvText,
        jobDescription: finalJobDescription,
        cvData
      };
      
      console.log('🔍 ATS Analyzer - Sending request to API');
      
      const response = await fetch('/api/ats/calculate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('🔍 ATS Analyzer - Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🔍 ATS Analyzer - API error:', errorData);
        throw new Error(errorData.error || 'Failed to calculate ATS score');
      }
      
      const result: ATSResult = await response.json();
      console.log('🔍 ATS Analyzer - Success:', result);
      setAtsResult(result);
      
      // Update parent component
      if (onScoreUpdate) {
        onScoreUpdate(result.score);
      }
      
    } catch (error) {
      console.error('🔍 ATS Analyzer - Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Set a default result to prevent UI issues
      setAtsResult({
        score: 0,
        breakdown: { keywordMatch: 0, experienceEducation: 0, actionVerbs: 0 },
        details: { matchedKeywords: [], missingKeywords: [], experienceYears: 0, educationLevel: 'Not specified', actionVerbMatches: [] },
        suggestions: [`Unable to calculate ATS score: ${errorMessage}. Please try again or contact support if the issue persists.`]
      });
    } finally {
      setIsLoading(false);
    }
  }, [cvData, jobData, getCVText, onScoreUpdate]);

  const restructureCV = useCallback(async (section: 'summary' | 'experience' | 'skills' | 'all') => {
    if (!cvData || !jobData) return;
    
    setIsRestructuring(true);
    try {
      const cvText = getCVText();
      const jobDescription = jobData.description || jobData.jobDescription || jobData.requirements || jobData.jobRequirements || '';
      
      // Create a basic job description if none is provided
      let finalJobDescription = jobDescription;
      if (!jobDescription) {
        const jobTitle = jobData.title || jobData.jobTitle || 'Software Engineer';
        const company = jobData.company || 'Technology Company';
        finalJobDescription = `${jobTitle} position at ${company}. This role requires relevant experience and skills in the field.`;
      }
      
      const response = await fetch('/api/ai/restructure-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvContent: cvText,
          jobDescription: finalJobDescription,
          section
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to restructure CV');
      }
      
      const result = await response.json();
      setRestructuredContent(result.restructuredContent);
      
      // Update parent component
      if (onRestructure) {
        onRestructure(result.restructuredContent);
      }
      
    } catch (error) {
      console.error('CV restructuring error:', error);
    } finally {
      setIsRestructuring(false);
    }
  }, [cvData, jobData, getCVText, onRestructure]);

  const fillForm = useCallback(async (section: 'basics' | 'work' | 'skills' | 'summary' | 'all') => {
    if (!cvData || !jobData) return;
    
    setIsFormFilling(true);
    try {
      const response = await fetch('/api/ai/fill-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData,
          jobData,
          section
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fill form');
      }
      
      const result = await response.json();
      setFormFillResult(result);
      
      // Update parent component with filled data
      if (onRestructure) {
        // Apply the filled data to the form
        applyFilledData(result.filledData);
      }
      
    } catch (error) {
      console.error('Form fill error:', error);
    } finally {
      setIsFormFilling(false);
    }
  }, [cvData, jobData, onRestructure]);

  const applyFilledData = (filledData: any) => {
    if (!onUpdateField) return;
    
    // Apply filled data to the form fields
    if (filledData.basics) {
      Object.keys(filledData.basics).forEach(key => {
        if (filledData.basics[key] !== undefined && filledData.basics[key] !== null) {
          onUpdateField(`basics.${key}`, filledData.basics[key]);
        }
      });
    }
    
    if (filledData.skills) {
      // Replace skills with filled skills
      onUpdateField('skills', filledData.skills);
    }
    
    if (filledData.work) {
      // Replace work experience with filled work
      onUpdateField('work', filledData.work);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Target className="w-6 h-6 text-lime-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ATS Score Analyzer
          </h3>
        </div>
        <button
          onClick={calculateATSScore}
          disabled={isLoading || !cvData || !jobData}
          className="flex items-center space-x-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          <span>{isLoading ? 'Analyzing...' : 'Analyze ATS Score'}</span>
        </button>
      </div>

      {atsResult && (
        <div className="space-y-6">
          {/* Score Display */}
          <div className="bg-gradient-to-r from-lime-50 to-green-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getScoreIcon(atsResult.score)}
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ATS Compatibility Score
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(atsResult.score)}`}>
                {atsResult.score}% Match
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-4">
              <motion.div
                className="bg-gradient-to-r from-lime-500 to-green-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${atsResult.score}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {atsResult.score >= 80 
                ? "Excellent match! Your CV is well-optimized for this position."
                : atsResult.score >= 60
                ? "Good match with room for improvement."
                : "Consider optimizing your CV to better match the job requirements."
              }
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8">
              {[
                { id: 'score', label: 'Score', icon: TrendingUp },
                { id: 'breakdown', label: 'Breakdown', icon: BarChart3 },
                { id: 'suggestions', label: 'Suggestions', icon: Lightbulb },
                { id: 'restructure', label: 'AI Restructure', icon: Sparkles },
                { id: 'form-fill', label: 'Form Fill', icon: Copy }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === 'score' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keywords</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {atsResult.breakdown.keywordMatch}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {atsResult.details.matchedKeywords.length} matched, {atsResult.details.missingKeywords.length} missing
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Experience</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {atsResult.breakdown.experienceEducation}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {atsResult.details.experienceYears} years, {atsResult.details.educationLevel}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Action Verbs</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {atsResult.breakdown.actionVerbs}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {atsResult.details.actionVerbMatches.length} matches found
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="space-y-6">
                {/* Matched Keywords */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Matched Keywords ({atsResult.details.matchedKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.details.matchedKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Missing Keywords ({atsResult.details.missingKeywords.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.details.missingKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Verbs */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Action Verb Matches ({atsResult.details.actionVerbMatches.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {atsResult.details.actionVerbMatches.map((verb, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                      >
                        {verb}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Improvement Suggestions
                </h4>
                <div className="space-y-3">
                  {atsResult.suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                    >
                      <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {suggestion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'restructure' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    AI-Powered CV Restructuring
                  </h4>
                  <div className="flex space-x-2">
                    {['summary', 'experience', 'skills', 'all'].map((section) => (
                      <button
                        key={section}
                        onClick={() => restructureCV(section as any)}
                        disabled={isRestructuring}
                        className="px-3 py-1 text-xs bg-lime-100 text-lime-800 rounded-full hover:bg-lime-200 disabled:opacity-50"
                      >
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {isRestructuring && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-lime-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Restructuring CV content...
                    </span>
                  </div>
                )}

                {restructuredContent && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        Restructured Content
                      </h5>
                      <button
                        onClick={() => copyToClipboard(restructuredContent)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {restructuredContent}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'form-fill' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    One-Click Form Filling
                  </h4>
                  <div className="flex space-x-2">
                    {['basics', 'summary', 'skills', 'work', 'all'].map((section) => (
                      <button
                        key={section}
                        onClick={() => fillForm(section as any)}
                        disabled={isFormFilling}
                        className="px-3 py-1 text-xs bg-lime-100 text-lime-800 rounded-full hover:bg-lime-200 disabled:opacity-50"
                      >
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {isFormFilling && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-lime-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Filling form with job-specific content...
                    </span>
                  </div>
                )}

                {formFillResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                        Form Fill Results
                      </h5>
                      <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        ✓ Applied to Form
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {formFillResult.suggestions.map((suggestion: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {suggestion}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    How it works:
                  </h5>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• <strong>Basics:</strong> Fills personal information and enhances summary</li>
                    <li>• <strong>Summary:</strong> Creates or enhances professional summary</li>
                    <li>• <strong>Skills:</strong> Adds relevant skills from job description</li>
                    <li>• <strong>Work:</strong> Enhances work experience descriptions</li>
                    <li>• <strong>All:</strong> Applies all optimizations at once</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!atsResult && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Click "Analyze ATS Score" to get started
          </p>
        </div>
      )}
    </div>
  );
}

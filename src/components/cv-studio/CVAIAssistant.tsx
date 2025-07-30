'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  X,
  ArrowRight,
  Copy,
  RefreshCw,
  Star,
  MessageSquare,
  Zap,
  AlertCircle,
  Briefcase,
  Search,
  ChevronDown,
  Settings,
  Cpu
} from 'lucide-react';
import { AIService, AIResponse } from '@/lib/ai-service';

interface Job {
  id: string;
  title: string;
  company: string;
  description?: string;
  status: string;
}

interface AISuggestion {
  id: string;
  type: 'improvement' | 'optimization' | 'suggestion' | 'rewrite';
  title: string;
  description: string;
  content: string;
  impact: 'high' | 'medium' | 'low';
  category: string;
  applied: boolean;
}

interface CVAIAssistantProps {
  onApplySuggestion: (suggestion: AISuggestion) => void;
  onGenerateContent: (type: string, context: string) => void;
  currentSection?: string;
  currentContent?: string;
  availableJobs?: Job[];
  onClose: () => void;
}

const CVAIAssistant: React.FC<CVAIAssistantProps> = ({
  onApplySuggestion,
  onGenerateContent,
  currentSection,
  currentContent,
  availableJobs = [],
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'suggestions' | 'generate' | 'optimize' | 'job-tailor'>('suggestions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'gemini' | 'perplexity'>('auto');
  const [lastUsedProvider, setLastUsedProvider] = useState<string>('');

  // Generate AI suggestions based on current content
  const generateSuggestions = async () => {
    if (!currentContent || currentContent.trim().length < 10) {
      setError('Please add some content to get AI suggestions');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await AIService.suggestImprovements(currentContent, currentSection, selectedProvider);
      
      if (response.success && response.content) {
        const newSuggestion: AISuggestion = {
          id: Date.now().toString(),
          type: 'suggestion',
          title: 'AI Improvement Suggestions',
          description: 'AI-generated suggestions to improve your content',
          content: response.content,
          impact: 'high',
          category: currentSection || 'general',
          applied: false
        };

        setSuggestions([newSuggestion]);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError(response.error || 'Failed to generate suggestions');
      }
    } catch (error) {
      setError('Failed to connect to AI service');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateContentTypes = [
    {
      id: 'professional-summary',
      title: 'Professional Summary',
      description: 'Create a compelling professional summary',
      icon: MessageSquare,
      prompt: 'Write a professional summary for a Product Manager with 5+ years of experience'
    },
    {
      id: 'achievements',
      title: 'Key Achievements',
      description: 'Generate impactful achievement statements',
      icon: TrendingUp,
      prompt: 'Create 3-5 quantifiable achievements for a Product Manager role'
    },
    {
      id: 'skills-description',
      title: 'Skills Description',
      description: 'Write detailed skill descriptions',
      icon: Target,
      prompt: 'Write detailed descriptions for Product Management skills'
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter',
      description: 'Generate a personalized cover letter',
      icon: MessageSquare,
      prompt: 'Write a cover letter for a Product Manager position'
    }
  ];

  const optimizationOptions = [
    {
      id: 'ats-optimization',
      title: 'ATS Optimization',
      description: 'Optimize your CV for Applicant Tracking Systems',
      icon: Target,
      features: ['Keyword optimization', 'Format compliance', 'Section structure']
    },
    {
      id: 'impact-enhancement',
      title: 'Impact Enhancement',
      description: 'Make your achievements more impactful',
      icon: TrendingUp,
      features: ['Quantifiable metrics', 'Action verbs', 'Results focus']
    },
    {
      id: 'tone-improvement',
      title: 'Tone Improvement',
      description: 'Improve the overall tone and professionalism',
      icon: MessageSquare,
      features: ['Professional language', 'Confident tone', 'Clear communication']
    }
  ];

  const jobTailoringOptions = [
    {
      id: 'job-specific-keywords',
      title: 'Job-Specific Keywords',
      description: 'Extract and incorporate relevant keywords from job description',
      icon: Target,
      features: ['Keyword extraction', 'ATS optimization', 'Industry terminology']
    },
    {
      id: 'tailored-cover-letter',
      title: 'Tailored Cover Letter',
      description: 'Generate a cover letter specifically for this job',
      icon: MessageSquare,
      features: ['Job-specific content', 'Company alignment', 'Role matching']
    },
    {
      id: 'experience-alignment',
      title: 'Experience Alignment',
      description: 'Align your experience with job requirements',
      icon: TrendingUp,
      features: ['Requirement matching', 'Skill highlighting', 'Achievement focus']
    }
  ];

  const handleGenerateContent = async (type: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');

    try {
      const response = await AIService.generateNewContent(prompt, undefined, selectedProvider);
      
      if (response.success && response.content) {
        setGeneratedContent(response.content);
        onGenerateContent(type, response.content);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError(response.error || 'Failed to generate content');
      }
    } catch (error) {
      setError('Failed to connect to AI service');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeContent = async (option: any) => {
    if (!currentContent || currentContent.trim().length < 10) {
      setError('Please add some content to optimize');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let response: AIResponse;

      switch (option.id) {
        case 'ats-optimization':
          response = await AIService.optimizeContent(currentContent, currentSection, selectedProvider);
          break;
        case 'impact-enhancement':
          response = await AIService.rewriteContent(currentContent, currentSection, selectedProvider);
          break;
        case 'tone-improvement':
          response = await AIService.rewriteContent(currentContent, currentSection, selectedProvider);
          break;
        default:
          response = await AIService.optimizeContent(currentContent, currentSection, selectedProvider);
      }

      if (response.success && response.content) {
        setGeneratedContent(response.content);
        onGenerateContent(option.id, response.content);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError(response.error || 'Failed to optimize content');
      }
    } catch (error) {
      setError('Failed to connect to AI service');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJobTailoring = async (option: any) => {
    if (!selectedJob) {
      setError('Please select a job first');
      return;
    }

    if (!currentContent || currentContent.trim().length < 10) {
      setError('Please add some content to tailor');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let response: AIResponse;

      switch (option.id) {
        case 'job-specific-keywords':
          response = await AIService.extractJobKeywords(selectedJob.description || '', selectedProvider);
          break;
        case 'tailored-cover-letter':
          response = await AIService.generateJobSpecificCoverLetter(selectedJob, '5+ years of experience', selectedProvider);
          break;
        case 'experience-alignment':
          response = await AIService.alignExperienceWithJob(currentContent, selectedJob, selectedProvider);
          break;
        default:
          response = await AIService.optimizeContent(currentContent, currentSection, selectedProvider);
      }

      if (response.success && response.content) {
        setGeneratedContent(response.content);
        onGenerateContent(option.id, response.content);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError(response.error || 'Failed to tailor content');
      }
    } catch (error) {
      setError('Failed to connect to AI service');
    } finally {
      setIsGenerating(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-500 bg-yellow-50';
      case 'low': return 'text-green-500 bg-green-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <Zap className="w-4 h-4" />;
      case 'medium': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': return '🤖';
      case 'perplexity': return '🧠';
      default: return '⚡';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'Gemini';
      case 'perplexity': return 'Perplexity';
      default: return 'Auto';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      {/* Header with AI Assistant title and Powered by Gemini AI in same div */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-600">Powered by</p>
              {lastUsedProvider && (
                <span className="text-sm font-medium text-purple-600 flex items-center gap-1">
                  {getProviderIcon(lastUsedProvider)} {getProviderName(lastUsedProvider)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Provider Selector */}
          <div className="relative">
            <button
              onClick={() => setSelectedProvider(selectedProvider === 'auto' ? 'gemini' : selectedProvider === 'gemini' ? 'perplexity' : 'auto')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Cpu className="w-4 h-4" />
              {getProviderName(selectedProvider)}
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </motion.div>
      )}

      {/* Generated Content Display */}
      {generatedContent && (
        <motion.div
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-green-800">Generated Content</h3>
              {lastUsedProvider && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {getProviderIcon(lastUsedProvider)} {getProviderName(lastUsedProvider)}
                </span>
              )}
            </div>
            <button
              onClick={() => copyToClipboard(generatedContent)}
              className="p-1 text-green-600 hover:text-green-800 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-green-700 whitespace-pre-wrap">{generatedContent}</p>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'suggestions', name: 'Suggestions', count: suggestions.length },
          { id: 'generate', name: 'Generate', count: generateContentTypes.length },
          { id: 'optimize', name: 'Optimize', count: optimizationOptions.length },
          { id: 'job-tailor', name: 'Job Tailor', count: jobTailoringOptions.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.name}
            <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions yet</h3>
                <p className="text-gray-600 mb-4">Add some content to your CV to get AI-powered suggestions</p>
                <button
                  onClick={generateSuggestions}
                  disabled={isGenerating || !currentContent}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 inline mr-2" />
                      Generate Suggestions
                    </>
                  )}
                </button>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${getImpactColor(suggestion.impact)}`}>
                        {getImpactIcon(suggestion.impact)}
                      </div>
                      <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                      suggestion.impact === 'high' ? 'bg-red-100 text-red-700' :
                      suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {suggestion.impact} impact
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                  
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{suggestion.content}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApplySuggestion(suggestion)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Apply Suggestion
                    </button>
                    <button 
                      onClick={() => copyToClipboard(suggestion.content)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {generateContentTypes.map((type) => (
              <div
                key={type.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <type.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{type.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                    <button
                      onClick={() => handleGenerateContent(type.id, type.prompt)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Content
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'optimize' && (
          <motion.div
            key="optimize"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {optimizationOptions.map((option) => (
              <div
                key={option.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <option.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{option.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {option.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <button 
                      onClick={() => handleOptimizeContent(option)}
                      disabled={isGenerating || !currentContent}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Optimizing...
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4" />
                          Optimize Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'job-tailor' && (
          <motion.div
            key="job-tailor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Job Selection */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Select Job for Tailoring</h3>
              <div className="relative">
                <button
                  onClick={() => setShowJobDropdown(!showJobDropdown)}
                  className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-gray-500" />
                    <span className={selectedJob ? 'text-gray-900' : 'text-gray-500'}>
                      {selectedJob ? `${selectedJob.title} at ${selectedJob.company}` : 'Choose a job...'}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showJobDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showJobDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {availableJobs.length > 0 ? (
                      availableJobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobDropdown(false);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-600">{job.company}</div>
                          <div className="text-xs text-gray-500 capitalize">{job.status}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500 text-center">
                        No jobs available. Add jobs to your pipeline first.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Job Tailoring Options */}
            {selectedJob && (
              <div className="space-y-4">
                {jobTailoringOptions.map((option) => (
                  <div
                    key={option.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-green-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <option.icon className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{option.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {option.features.map((feature) => (
                            <span
                              key={feature}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                        <button 
                          onClick={() => handleJobTailoring(option)}
                          disabled={isGenerating || !currentContent}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Tailoring...
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4" />
                              Tailor for Job
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!selectedJob && (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job First</h3>
                <p className="text-gray-600">Choose a job from your pipeline to tailor your CV content</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span>AI suggestions are personalized based on your content</span>
          </div>
          <button 
            onClick={() => setActiveTab('suggestions')}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All Suggestions
          </button>
        </div>
      </div>
    </div>
  );
};

export default CVAIAssistant; 
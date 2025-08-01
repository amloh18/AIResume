'use client';

import React, { useState, useEffect } from 'react';
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
  Cpu,
  FileText,
  GraduationCap,
  Award,
  Users,
  Code,
  Globe,
  Heart,
  Music,
  Camera,
  BookOpen,
  Palette,
  Minimize2,
  Maximize2
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

interface Snippet {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  usageCount: number;
}

interface EnhancedAIAssistantProps {
  onApplySuggestion: (suggestion: AISuggestion) => void;
  onGenerateContent: (type: string, context: string) => void;
  onApplySnippet: (snippet: Snippet) => void;
  currentSection?: string;
  currentContent?: string;
  availableJobs?: Job[];
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const EnhancedAIAssistant: React.FC<EnhancedAIAssistantProps> = ({
  onApplySuggestion,
  onGenerateContent,
  onApplySnippet,
  currentSection,
  currentContent,
  availableJobs = [],
  onClose,
  isCollapsed,
  onToggleCollapse
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'snippets'>('ai');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'gemini' | 'perplexity'>('auto');
  const [lastUsedProvider, setLastUsedProvider] = useState<string>('');

  // Sample snippets data
  useEffect(() => {
    const sampleSnippets: Snippet[] = [
      {
        id: '1',
        title: 'Professional Summary',
        content: 'Results-driven professional with X years of experience in [industry]. Proven track record of [key achievement]. Skilled in [key skills] with expertise in [specific area].',
        category: 'summary',
        tags: ['professional', 'summary', 'introduction'],
        usageCount: 1250
      },
      {
        id: '2',
        title: 'Leadership Experience',
        content: 'Led a team of X members to deliver [project/result] within deadline. Managed budget of $X and improved efficiency by X%.',
        category: 'leadership',
        tags: ['leadership', 'management', 'team'],
        usageCount: 890
      },
      {
        id: '3',
        title: 'Technical Skills',
        content: 'Proficient in [technology stack], with hands-on experience in [specific tools/frameworks]. Demonstrated ability to [specific technical achievement].',
        category: 'skills',
        tags: ['technical', 'skills', 'technology'],
        usageCount: 1100
      },
      {
        id: '4',
        title: 'Education Achievement',
        content: 'Graduated with [degree] from [university] with [GPA/honors]. Relevant coursework in [subjects].',
        category: 'education',
        tags: ['education', 'academic', 'degree'],
        usageCount: 750
      },
      {
        id: '5',
        title: 'Project Management',
        content: 'Managed end-to-end project delivery for [project type], coordinating with cross-functional teams and stakeholders. Delivered X% under budget and X days ahead of schedule.',
        category: 'experience',
        tags: ['project', 'management', 'delivery'],
        usageCount: 650
      }
    ];
    setSnippets(sampleSnippets);
  }, []);

  // Get section-specific snippets
  const getSectionSnippets = (section?: string) => {
    if (!section) return snippets;
    return snippets.filter(snippet => 
      snippet.category.toLowerCase() === section.toLowerCase() ||
      snippet.tags.some(tag => tag.toLowerCase().includes(section.toLowerCase()))
    );
  };

  // Get section icon
  const getSectionIcon = (section?: string) => {
    switch (section?.toLowerCase()) {
      case 'work':
      case 'experience':
        return Briefcase;
      case 'education':
        return GraduationCap;
      case 'skills':
        return Code;
      case 'summary':
        return FileText;
      case 'leadership':
        return Users;
      case 'projects':
        return Globe;
      case 'volunteer':
        return Heart;
      case 'interests':
        return Music;
      case 'certifications':
        return Award;
      default:
        return FileText;
    }
  };

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
        setError('Failed to generate suggestions. Please try again.');
      }
    } catch (err) {
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateContent = async (type: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await AIService.generateContent({
        prompt,
        type: type as 'rewrite' | 'optimize' | 'suggest' | 'generate',
        provider: selectedProvider
      });
      
      if (response.success && response.content) {
        setGeneratedContent(response.content);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError('Failed to generate content. Please try again.');
      }
    } catch (err) {
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptimizeContent = async (option: any) => {
    if (!currentContent) {
      setError('Please add some content to optimize');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Optimize this ${currentSection || 'content'} for ${option.name}: ${currentContent}`;
      const response = await AIService.generateContent({
        prompt,
        type: 'optimize',
        provider: selectedProvider
      });
      
      if (response.success && response.content) {
        const newSuggestion: AISuggestion = {
          id: Date.now().toString(),
          type: 'optimization',
          title: `${option.name} Optimization`,
          description: `Optimized for ${option.name.toLowerCase()}`,
          content: response.content,
          impact: 'high',
          category: currentSection || 'general',
          applied: false
        };

        setSuggestions([newSuggestion]);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError('Failed to optimize content. Please try again.');
      }
    } catch (err) {
      setError('Failed to optimize content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJobTailoring = async (option: any) => {
    if (!currentContent || !selectedJob) {
      setError('Please add content and select a job to tailor');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Tailor this ${currentSection || 'content'} for the job "${selectedJob.title}" at ${selectedJob.company}: ${currentContent}`;
      const response = await AIService.generateContent({
        prompt,
        type: 'optimize',
        provider: selectedProvider
      });
      
      if (response.success && response.content) {
        const newSuggestion: AISuggestion = {
          id: Date.now().toString(),
          type: 'optimization',
          title: `Job-Tailored for ${selectedJob.title}`,
          description: `Optimized for ${selectedJob.company}`,
          content: response.content,
          impact: 'high',
          category: currentSection || 'general',
          applied: false
        };

        setSuggestions([newSuggestion]);
        setLastUsedProvider(response.provider || 'unknown');
      } else {
        setError('Failed to tailor content. Please try again.');
      }
    } catch (err) {
      setError('Failed to tailor content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return TrendingUp;
      case 'medium': return Target;
      case 'low': return CheckCircle;
      default: return AlertCircle;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gemini': return <Cpu className="w-4 h-4" />;
      case 'perplexity': return <Zap className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'Gemini';
      case 'perplexity': return 'Perplexity';
      default: return 'AI';
    }
  };

  // If collapsed, show just the AI Assist button
  if (isCollapsed) {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <button
          onClick={onToggleCollapse}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
          title="Open AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.aside
      className={`bg-white shadow-2xl border-l border-gray-200 flex flex-col relative z-50 ${
        isCollapsed ? 'w-16' : 'w-[480px]'
      }`}
      initial={{ width: isCollapsed ? 64 : 480, opacity: 0 }}
      animate={{ width: isCollapsed ? 64 : 480, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Job Selector */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Target Job</h4>
          <button
            onClick={() => setShowJobDropdown(!showJobDropdown)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {selectedJob ? 'Change' : 'Select Job'}
          </button>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowJobDropdown(!showJobDropdown)}
            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors bg-white"
          >
            <span className="text-sm text-gray-700">
              {selectedJob ? `${selectedJob.title} at ${selectedJob.company}` : 'Select a job to tailor for'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          
          {showJobDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {availableJobs.length > 0 ? (
                availableJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobDropdown(false);
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{job.title}</div>
                    <div className="text-sm text-gray-600">{job.company}</div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500 text-center">
                  No jobs available
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'ai'
              ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </div>
        </button>
        <button
          onClick={() => setActiveTab('snippets')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'snippets'
              ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            Snippets
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!isCollapsed ? (
          activeTab === 'ai' ? (
          <div className="p-4 space-y-4">


            {/* Current Section Indicator */}
            {currentSection && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {React.createElement(getSectionIcon(currentSection), { className: "w-4 h-4 text-blue-600" })}
                  <span className="text-sm font-medium text-blue-900">
                    Editing: {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
                  </span>
                </div>
              </div>
            )}

            {/* Unified AI Interface */}
            <div className="space-y-4">
              {/* AI Suggestions */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">AI Suggestions</h4>
                <button
                  onClick={generateSuggestions}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Get AI Suggestions
                    </div>
                  )}
                </button>

                {suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                      <div className="flex items-center gap-2">
                        {React.createElement(getImpactIcon(suggestion.impact), { 
                          className: `w-4 h-4 ${getImpactColor(suggestion.impact)}` 
                        })}
                        <span className={`text-xs font-medium ${getImpactColor(suggestion.impact)}`}>
                          {suggestion.impact}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                    <div className="bg-white border border-gray-200 rounded p-3 mb-3">
                      <p className="text-sm text-gray-800">{suggestion.content}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onApplySuggestion(suggestion)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => copyToClipboard(suggestion.content)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Content Generation */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Generate Content</h4>
                {[
                  { type: 'summary', label: 'Professional Summary', icon: FileText },
                  { type: 'experience', label: 'Work Experience', icon: Briefcase },
                  { type: 'skills', label: 'Skills Section', icon: Code },
                  { type: 'education', label: 'Education', icon: GraduationCap }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleGenerateContent(item.type, `Generate a professional ${item.type} section`)}
                      disabled={isGenerating}
                      className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </button>
                  );
                })}

                {generatedContent && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Generated Content</h4>
                    <div className="bg-white border border-green-200 rounded p-3 mb-3">
                      <p className="text-sm text-gray-800">{generatedContent}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onGenerateContent('content', generatedContent)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        Use Content
                      </button>
                      <button
                        onClick={() => copyToClipboard(generatedContent)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Optimization */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Optimize Content</h4>
                {[
                  { name: 'Clarity', description: 'Make content clearer and more concise' },
                  { name: 'Impact', description: 'Add more action verbs and achievements' },
                  { name: 'Keywords', description: 'Optimize for ATS and job keywords' },
                  { name: 'Professional', description: 'Make it more professional and formal' }
                ].map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleOptimizeContent(option)}
                    disabled={isGenerating}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <h4 className="font-medium text-gray-900">{option.name}</h4>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                ))}
              </div>

              {/* Job Tailoring */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Job Tailoring</h4>
                {selectedJob ? (
                  <button
                    onClick={() => handleJobTailoring({ name: 'Job Tailoring' })}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? 'Tailoring...' : `Tailor for ${selectedJob.title}`}
                  </button>
                ) : (
                  <div className="text-center py-4">
                    <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">Select a job above to tailor content</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Snippets Tab
          <div className="p-4 space-y-4">
            {/* Section-specific snippets */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {currentSection ? `${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)} Snippets` : 'All Snippets'}
              </h4>
              
              {getSectionSnippets(currentSection).map((snippet) => (
                <motion.div
                  key={snippet.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onApplySnippet(snippet)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{snippet.title}</h5>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3" />
                      {snippet.usageCount}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{snippet.content}</p>
                  <div className="flex flex-wrap gap-1">
                    {snippet.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {getSectionSnippets(currentSection).length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No snippets available for this section</p>
              </div>
            )}
          </div>
        )
        ) : (
          // Collapsed Icons
          <div className="space-y-2 p-2">
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full p-3 rounded-lg transition-colors ${
                activeTab === 'ai'
                  ? 'text-purple-600 bg-purple-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title="AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={`w-full p-3 rounded-lg transition-colors ${
                activeTab === 'snippets'
                  ? 'text-purple-600 bg-purple-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title="Snippets"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUsedProvider && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            Powered by {getProviderIcon(lastUsedProvider)}
            <span>{getProviderName(lastUsedProvider)}</span>
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default EnhancedAIAssistant; 
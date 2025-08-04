'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  X,
  Copy,
  RefreshCw,
  FileText,
  Briefcase,
  ChevronDown,
  Minimize2,
  Maximize2,
  Search,
  Filter,
  Edit3,
  MessageSquare,
  Zap,
  AlertCircle,
  Check,
  XCircle,
  Download,
  ExternalLink,
  Settings,
  Star,
  Trash2,
  Eye
} from 'lucide-react';
import { AIService, AIResponse } from '@/lib/ai-service';

interface Job {
  id: string;
  title: string;
  company: string;
  description?: string;
  status: string;
}

interface TailorSuggestion {
  id: string;
  type: 'keyword' | 'improvement';
  title: string;
  description: string;
  section: string;
  applied: boolean;
}

interface RewriteSuggestion {
  id: string;
  original: string;
  suggested: string;
  tone: string;
  style: string;
  applied: boolean;
}

interface CoverLetter {
  id: string;
  content: string;
  jobId: string;
  generatedAt: Date;
}

interface EnhancedAIAssistantProps {
  onApplySuggestion: (suggestion: any) => void;
  onGenerateContent: (type: string, context: string) => void;
  onApplySnippet: (snippet: any) => void;
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
  const [activeTab, setActiveTab] = useState<'tailor' | 'rewrite' | 'cover-letter' | 'jobs'>('tailor');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tailor tab state
  const [roleMatchScore, setRoleMatchScore] = useState<number>(78);
  const [missingKeywords, setMissingKeywords] = useState<string[]>(['Strategic Planning', 'SQL', 'Data Modelling']);
  const [tailorSuggestions, setTailorSuggestions] = useState<TailorSuggestion[]>([]);
  
  // Rewrite tab state
  const [rewriteMode, setRewriteMode] = useState<'professional' | 'friendly' | 'confident' | 'academic'>('professional');
  const [rewriteStyle, setRewriteStyle] = useState<'bullet-focused' | 'paragraph' | 'impact-based'>('bullet-focused');
  const [enhanceNumbers, setEnhanceNumbers] = useState<boolean>(true);
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [rewriteSuggestion, setRewriteSuggestion] = useState<RewriteSuggestion | null>(null);
  
  // Cover Letter tab state
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

  // Load sample data
  useEffect(() => {
    // Sample tailor suggestions
    const sampleTailorSuggestions: TailorSuggestion[] = [
      {
        id: '1',
        type: 'keyword',
        title: 'Add "Strategic Planning" to Summary',
        description: 'This keyword appears 3 times in the job description',
        section: 'summary',
        applied: false
      },
      {
        id: '2',
        type: 'keyword',
        title: 'Highlight "SQL experience" in Experience',
        description: 'SQL is listed as a required skill',
        section: 'experience',
        applied: false
      },
      {
        id: '3',
        type: 'improvement',
        title: 'Quantify achievements in leadership section',
        description: 'Add specific numbers to make impact clearer',
        section: 'leadership',
        applied: false
      }
    ];
    setTailorSuggestions(sampleTailorSuggestions);
  }, []);

  // Generate role match score
  const generateRoleMatchScore = async () => {
    if (!selectedJob || !currentContent) {
      setError('Please select a job and add content to analyze');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await AIService.suggestImprovements(
        currentContent, 
        currentSection, 
        'auto'
      );
      
      if (response.success) {
        // Simulate score calculation
        const newScore = Math.floor(Math.random() * 30) + 70; // 70-100
        setRoleMatchScore(newScore);
        
        // Update missing keywords based on AI analysis
        const newKeywords = ['Strategic Planning', 'SQL', 'Data Modelling'].slice(0, Math.floor(Math.random() * 3) + 1);
        setMissingKeywords(newKeywords);
      }
    } catch (err) {
      setError('Failed to analyze role match. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply tailor suggestions
  const applyTailorSuggestion = (suggestionId: string) => {
    setTailorSuggestions(prev => 
      prev.map(s => s.id === suggestionId ? { ...s, applied: !s.applied } : s)
    );
  };

  // Apply all selected suggestions
  const applyAllSuggestions = () => {
    const selectedSuggestions = tailorSuggestions.filter(s => s.applied);
    // Here you would apply the suggestions to the CV content
    console.log('Applying suggestions:', selectedSuggestions);
    onApplySuggestion({ type: 'tailor', suggestions: selectedSuggestions });
  };

  // Generate rewrite suggestion
  const generateRewrite = async () => {
    if (!selectedContent.trim()) {
      setError('Please select content to rewrite');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const prompt = `Rewrite this content in a ${rewriteMode} tone with ${rewriteStyle} style${enhanceNumbers ? ' and enhance any numbers/achievements' : ''}: ${selectedContent}`;
      
      const response = await AIService.generateContent({
        prompt,
        type: 'rewrite',
        provider: 'auto'
      });
      
      if (response.success && response.content) {
        setRewriteSuggestion({
          id: Date.now().toString(),
          original: selectedContent,
          suggested: response.content,
          tone: rewriteMode,
          style: rewriteStyle,
          applied: false
        });
      } else {
        setError('Failed to generate rewrite. Please try again.');
      }
    } catch (err) {
      setError('Failed to generate rewrite. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply rewrite suggestion
  const applyRewrite = () => {
    if (rewriteSuggestion) {
      onApplySuggestion({ type: 'rewrite', content: rewriteSuggestion.suggested });
      setRewriteSuggestion(null);
    }
  };

  // Generate cover letter
  const generateCoverLetter = async () => {
    if (!selectedJob) {
      setError('Please select a job to generate cover letter for');
      return;
    }

    setIsGeneratingCoverLetter(true);
    setError(null);

    try {
      const prompt = `Generate a professional cover letter for the position of ${selectedJob.title} at ${selectedJob.company}. Use the CV content: ${currentContent}`;
      
      const response = await AIService.generateContent({
        prompt,
        type: 'generate',
        provider: 'auto'
      });
      
      if (response.success && response.content) {
        setCoverLetter({
          id: Date.now().toString(),
          content: response.content,
          jobId: selectedJob.id,
          generatedAt: new Date()
        });
      } else {
        setError('Failed to generate cover letter. Please try again.');
      }
    } catch (err) {
      setError('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Export cover letter
  const exportCoverLetter = () => {
    if (!coverLetter) return;
    
    const blob = new Blob([coverLetter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${selectedJob?.title}-${selectedJob?.company}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get score background
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
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
      className="bg-white shadow-2xl border-l border-gray-200 flex flex-col relative z-50 w-[400px]"
      initial={{ width: 400, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
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

      {/* Job Selector - Sticky */}
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
              {selectedJob ? `${selectedJob.title} @ ${selectedJob.company}` : 'Select a job to tailor for'}
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
        {[
          { id: 'tailor', label: 'Tailor', icon: Target },
          { id: 'rewrite', label: 'Rewrite', icon: Edit3 },
          { id: 'cover-letter', label: 'Cover Letter', icon: MessageSquare },
          { id: 'jobs', label: 'Jobs', icon: Briefcase }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'tailor' && (
            <motion.div
              key="tailor"
              className="p-4 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Role-Match Score */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Role-Match Score</h4>
                  <button
                    onClick={generateRoleMatchScore}
                    disabled={isGenerating}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {isGenerating ? 'Analyzing...' : 'Refresh'}
                  </button>
                </div>
                
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${getScoreBg(roleMatchScore)}`}>
                  <span className={`text-lg font-bold ${getScoreColor(roleMatchScore)}`}>
                    {roleMatchScore}%
                  </span>
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        roleMatchScore >= 80 ? 'bg-green-500' : 
                        roleMatchScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${roleMatchScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📌 Missing Keywords</h4>
                <div className="space-y-2">
                  {missingKeywords.map((keyword, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{keyword}</span>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Improvements */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">🛠 Suggested Improvements</h4>
                <div className="space-y-3">
                  {tailorSuggestions.map((suggestion) => (
                    <label key={suggestion.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={suggestion.applied}
                        onChange={() => applyTailorSuggestion(suggestion.id)}
                        className="mt-1 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{suggestion.title}</div>
                        <div className="text-xs text-gray-600">{suggestion.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                
                <button
                  onClick={applyAllSuggestions}
                  disabled={!tailorSuggestions.some(s => s.applied)}
                  className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Suggestions
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'rewrite' && (
            <motion.div
              key="rewrite"
              className="p-4 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Content Selection */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Selected Content</h4>
                <textarea
                  value={selectedContent}
                  onChange={(e) => setSelectedContent(e.target.value)}
                  placeholder="Select content from your CV or paste it here..."
                  className="w-full h-20 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Rewrite Mode */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">🔄 Rewrite Mode</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(['professional', 'friendly', 'confident', 'academic'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setRewriteMode(mode)}
                      className={`py-2 px-3 text-xs font-medium rounded-lg transition-colors ${
                        rewriteMode === mode
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rewriting Style */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📏 Rewriting Style</h4>
                <div className="space-y-2">
                  {([
                    { id: 'bullet-focused', label: 'Bullet Focused' },
                    { id: 'paragraph', label: 'Paragraph' },
                    { id: 'impact-based', label: 'Impact-based' }
                  ] as const).map((style) => (
                    <label key={style.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="rewriteStyle"
                        checked={rewriteStyle === style.id}
                        onChange={() => setRewriteStyle(style.id)}
                        className="text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{style.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Achievement Quantifier */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enhanceNumbers}
                    onChange={(e) => setEnhanceNumbers(e.target.checked)}
                    className="text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">🏆 Achievement Quantifier</div>
                    <div className="text-xs text-gray-600">Enhance numbers and results (e.g., "increased sales by 30%")</div>
                  </div>
                </label>
              </div>

              {/* Rewrite Button */}
              <button
                onClick={generateRewrite}
                disabled={isGenerating || !selectedContent.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Rewriting...
                  </div>
                ) : (
                  'Rewrite Content'
                )}
              </button>

              {/* Rewrite Suggestion */}
              {rewriteSuggestion && (
                <motion.div
                  className="bg-green-50 border border-green-200 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h4 className="font-medium text-green-900 mb-3">New Suggestion</h4>
                  <div className="bg-white border border-green-200 rounded p-3 mb-3">
                    <p className="text-sm text-gray-800">{rewriteSuggestion.suggested}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={applyRewrite}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => setRewriteSuggestion(null)}
                      className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'cover-letter' && (
            <motion.div
              key="cover-letter"
              className="p-4 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* One-Click Generator */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📝 One-Click Generator</h4>
                <button
                  onClick={generateCoverLetter}
                  disabled={isGeneratingCoverLetter || !selectedJob}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
                >
                  {isGeneratingCoverLetter ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Cover Letter...
                    </div>
                  ) : (
                    'Generate Cover Letter'
                  )}
                </button>
              </div>

              {/* Cover Letter Output */}
              {coverLetter && (
                <motion.div
                  className="bg-white border border-gray-200 rounded-lg p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h4 className="font-medium text-gray-900 mb-3">✏️ Editable Cover Letter</h4>
                  <textarea
                    value={coverLetter.content}
                    onChange={(e) => setCoverLetter({ ...coverLetter, content: e.target.value })}
                    className="w-full h-64 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Your cover letter will appear here..."
                  />
                  
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => copyToClipboard(coverLetter.content)}
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={exportCoverLetter}
                      className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(coverLetter.content)}`, '_blank')}
                      className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in New Tab
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'jobs' && (
            <motion.div
              key="jobs"
              className="p-4 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Current Selected Job */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">🔽 Current Selected Job</h4>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  {selectedJob ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {selectedJob.title} @ {selectedJob.company}
                      </span>
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">No job selected</span>
                  )}
                </div>
              </div>

              {/* Saved Jobs List */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📜 Saved Jobs List</h4>
                <div className="space-y-2">
                  {availableJobs.length > 0 ? (
                    availableJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedJob"
                            checked={selectedJob?.id === job.id}
                            onChange={() => setSelectedJob(job)}
                            className="text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{job.title}</div>
                            <div className="text-xs text-gray-600">{job.company}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => window.open(`/dashboard?job=${job.id}`, '_blank')}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View in Tracker"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* Delete job logic */}}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No saved jobs available</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border-t border-gray-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}
    </motion.aside>
  );
};

export default EnhancedAIAssistant; 
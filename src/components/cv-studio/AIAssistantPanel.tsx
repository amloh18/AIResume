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

interface AIAssistantPanelProps {
  onApplySuggestion: (suggestion: any) => void;
  onGenerateContent: (type: string, context: string) => void;
  onApplySnippet: (snippet: any) => void;
  currentSection?: string;
  currentContent?: string;
  availableJobs?: Job[];
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // New props for CV data analysis
  cvData?: any;
  selectedJob?: Job | null;
  onJobSelect?: (job: Job) => void;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  onApplySuggestion,
  onGenerateContent,
  onApplySnippet,
  currentSection,
  currentContent,
  availableJobs = [],
  onClose,
  isCollapsed,
  onToggleCollapse,
  cvData,
  selectedJob,
  onJobSelect
}) => {
  const [activeTab, setActiveTab] = useState<'tailor' | 'rewrite' | 'cover-letter' | 'jobs'>('tailor');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use provided selectedJob or default to first available job
  const currentSelectedJob = selectedJob || availableJobs[0] || null;

  // Tailor tab state - Hardwired sample data
  const [roleMatchScore, setRoleMatchScore] = useState<number>(78);
  const [missingKeywords, setMissingKeywords] = useState<string[]>(['Strategic Planning', 'SQL', 'Data Modelling']);
  const [tailorSuggestions, setTailorSuggestions] = useState<TailorSuggestion[]>([
    {
      id: '1',
      type: 'keyword',
      title: 'Add "Strategic Planning"',
      description: 'Include strategic planning experience in your summary',
      section: 'summary',
      applied: false
    },
    {
      id: '2',
      type: 'improvement',
      title: 'Highlight SQL Skills',
      description: 'Emphasize SQL experience in your technical skills',
      section: 'skills',
      applied: false
    },
    {
      id: '3',
      type: 'keyword',
      title: 'Add "Data Modelling"',
      description: 'Include data modelling projects in your experience',
      section: 'experience',
      applied: false
    }
  ]);

  // Rewrite tab state - Use selected content or fallback to sample
  const [selectedContent, setSelectedContent] = useState<string>('Led development of microservices architecture serving 1M+ users');
  const [rewriteMode, setRewriteMode] = useState<'professional' | 'friendly' | 'confident' | 'academic'>('professional');
  const [rewriteStyle, setRewriteStyle] = useState<'bullet' | 'paragraph' | 'impact'>('bullet');
  const [enhanceNumbers, setEnhanceNumbers] = useState<boolean>(true);
  const [rewriteSuggestion, setRewriteSuggestion] = useState<RewriteSuggestion | null>({
    id: '1',
    original: 'Led development of microservices architecture serving 1M+ users',
    suggested: 'Successfully architected and deployed microservices infrastructure supporting over 1 million active users, resulting in 40% improved system performance and 99.9% uptime.',
    tone: 'professional',
    style: 'bullet',
    applied: false
  });

  // Update selected content when currentContent changes
  useEffect(() => {
    if (currentContent && currentContent.trim()) {
      setSelectedContent(currentContent);
    }
  }, [currentContent]);

  // Cover Letter tab state - Hardwired sample data
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>({
    id: '1',
    content: `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at your company. With over 5 years of experience in full-stack development and a proven track record of delivering scalable solutions, I am confident in my ability to contribute significantly to your team.

My experience includes leading the development of microservices architecture serving over 1 million users, mentoring junior developers, and implementing CI/CD pipelines that reduced deployment time by 60%. I am particularly drawn to your company's innovative approach to technology and commitment to excellence.

I would welcome the opportunity to discuss how my skills and experience align with your team's needs. Thank you for considering my application.

Best regards,
[Your Name]`,
    jobId: '1',
    generatedAt: new Date()
  });
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState<boolean>(false);

  // Hardwired sample jobs
  const sampleJobs: Job[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      description: 'Leading development of scalable web applications',
      status: 'active'
    },
    {
      id: '2',
      title: 'Full Stack Developer',
      company: 'Startup Inc',
      description: 'Building React/Node.js applications from scratch',
      status: 'active'
    },
    {
      id: '3',
      title: 'Backend Engineer',
      company: 'Enterprise Solutions',
      description: 'Designing and implementing microservices architecture',
      status: 'active'
    }
  ];

  // Use sample jobs if no jobs are provided
  const jobsToUse = availableJobs.length > 0 ? availableJobs : sampleJobs;

  // Load sample data
  useEffect(() => {
    // This useEffect is now redundant as data is hardwired
  }, []);

  const generateRoleMatchScore = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Analyze CV data against selected job
      const analysis = analyzeCVData();
      
      if (analysis) {
        setRoleMatchScore(analysis.matchScore);
        setMissingKeywords(analysis.missingKeywords.slice(0, 5));
        setTailorSuggestions(generateTailorSuggestions(analysis));
      } else {
        // Fallback to hardwired data if no analysis available
        const newScore = Math.floor(Math.random() * 30) + 70;
        setRoleMatchScore(newScore);
        const newKeywords = ['Machine Learning', 'Cloud Computing', 'Agile Methodology'];
        setMissingKeywords(newKeywords);
        
        const newSuggestions: TailorSuggestion[] = [
          {
            id: Date.now().toString(),
            type: 'keyword',
            title: 'Add "Machine Learning"',
            description: 'Include machine learning experience in your skills',
            section: 'skills',
            applied: false
          },
          {
            id: (Date.now() + 1).toString(),
            type: 'improvement',
            title: 'Highlight Cloud Experience',
            description: 'Emphasize cloud computing projects',
            section: 'experience',
            applied: false
          }
        ];
        setTailorSuggestions(newSuggestions);
      }
      
    } catch (err) {
      setError('Failed to generate role match score');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyTailorSuggestion = (suggestionId: string) => {
    setTailorSuggestions(prev => 
      prev.map(s => s.id === suggestionId ? { ...s, applied: !s.applied } : s)
    );
    onApplySuggestion({ id: suggestionId, type: 'tailor' });
  };

  const applyAllSuggestions = () => {
    setTailorSuggestions(prev => prev.map(s => ({ ...s, applied: true })));
    onApplySuggestion({ type: 'tailor', action: 'apply-all' });
  };

  const generateRewrite = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Hardwired rewrite suggestions based on mode and style
      const suggestions = {
        professional: {
          bullet: 'Successfully architected and deployed microservices infrastructure supporting over 1 million active users, resulting in 40% improved system performance and 99.9% uptime.',
          paragraph: 'Demonstrated exceptional leadership by successfully architecting and deploying a comprehensive microservices infrastructure that currently supports over 1 million active users. This strategic initiative resulted in a 40% improvement in system performance and achieved 99.9% uptime, significantly enhancing user experience and operational efficiency.',
          impact: 'Delivered 40% performance improvement and 99.9% uptime by architecting microservices infrastructure for 1M+ users'
        },
        friendly: {
          bullet: 'Worked with an amazing team to build microservices that now help over 1 million users every day, making everything 40% faster and almost never going down.',
          paragraph: 'I had the pleasure of working with an incredible team to build a microservices system that now serves over 1 million users daily. We managed to make everything 40% faster and achieve nearly perfect uptime, which has made a huge difference for our users.',
          impact: 'Helped 1M+ users daily by building faster, more reliable microservices with an amazing team'
        },
        confident: {
          bullet: 'Led the successful development and deployment of enterprise-grade microservices architecture serving 1M+ users, achieving 40% performance gains and 99.9% uptime.',
          paragraph: 'I led the successful development and deployment of an enterprise-grade microservices architecture that now serves over 1 million users. This initiative delivered 40% performance improvements and achieved 99.9% uptime, establishing new standards for system reliability and user experience.',
          impact: 'Achieved 40% performance gains and 99.9% uptime by leading microservices architecture for 1M+ users'
        },
        academic: {
          bullet: 'Conducted research and implemented microservices architecture resulting in 40% performance enhancement and 99.9% availability for user base exceeding 1 million.',
          paragraph: 'This research involved the systematic implementation of microservices architecture, which yielded significant improvements in system performance (40% enhancement) and availability (99.9%) for a user base exceeding 1 million individuals.',
          impact: 'Demonstrated 40% performance enhancement and 99.9% availability through microservices architecture implementation'
        }
      };
      
      const newSuggestion: RewriteSuggestion = {
        id: Date.now().toString(),
        original: selectedContent,
        suggested: suggestions[rewriteMode][rewriteStyle],
        tone: rewriteMode,
        style: rewriteStyle,
        applied: false
      };
      
      setRewriteSuggestion(newSuggestion);
      
    } catch (err) {
      setError('Failed to generate rewrite');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyRewrite = () => {
    if (rewriteSuggestion) {
      setRewriteSuggestion({ ...rewriteSuggestion, applied: true });
      onApplySuggestion({ id: rewriteSuggestion.id, type: 'rewrite', content: rewriteSuggestion.suggested });
    }
  };

  const generateCoverLetter = async () => {
    setIsGeneratingCoverLetter(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Hardwired cover letter based on selected job
      const job = currentSelectedJob || jobsToUse[0];
      const newCoverLetter: CoverLetter = {
        id: Date.now().toString(),
        content: `Dear Hiring Manager,

I am writing to express my strong interest in the ${job?.title || 'Software Engineer'} position at ${job?.company || 'your company'}. With over 5 years of experience in full-stack development and a proven track record of delivering scalable solutions, I am confident in my ability to contribute significantly to your team.

My experience includes leading the development of microservices architecture serving over 1 million users, mentoring junior developers, and implementing CI/CD pipelines that reduced deployment time by 60%. I am particularly drawn to your company's innovative approach to technology and commitment to excellence.

I would welcome the opportunity to discuss how my skills and experience align with your team's needs. Thank you for considering my application.

Best regards,
[Your Name]`,
        jobId: job?.id || '1',
        generatedAt: new Date()
      };
      
      setCoverLetter(newCoverLetter);
      
    } catch (err) {
      setError('Failed to generate cover letter');
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
    a.download = `cover-letter-${currentSelectedJob?.title}-${currentSelectedJob?.company}.txt`;
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

  // CV Data Analysis Functions
  const analyzeCVData = () => {
    if (!cvData || !currentSelectedJob) return null;

    const analysis = {
      profile: cvData.sections?.profile || {},
      experience: cvData.sections?.experience || {},
      education: cvData.sections?.education || {},
      skills: cvData.sections?.skills || {},
      projects: cvData.sections?.projects || {},
      leadership: cvData.sections?.leadership || {}
    };

    // Extract key information
    const summary = analysis.profile.summary || '';
    const experienceEntries = analysis.experience.entries || [];
    const educationEntries = analysis.education.entries || [];
    const skillsList = analysis.skills.entries || [];
    const projectsList = analysis.projects.entries || [];

    // Analyze job requirements against CV content
    const jobDescription = currentSelectedJob.description || '';
    const jobTitle = currentSelectedJob.title || '';

    // Extract keywords from job description
    const jobKeywords = extractKeywords(jobDescription + ' ' + jobTitle);
    
    // Extract keywords from CV
    const cvKeywords = extractKeywords(
      summary + ' ' + 
      experienceEntries.map((e: any) => e.details?.join(' ') || '').join(' ') +
      skillsList.map((s: any) => s.name || '').join(' ')
    );

    // Find missing keywords
    const missingKeywords = jobKeywords.filter(keyword => 
      !cvKeywords.some(cvKeyword => 
        cvKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(cvKeyword.toLowerCase())
      )
    );

    // Calculate match score
    const matchScore = Math.max(50, Math.min(100, 
      100 - (missingKeywords.length * 10) + 
      (cvKeywords.filter(cvKeyword => 
        jobKeywords.some(jobKeyword => 
          cvKeyword.toLowerCase().includes(jobKeyword.toLowerCase()) ||
          jobKeyword.toLowerCase().includes(cvKeyword.toLowerCase())
        )
      ).length * 5)
    ));

    return {
      matchScore,
      missingKeywords,
      cvKeywords,
      jobKeywords,
      analysis
    };
  };

  const extractKeywords = (text: string): string[] => {
    if (!text) return [];
    
    // Common technical skills and keywords
    const commonKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'mongodb', 'aws', 'docker', 'kubernetes',
      'machine learning', 'ai', 'data analysis', 'project management', 'agile', 'scrum', 'leadership',
      'communication', 'teamwork', 'problem solving', 'analytical', 'strategic', 'planning', 'research',
      'financial', 'marketing', 'sales', 'customer service', 'operations', 'management', 'development',
      'design', 'testing', 'deployment', 'maintenance', 'optimization', 'performance', 'security',
      'compliance', 'regulatory', 'risk', 'audit', 'tax', 'accounting', 'finance', 'economics'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      commonKeywords.some(keyword => 
        word.includes(keyword) || keyword.includes(word)
      )
    );

    return Array.from(new Set(keywords));
  };

  const generateTailorSuggestions = (analysis: any) => {
    if (!analysis) return [];

    const suggestions: TailorSuggestion[] = [];
    const { missingKeywords, analysis: cvAnalysis } = analysis;

    // Add missing keyword suggestions
    missingKeywords.slice(0, 5).forEach((keyword: string, index: number) => {
      suggestions.push({
        id: `keyword-${index}`,
        type: 'keyword',
        title: `Add "${keyword}"`,
        description: `Include ${keyword} experience in your CV`,
        section: 'skills',
        applied: false
      });
    });

    // Add experience improvement suggestions
    if (cvAnalysis.experience.entries?.length > 0) {
      suggestions.push({
        id: 'experience-1',
        type: 'improvement',
        title: 'Quantify Achievements',
        description: 'Add specific numbers and metrics to your experience',
        section: 'experience',
        applied: false
      });
    }

    // Add summary improvement suggestions
    if (cvAnalysis.profile.summary) {
      suggestions.push({
        id: 'summary-1',
        type: 'improvement',
        title: 'Align Summary with Job',
        description: 'Update summary to match job requirements',
        section: 'profile',
        applied: false
      });
    }

    return suggestions;
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
            {currentSelectedJob ? 'Change' : 'Select Job'}
          </button>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowJobDropdown(!showJobDropdown)}
            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors bg-white"
          >
            <span className="text-sm text-gray-700">
              {currentSelectedJob ? `${currentSelectedJob.title} @ ${currentSelectedJob.company}` : 'Select a job to tailor for'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          
          {showJobDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {jobsToUse.length > 0 ? (
                jobsToUse.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      onJobSelect?.(job);
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
              {/* Selected Content Display */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">📝 Selected Content</h4>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  {selectedContent ? (
                    <p className="text-sm text-gray-700">{selectedContent}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Click on any text in your CV to select it for rewriting
                    </p>
                  )}
                </div>
              </div>

              {/* Rewrite Controls */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">🎭 Tone</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(['professional', 'friendly', 'confident', 'academic'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setRewriteMode(mode)}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          rewriteMode === mode
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
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
                      { id: 'bullet', label: 'Bullet' },
                      { id: 'paragraph', label: 'Paragraph' },
                      { id: 'impact', label: 'Impact' }
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
                        onClick={generateRewrite}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
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
                  disabled={isGeneratingCoverLetter || !currentSelectedJob}
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
                  {currentSelectedJob ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {currentSelectedJob.title} @ {currentSelectedJob.company}
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
                  {jobsToUse.length > 0 ? (
                    jobsToUse.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedJob"
                            checked={currentSelectedJob?.id === job.id}
                            onChange={() => onJobSelect?.(job)}
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

export default AIAssistantPanel; 
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Search, 
  Zap, 
  BarChart3, 
  Lightbulb, 
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Star,
  MessageSquare,
  Settings,
  Wand2,
  ChevronLeft as ChevronLeftIcon,
  RefreshCw,
  Clock,
  X,
  Loader2,
  Crown,
  Lock
} from 'lucide-react';
import CircularProgress from '@/components/ui/CircularProgress';
import { UnifiedUnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';
import { useAIStore } from '@/lib/stores/aiStore';
import { useAIAssistant } from '@/lib/hooks/useAIAssistant';
import { AISuggestion } from '@/lib/stores/aiStore';
import { AISuggestionApplier } from '@/lib/utils/aiSuggestionApplier';
import AICard from './ai/AICard';
import JobSelector from './JobSelector';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface AIAssistantPanelProps {
  cvData: UnifiedCVDataStructure | null;
  jobData: Job | null;
  onUpdateField: (path: string, value: any) => void;
  isCollapsed: boolean;
  documentType: 'cv' | 'cover-letter';
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  onTogglePanel: () => void;
  cvId: string | null;
  userId: string;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  cvData,
  jobData,
  onUpdateField,
  isCollapsed,
  documentType,
  selectedJobId,
  onJobSelection,
  onTogglePanel,
  cvId,
  userId
}) => {
  const {
    ats,
    sections,
    generatingInitial,
    outOfDate,
    hasRealDataBySection,
    loadingBySection,
    generateInitialSuggestions,
    generateSectionSuggestions,
    refreshAllJobBasedSuggestions,
    isJobDependentSection
  } = useAIAssistant(cvId, cvData, documentType);

  const { hasAI, userPlan, loading: planLoading } = useUserPlan();
  const [showGeneratingBanner, setShowGeneratingBanner] = useState(false);
  const { theme } = useTheme();

  // Auto-generate initial suggestions when job is selected (only for PRO users)
  useEffect(() => {
    if (hasAI && selectedJobId && jobData && !generatingInitial) {
      generateInitialSuggestions();
      setShowGeneratingBanner(true);
    }
  }, [hasAI, selectedJobId, jobData, generateInitialSuggestions, generatingInitial]);

  // Hide banner when generation is complete
  useEffect(() => {
    if (!generatingInitial && showGeneratingBanner) {
      const timer = setTimeout(() => setShowGeneratingBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [generatingInitial, showGeneratingBanner]);

  const aiSections = [
    { id: 'ats-score', label: 'ATS Score & Keywords', icon: Target, color: 'text-lime-400' },
    { id: 'content-optimizer', label: 'Content Optimizer', icon: Zap, color: 'text-lime-400' },
    { id: 'quantification', label: 'Quantification Assistant', icon: TrendingUp, color: 'text-lime-400' },
          { id: 'skills-mapper', label: 'Skills & Keywords Mapper', icon: Brain, color: 'text-lime-400' },
      { id: 'gap-analyzer', label: 'Gap Analyzer', icon: BarChart3, color: 'text-lime-400' },
          { id: 'achievement-generator', label: 'Achievement Generator', icon: Star, color: 'text-lime-400' },
      { id: 'consistency-checker', label: 'Consistency & Compliance', icon: CheckCircle, color: 'text-lime-400' },
          { id: 'summary-builder', label: 'Tailored Summary Builder', icon: FileText, color: 'text-lime-400' },
      ...(documentType === 'cover-letter' ? [{ id: 'cover-letter-draft', label: 'Cover Letter Draft', icon: MessageSquare, color: 'text-lime-400' }] : [])
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Extract keywords from CV data for baseline ATS
  const extractCVKeywords = () => {
    if (!cvData) return [];
    
    const keywords: string[] = [];
    
    // Extract from skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach(skill => {
        if (skill.keywords && Array.isArray(skill.keywords)) {
          keywords.push(...skill.keywords);
        }
      });
    }
    
    // Extract from work experience descriptions
    if (cvData.work && Array.isArray(cvData.work)) {
      cvData.work.forEach(work => {
        const text = `${work.position} ${work.name} ${work.summary}`;
        // Simple keyword extraction (in a real app, you'd use NLP)
        const words = text.split(/\s+/).filter(word => 
          word.length > 3 && /^[A-Z][a-z]+/.test(word)
        );
        keywords.push(...words.slice(0, 3)); // Take first 3 capitalized words
      });
    }
    
    // Remove duplicates and limit to 8 keywords
    return [...new Set(keywords)].slice(0, 8);
  };

  const handleUseSuggestion = (suggestion: AISuggestion) => {
    if (!cvData) return;
    
    const result = AISuggestionApplier.applySuggestion(suggestion, cvData, onUpdateField);
    if (result.success) {
      // Show success feedback
      console.log('✅ Suggestion applied successfully:', result.message);
      
      // You could add a toast notification here
      // toast.success(`Applied: ${suggestion.title}`);
      
      // Mark the suggestion as applied (optional)
      // This could be used to show a checkmark or disable the button
    } else {
      // Show error feedback
      console.error('❌ Failed to apply suggestion:', result.message);
      
      // You could add an error toast here
      // toast.error(`Failed to apply: ${result.message}`);
    }
  };

  const renderATSScore = () => {
    const sectionState = sections['ats-score'];
    
    console.log('🎯 AIAssistantPanel - ATS score state:', {
      score: ats.score,
      updating: ats.updating,
      updatedAt: ats.updatedAt,
      analysis: !!ats.analysis
    });
    
    return (
      <div className="space-y-4">
        {/* ATS Score Display */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">Overall ATS Match</h3>
            <div className="flex items-center space-x-2">
              {ats.updating ? (
                <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              ) : (
                <CircularProgress 
                  score={ats.score || 0} 
                  size={60} 
                  strokeWidth={6}
                  className="flex-shrink-0"
                />
              )}

            </div>
          </div>

          {/* Update Status */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {ats.updating ? 'Updating...' : ats.updatedAt ? `Updated ${formatTimestamp(ats.updatedAt)}` : 'Not calculated'}
            </span>
            {jobData && (
              <span className="text-lime-400">Context: {jobData.title}</span>
            )}
          </div>
        </div>

        {/* Analysis Results */}
        {ats.analysis && (
          <>
            {/* Missing Keywords */}
            {ats.analysis.missingKeywords.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  {jobData ? `Missing Keywords for ${jobData.title}` : 'Missing Keywords'}
                </h3>
                <div className="space-y-2">
                  {ats.analysis.missingKeywords.slice(0, 5).map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{keyword}</span>
                      <button 
                        className="text-xs text-lime-400 hover:text-lime-300"
                        onClick={() => {
                          if (cvData) {
                            const newSkill = {
                              name: 'Technical Skills',
                              level: '',
                              keywords: [keyword]
                            };
                            onUpdateField('skills', [...(cvData.skills || []), newSkill]);
                          }
                        }}
                      >
                        Add to Skills
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {ats.analysis.strengths.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Strengths Detected</h3>
                <div className="space-y-2">
                  {ats.analysis.strengths.slice(0, 3).map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-lime-400" />
                      <span className="text-xs text-gray-400">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {ats.analysis.suggestions.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Suggestions</h3>
                <div className="space-y-2">
                  {ats.analysis.suggestions.slice(0, 3).map((suggestion, index) => (
                    <div key={index} className="text-xs text-gray-400">
                      • {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderSectionContent = (sectionId: string) => {
    const sectionState = sections[sectionId];
    const isOutOfDate = outOfDate[sectionId];
    const hasRealData = hasRealDataBySection[sectionId];

    // Show different states based on data availability
    if (!hasRealData) {
      // Show placeholder content when no real data
      return (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
              <span className="text-sm text-gray-400">Analyzing your CV...</span>
            </div>
            <p className="text-xs text-gray-500">
              {jobData ? 
                `Click "Generate" to get personalized suggestions for ${jobData.title || jobData.jobTitle}` :
                'Click "Generate" to get AI suggestions for your CV'
              }
            </p>
          </div>
        </div>
      );
    }

    // Check if section has suggestions
    const hasSuggestions = sectionState?.suggestions && sectionState.suggestions.length > 0;
    
    if (!hasSuggestions) {
      // Show message when section has no suggestions but analysis was completed
      return (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Analysis Complete</span>
            </div>
            <p className="text-xs text-gray-500">
              {jobData ? 
                `No specific suggestions for ${jobData.title || jobData.jobTitle}. Your CV looks good in this area!` :
                'No specific suggestions. Your CV looks good in this area!'
              }
            </p>
          </div>
        </div>
      );
    }

    if (sectionId === 'ats-score') {
      return renderATSScore();
    }

    return (
      <div className="space-y-4">
        {/* Out of date indicator */}
        {isOutOfDate && (
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
              Out of date
            </span>
          </div>
        )}

        {/* Suggestions */}
        {sectionState.suggestions.length > 0 && (
          <div className="space-y-3">
            {sectionState.suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-lime-500/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-300">{suggestion.title}</h4>
                    <span className="text-xs text-gray-500 bg-gray-600 px-2 py-1 rounded">
                      {suggestion.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="text-xs text-lime-400 hover:text-lime-300 bg-lime-900/20 hover:bg-lime-900/30 px-3 py-1.5 rounded transition-colors flex items-center space-x-1"
                    title="Apply this suggestion to your CV"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Use in CV</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{suggestion.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(suggestion.generatedAt)}</span>
                  </span>
                  {suggestion.section && (
                    <span className="text-gray-400">Section: {suggestion.section}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {sectionState.error && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{sectionState.error}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className={`h-full flex flex-col relative transition-colors ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-800'
      }`}>
        {/* Floating Toggle Button */}
        <button
          onClick={onTogglePanel}
          className="absolute -left-3 top-4 z-50 w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center hover:bg-lime-700 transition-colors shadow-lg focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          title="Expand AI Assistant Panel"
        >
          <ChevronLeftIcon className="h-3 w-3" />
        </button>

        {/* Icon Rail */}
        <div className="flex flex-col items-center py-4 space-y-2">
          <button
            className="p-2 rounded-lg transition-colors text-lime-400 hover:text-white hover:bg-gray-700"
            title="AI Assistant"
          >
            <Brain className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col backdrop-blur-sm relative transition-colors ${
      theme === 'dark' ? 'bg-gray-900/95' : 'bg-white/95'
    }`}>
      {/* Floating Toggle Button */}
      <button
        onClick={onTogglePanel}
        className="absolute -left-3 top-4 z-50 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Collapse AI Assistant Panel"
      >
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Fixed Job Reference Bar */}
      <div className={`p-4 border-b transition-colors ${
        theme === 'dark' 
          ? 'border-gray-700 bg-gray-800/50' 
          : 'border-lime-200/50 bg-lime-50/50'
      }`}>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-lime-400" />
            <h2 className={`text-sm font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>AI Assistant</h2>
          </div>
          
          <JobSelector
            selectedJobId={selectedJobId}
            onJobSelection={onJobSelection}
            userId={userId}
          />
        </div>
      </div>

      {/* Generating Banner */}
      {showGeneratingBanner && (
        <div className={`border-b transition-colors ${
          theme === 'dark' 
            ? 'bg-lime-900/20 border-lime-700' 
            : 'bg-lime-50 border-lime-200'
        } p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-lime-600" />
              <span className={`text-sm ${
                theme === 'dark' ? 'text-lime-300' : 'text-lime-700'
              }`}>Generating tailored suggestions...</span>
            </div>
            <button
              onClick={() => setShowGeneratingBanner(false)}
              className="text-lime-600 hover:text-lime-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Sections */}
      <div className="flex-1 overflow-y-auto ai-panel-scrollbar">
        <div className={`p-4 space-y-6 transition-colors ${
          theme === 'dark' ? 'bg-gray-900/80' : 'bg-white/80'
        }`}>
          {!hasAI && !planLoading ? (
            // PRO Upgrade Prompt
            <div className="space-y-4">
              <div className={`border rounded-lg p-6 text-center transition-colors ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-lime-900/20 to-lime-800/20 border-lime-700'
                  : 'bg-gradient-to-r from-lime-50 to-lime-100 border-lime-200'
              }`}>
                <div className="flex items-center justify-center mb-4">
                  <Crown className="h-8 w-8 text-lime-600" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Unlock AI Assistant</h3>
                <p className={`text-sm mb-4 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Upgrade to PRO to access AI-powered CV optimization, ATS scoring, and personalized suggestions.
                </p>
                <button
                  onClick={() => {
                    // Open membership modal or redirect to pricing
                    window.open('/dashboard/settings?tab=membership', '_blank');
                  }}
                  className="w-full bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                >
                  Upgrade to PRO
                </button>
              </div>
              
              {/* Feature Preview */}
              <div className="space-y-3">
                <h4 className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>PRO Features:</h4>
                <div className="space-y-2">
                  {aiSections.slice(0, 4).map((section) => (
                    <div key={section.id} className={`flex items-center space-x-3 p-3 rounded-lg opacity-60 transition-colors ${
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <Lock className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>{section.label}</div>
                        <div className="text-xs text-gray-500">PRO feature</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // AI Features for PRO users
            aiSections.map((section) => (
              <AICard
                key={section.id}
                sectionId={section.id}
                title={section.label}
                description={`AI-powered ${section.label.toLowerCase()}`}
                icon={section.icon}
                requiresJob={isJobDependentSection(section.id)}
                isLoading={loadingBySection[section.id] || false}
                hasData={hasRealDataBySection[section.id] || false}
                hasJob={!!selectedJobId}
                onGenerate={() => generateSectionSuggestions(section.id)}
                atsScore={ats.score}
                atsKeywords={ats.baseline ? extractCVKeywords() : (ats.analysis?.missingKeywords || [])}
                isBaseline={ats.baseline}
              >
                {renderSectionContent(section.id)}
              </AICard>
            ))
          )}
        </div>
      </div>

      {/* Global Refresh Button - Only for PRO users */}
      {hasAI && jobData && Object.values(outOfDate).some(Boolean) && (
        <div className={`p-4 border-t transition-colors ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={refreshAllJobBasedSuggestions}
            className="w-full text-xs text-lime-400 hover:text-lime-300 bg-lime-900/20 px-3 py-2 rounded flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh all job-based suggestions</span>
          </button>
        </div>
      )}

      {/* AI Status */}
      <div className={`p-4 border-t transition-colors ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {!hasAI ? 'PRO Required' : ats.updating ? 'ATS: Updating...' : ats.score ? `ATS: ${ats.score}%` : 'AI: Ready'}
          </span>
          <div className="flex items-center space-x-2">
            {hasAI && (
              <div className="flex items-center space-x-1 text-lime-400">
                <Crown className="h-3 w-3" />
                <span className="text-xs">PRO</span>
              </div>
            )}
            <button className="text-lime-400 hover:text-lime-300">
              <Settings className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;

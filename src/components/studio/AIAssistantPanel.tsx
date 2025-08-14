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
  Loader2
} from 'lucide-react';
import { CVData } from '@/lib/stores/cvStore';
import { Job } from '@/lib/stores/jobStore';
import { useAIStore } from '@/lib/stores/aiStore';
import { useAIAssistant } from '@/lib/hooks/useAIAssistant';
import { AISuggestion } from '@/lib/stores/aiStore';
import { AISuggestionApplier } from '@/lib/utils/aiSuggestionApplier';
import AICard from './ai/AICard';

interface AIAssistantPanelProps {
  cvData: CVData;
  jobData: Job | null;
  onUpdateField: (path: string, value: any) => void;
  isCollapsed: boolean;
  documentType: 'cv' | 'cover-letter';
  selectedJobId: string | null;
  onJobSelection: (jobId: string | null) => void;
  onTogglePanel: () => void;
  cvId: string | null;
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
  cvId
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
  } = useAIAssistant(cvId, documentType);

  const [showGeneratingBanner, setShowGeneratingBanner] = useState(false);

  // Auto-generate initial suggestions when job is selected
  useEffect(() => {
    if (selectedJobId && jobData && !generatingInitial) {
      generateInitialSuggestions();
      setShowGeneratingBanner(true);
    }
  }, [selectedJobId, jobData, generateInitialSuggestions, generatingInitial]);

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
    if (score >= 80) return 'text-lime-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-lime-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Extract keywords from CV data for baseline ATS
  const extractCVKeywords = () => {
    const keywords: string[] = [];
    
    // Extract from skills
    cvData.skills.forEach(skill => {
      keywords.push(...skill.skills);
    });
    
    // Extract from experience descriptions
    cvData.experience.forEach(exp => {
      const text = `${exp.jobTitle} ${exp.company} ${exp.description}`;
      // Simple keyword extraction (in a real app, you'd use NLP)
      const words = text.split(/\s+/).filter(word => 
        word.length > 3 && /^[A-Z][a-z]+/.test(word)
      );
      keywords.push(...words.slice(0, 3)); // Take first 3 capitalized words
    });
    
    // Remove duplicates and limit to 8 keywords
    return [...new Set(keywords)].slice(0, 8);
  };

  const handleUseSuggestion = (suggestion: AISuggestion) => {
    const result = AISuggestionApplier.applySuggestion(suggestion, cvData, onUpdateField);
    if (result.success) {
      // Could show a success toast here
      console.log('Suggestion applied successfully:', result.message);
    } else {
      // Could show an error toast here
      console.error('Failed to apply suggestion:', result.message);
    }
  };

  const renderATSScore = () => {
    const sectionState = sections['ats-score'];
    
    return (
      <div className="space-y-4">
        {/* ATS Score Display */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Overall ATS Match</h3>
            <div className="flex items-center space-x-2">
              {ats.updating ? (
                <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              ) : (
                <span className={`text-lg font-bold ${getScoreColor(ats.score || 0)}`}>
                  {ats.score || 0}%
                </span>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-600 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getScoreBgColor(ats.score || 0)}`}
              style={{ width: `${ats.score || 0}%` }}
            />
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
                        onClick={() => onUpdateField('skills', [...cvData.skills, { id: Date.now().toString(), category: 'Technical Skills', skills: [keyword] }])}
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

    // Only render content if we have real data
    if (!hasRealData) {
      return null;
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
              <div key={suggestion.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-300">{suggestion.title}</h4>
                  <button
                    onClick={() => handleUseSuggestion(suggestion)}
                    className="text-xs text-lime-400 hover:text-lime-300 bg-lime-900/20 px-2 py-1 rounded"
                  >
                    Use
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-2">{suggestion.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{suggestion.type}</span>
                  <span>{formatTimestamp(suggestion.generatedAt)}</span>
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
      <div className="h-full flex flex-col bg-gray-800 relative">
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
    <div className="h-full flex flex-col bg-gray-800 relative">
      {/* Floating Toggle Button */}
      <button
        onClick={onTogglePanel}
        className="absolute -left-3 top-4 z-50 w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center hover:bg-lime-700 transition-colors shadow-lg focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        title="Collapse AI Assistant Panel"
      >
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Fixed Job Reference Bar */}
      <div className="p-4 border-b border-gray-700 bg-gray-700">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-lime-400" />
            <h2 className="text-sm font-semibold text-white">AI Assistant</h2>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Job Reference</label>
            <select
              value={selectedJobId || ''}
              onChange={(e) => onJobSelection(e.target.value || null)}
              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-gray-300 text-xs"
            >
              <option value="">Select a job posting...</option>
              {jobData && (
                <option value={jobData.id}>{jobData.title} at {jobData.company}</option>
              )}
              <option value="sample">Sample Software Engineer Role</option>
              <option value="sample2">Sample Product Manager Role</option>
            </select>
            {!selectedJobId && (
              <p className="text-xs text-gray-400 mt-1">Select a job to enable AI optimizations</p>
            )}
          </div>

          {/* Job Context Chip */}
          {jobData && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Context:</span>
              <span className="text-xs text-lime-400 bg-lime-900/20 px-2 py-1 rounded">
                {jobData.title} @ {jobData.company}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Generating Banner */}
      {showGeneratingBanner && (
        <div className="bg-lime-900/20 border-b border-lime-500/20 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
              <span className="text-sm text-lime-400">Generating tailored suggestions...</span>
            </div>
            <button
              onClick={() => setShowGeneratingBanner(false)}
              className="text-lime-400 hover:text-lime-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Sections */}
      <div className="flex-1 overflow-y-auto ai-panel-scrollbar">
        <div className="p-4 space-y-6">
          {aiSections.map((section) => (
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
          ))}
        </div>
      </div>

      {/* Global Refresh Button */}
      {jobData && Object.values(outOfDate).some(Boolean) && (
        <div className="p-4 border-t border-gray-700">
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
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {ats.updating ? 'ATS: Updating...' : ats.score ? `ATS: ${ats.score}%` : 'AI: Ready'}
          </span>
          <button className="text-lime-400 hover:text-lime-300">
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPanel;

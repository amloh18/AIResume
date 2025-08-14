import React from 'react';
import { 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Wand2
} from 'lucide-react';
import SkeletonLayout from './SkeletonLayout';
import {
  ATSMockLayout,
  ContentOptimizerMockLayout,
  QuantificationMockLayout,
  SkillsMapperMockLayout,
  GapAnalyzerMockLayout,
  AchievementGeneratorMockLayout,
  ConsistencyCheckerMockLayout,
  SummaryBuilderMockLayout,
  CoverLetterMockLayout
} from './MockLayouts';

interface AICardProps {
  sectionId: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresJob?: boolean;
  isLoading?: boolean;
  hasData?: boolean;
  hasJob?: boolean;
  onGenerate?: () => void;
  children?: React.ReactNode;
  // ATS specific props
  atsScore?: number;
  atsKeywords?: string[];
  isBaseline?: boolean;
}

const AICard: React.FC<AICardProps> = ({
  sectionId,
  title,
  description,
  icon: Icon,
  requiresJob = false,
  isLoading = false,
  hasData = false,
  hasJob = false,
  onGenerate,
  children,
  atsScore,
  atsKeywords,
  isBaseline = false
}) => {
  // Decision logic
  const showSkeleton = isLoading;
  const showMock = !hasJob && requiresJob;
  const showRealData = hasData && (hasJob || !requiresJob);
  const showEmptyState = !showSkeleton && !showMock && !showRealData;

  // Get mock layout component
  const getMockLayout = () => {
    switch (sectionId) {
      case 'ats-score':
        return <ATSMockLayout score={atsScore} keywords={atsKeywords} />;
      case 'content-optimizer':
        return <ContentOptimizerMockLayout onGenerate={onGenerate} />;
      case 'quantification':
        return <QuantificationMockLayout onGenerate={onGenerate} />;
      case 'skills-mapper':
        return <SkillsMapperMockLayout onGenerate={onGenerate} />;
      case 'gap-analyzer':
        return <GapAnalyzerMockLayout onGenerate={onGenerate} />;
      case 'achievement-generator':
        return <AchievementGeneratorMockLayout onGenerate={onGenerate} />;
      case 'consistency-checker':
        return <ConsistencyCheckerMockLayout onGenerate={onGenerate} />;
      case 'summary-builder':
        return <SummaryBuilderMockLayout onGenerate={onGenerate} />;
      case 'cover-letter-draft':
        return <CoverLetterMockLayout onGenerate={onGenerate} />;
      default:
        return <div className="text-xs text-gray-400 text-center">Select a job to generate suggestions</div>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-lime-400" />
          <h3 className="text-sm font-medium text-gray-300">{title}</h3>
          
          {/* Status indicators */}
          {showSkeleton && (
            <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
          )}
          
          {showMock && (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-yellow-400" />
              <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                Requires Job
              </span>
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {showRealData && onGenerate && (
            <button
              onClick={onGenerate}
              className="text-xs text-lime-400 hover:text-lime-300 bg-lime-900/20 px-2 py-1 rounded flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          )}
          
          {showEmptyState && onGenerate && (
            <button
              onClick={onGenerate}
              className="text-xs text-lime-400 hover:text-lime-300 bg-lime-900/20 px-2 py-1 rounded flex items-center space-x-1"
            >
              <Wand2 className="h-3 w-3" />
              <span>Generate</span>
            </button>
          )}
          
          {showMock && onGenerate && (
            <button
              disabled
              title="Select a job to generate tailored suggestions"
              className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded flex items-center space-x-1 cursor-not-allowed"
            >
              <Wand2 className="h-3 w-3" />
              <span>Generate</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-gray-700 rounded-lg p-4">
        {showSkeleton && (
          <SkeletonLayout 
            lines={4} 
            showChips={true} 
            showButton={false} 
          />
        )}
        
        {showMock && getMockLayout()}
        
        {showRealData && children}
        
        {showEmptyState && (
          <div className="text-center py-8">
            <Wand2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400 mb-2">
              {requiresJob && !hasJob 
                ? 'Select a job to generate tailored suggestions'
                : 'Click Generate to get AI suggestions'
              }
            </p>
            {requiresJob && !hasJob && (
              <p className="text-xs text-gray-500">
                Select a Job in the top bar to unlock tailored suggestions
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AICard;

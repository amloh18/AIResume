'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  BarChart3,
  Lightbulb,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';

import { StudioSessionContext, JobData, ATSAnalysisResult } from '@/types/studio';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ATSPanelProps {
  sessionContext: StudioSessionContext;
  selectedJobId?: string;
  atsAnalysis?: ATSAnalysisResult;
  availableJobs: JobData[];
  onSelectJob: (jobId: string) => void;
  onRunAnalysis: () => void;
}

/**
 * ATS Panel Component
 * 
 * This panel implements live ATS integration with different behaviors:
 * 1. Journey Mode: Immediate analysis with linked job
 * 2. Standalone Mode: Dormant until job selected
 * 3. Live Updates: Real-time analysis as user types
 * 4. Smart Suggestions: Context-aware improvement tips
 */
export function ATSPanel({
  sessionContext,
  selectedJobId,
  atsAnalysis,
  availableJobs,
  onSelectJob,
  onRunAnalysis
}: ATSPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  
  const linkedJob = sessionContext.mode === 'journey' ? sessionContext.linkedJob : 
                   selectedJobId ? availableJobs.find(j => j.id === selectedJobId) : undefined;

  const hasJobContext = !!linkedJob;
  const hasAnalysis = !!atsAnalysis;

  return (
    <div className="space-y-4">
      {/* ATS Status Header */}
      <ATSStatusHeader
        sessionContext={sessionContext}
        hasJobContext={hasJobContext}
        linkedJob={linkedJob}
        atsAnalysis={atsAnalysis}
      />

      {/* Job Context for Standalone Mode */}
      {sessionContext.mode === 'standalone' && !hasJobContext && (
        <ATSJobSelector
          availableJobs={availableJobs}
          onSelectJob={onSelectJob}
        />
      )}

      {/* ATS Analysis Results */}
      {hasJobContext && (
        <div className="space-y-4">
          {/* Analysis Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={onRunAnalysis}
              disabled={isAnalyzing}
              size="sm"
              className="flex items-center space-x-2"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{isAnalyzing ? 'Analyzing...' : 'Run ATS Analysis'}</span>
            </Button>

            {hasAnalysis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="ml-2">{showAdvanced ? 'Simple' : 'Advanced'}</span>
              </Button>
            )}
          </div>

          {/* Analysis Results */}
          {hasAnalysis ? (
            <ATSAnalysisResults
              analysis={atsAnalysis}
              documentType={sessionContext.documentType}
              jobTitle={linkedJob?.jobTitle}
              showAdvanced={showAdvanced}
            />
          ) : (
            <ATSPlaceholder linkedJob={linkedJob} />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ATS Status Header
 * Shows current ATS status with visual indicators
 */
function ATSStatusHeader({
  sessionContext,
  hasJobContext,
  linkedJob,
  atsAnalysis
}: {
  sessionContext: StudioSessionContext;
  hasJobContext: boolean;
  linkedJob?: JobData;
  atsAnalysis?: ATSAnalysisResult;
}) {
  const getStatusColor = () => {
    if (!hasJobContext) return 'text-gray-500';
    if (!atsAnalysis) return 'text-blue-500';
    if (atsAnalysis.score >= 80) return 'text-green-500';
    if (atsAnalysis.score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = () => {
    if (!hasJobContext) return <AlertTriangle className="w-5 h-5" />;
    if (!atsAnalysis) return <Target className="w-5 h-5" />;
    if (atsAnalysis.score >= 80) return <CheckCircle2 className="w-5 h-5" />;
    if (atsAnalysis.score >= 60) return <TrendingUp className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const getStatusText = () => {
    if (!hasJobContext) return 'No Job Context';
    if (!atsAnalysis) return 'Ready for Analysis';
    return `ATS Score: ${atsAnalysis.score}%`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-gray-50 dark:bg-[#141810] rounded-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">ATS Analysis</h3>
        </div>
        
        {sessionContext.mode === 'journey' && (
          <Badge variant="secondary" size="sm">Auto-Linked</Badge>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className={getStatusColor()}>{getStatusIcon()}</div>
        <div className="flex-1">
          <div className={`font-medium ${getStatusColor()}`}>{getStatusText()}</div>
          {linkedJob && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Analyzing for {linkedJob.jobTitle} at {linkedJob.company}
            </div>
          )}
        </div>
      </div>

      {atsAnalysis && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3"
        >
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Compatibility Score
            </span>
            <Badge 
              variant={atsAnalysis.score >= 80 ? 'default' : atsAnalysis.score >= 60 ? 'secondary' : 'destructive'}
              size="sm"
            >
              {atsAnalysis.score}%
            </Badge>
          </div>
          <Progress value={atsAnalysis.score} className="h-2" />
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * ATS Job Selector for Standalone Mode
 * Allows users to select a job for ATS analysis
 */
function ATSJobSelector({
  availableJobs,
  onSelectJob
}: {
  availableJobs: JobData[];
  onSelectJob: (jobId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center"
    >
      <div className="flex flex-col items-center space-y-3">
        <div className="w-12 h-12 bg-gray-100 dark:bg-[#313a28] rounded-full flex items-center justify-center">
          <Target className="w-6 h-6 text-gray-500" />
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">ATS Analysis Disabled</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a job to enable keyword matching and optimization suggestions
          </p>
        </div>

        {availableJobs.length > 0 ? (
          <div className="w-full max-w-xs">
            <Select onValueChange={onSelectJob}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {availableJobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{job.jobTitle}</span>
                      <span className="text-sm text-gray-500">{job.company}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Create a job first to enable ATS analysis
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * ATS Analysis Results
 * Displays comprehensive analysis results with actionable insights
 */
function ATSAnalysisResults({
  analysis,
  documentType,
  jobTitle,
  showAdvanced
}: {
  analysis: ATSAnalysisResult;
  documentType: string;
  jobTitle?: string;
  showAdvanced: boolean;
}) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['keywords']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Score Breakdown */}
      {showAdvanced && (
        <div className="p-4 bg-white dark:bg-[#141810] rounded-lg border border-gray-200 dark:border-white/10">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Score Breakdown</h4>
          <div className="space-y-3">
            <ScoreItem
              label="Content Relevance"
              score={analysis.analysis?.contentRelevance || 0}
              description="How well your content matches the job requirements"
            />
            <ScoreItem
              label="Keyword Density"
              score={analysis.analysis?.keywordDensity || 0}
              description="Optimal use of important keywords"
            />
            <ScoreItem
              label="Format Optimization"
              score={analysis.analysis?.formatOptimization || 0}
              description="ATS-friendly formatting and structure"
            />
          </div>
        </div>
      )}

      {/* Keywords Analysis */}
      <Collapsible
        open={expandedSections.has('keywords')}
        onOpenChange={() => toggleSection('keywords')}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="font-medium">Matched Keywords</span>
              <Badge variant="secondary" size="sm">{analysis.matchedKeywords.length}</Badge>
            </div>
            <motion.div
              animate={{ rotate: expandedSections.has('keywords') ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ⌄
            </motion.div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {analysis.matchedKeywords.map((keyword, index) => (
              <motion.div
                key={keyword}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-900/20">
                  {keyword}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Missing Keywords */}
      {analysis.missingKeywords.length > 0 && (
        <Collapsible
          open={expandedSections.has('missing')}
          onOpenChange={() => toggleSection('missing')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Missing Keywords</span>
                <Badge variant="destructive" size="sm">{analysis.missingKeywords.length}</Badge>
              </div>
              <motion.div
                animate={{ rotate: expandedSections.has('missing') ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ⌄
              </motion.div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-2 mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Consider adding these keywords to improve your ATS score:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.missingKeywords.map((keyword, index) => (
                <motion.div
                  key={keyword}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                    {keyword}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <Collapsible
          open={expandedSections.has('suggestions')}
          onOpenChange={() => toggleSection('suggestions')}
        >
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Optimization Suggestions</span>
                <Badge variant="secondary" size="sm">{analysis.suggestions.length}</Badge>
              </div>
              <motion.div
                animate={{ rotate: expandedSections.has('suggestions') ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ⌄
              </motion.div>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">{suggestion}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </motion.div>
  );
}

/**
 * Score Item Component
 * Individual score breakdown item
 */
function ScoreItem({
  label,
  score,
  description
}: {
  label: string;
  score: number;
  description: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
        </div>
        <Progress value={score} className="h-1.5" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

/**
 * ATS Placeholder
 * Shown when job is selected but no analysis yet
 */
function ATSPlaceholder({ linkedJob }: { linkedJob?: JobData }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
    >
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Target className="w-8 h-8 text-blue-600" />
      </div>
      
      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
        Ready for ATS Analysis
      </h4>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {linkedJob ? (
          `Your document will be analyzed against requirements for ${linkedJob.jobTitle} at ${linkedJob.company}.`
        ) : (
          'Select a job to see how well your document matches the requirements.'
        )}
      </p>

      <div className="text-xs text-gray-400 dark:text-gray-500">
        Analysis will show keyword matches, missing terms, and optimization suggestions
      </div>
    </motion.div>
  );
}

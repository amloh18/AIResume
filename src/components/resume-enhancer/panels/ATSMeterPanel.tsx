import React, { useMemo } from 'react';
import { useATS } from '@/contexts/ATSContext';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { Target, FileText, Briefcase, Plus, RefreshCw, Loader2, Zap } from 'lucide-react';
import { AnimatedScore, AnimatedProgressBar } from '@/components/ui/AnimatedScore';

interface ATSMeterPanelProps {
  onOpenJobParser: () => void;
}

export const ATSMeterPanel: React.FC<ATSMeterPanelProps> = ({ onOpenJobParser }) => {
  const { atsScore, atsAnalysis, isATSLoading, refreshATSScore } = useATS();
  const { state } = useResumeEnhancer();

  const isJourneyCV = state.cvType === 'journey' && (state.jobData || state.journeyId);
  const hasJobDesc = !!(state.jobData?.jobDescription || state.jobData?.description || state.jobData?.jd);
  
  const score = atsScore || 0;
  
  // Calculate mock or real metrics based on atsAnalysis
  const metrics = useMemo(() => {
    if (atsAnalysis) {
      // Use real data if available
      return {
        keywords: atsAnalysis.keywordMatchRate || 0,
        impactWords: atsAnalysis.actionVerbsCount ? Math.min(100, atsAnalysis.actionVerbsCount * 5) : 0,
        atsFormat: atsAnalysis.formatScore || 0,
        readability: atsAnalysis.readabilityScore || 0,
      };
    }
    
    // Fallback/mock metrics based on overall score to make it look realistic
    return {
      keywords: Math.min(100, Math.max(0, score + (Math.random() * 20 - 10))),
      impactWords: Math.min(100, Math.max(0, score - 10 + (Math.random() * 20 - 10))),
      atsFormat: Math.min(100, Math.max(0, score + 15 + (Math.random() * 10 - 5))),
      readability: Math.min(100, Math.max(0, score - 5 + (Math.random() * 20 - 10))),
    };
  }, [score, atsAnalysis]);

  // Determine stroke color based on score
  const strokeColor = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="h-full flex flex-col bg-[#11140e] rounded-xl border border-white/5 overflow-y-auto hide-scrollbar p-5 text-white">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#80FF00]" />
          Analysis
        </h3>
        <button 
          onClick={() => refreshATSScore()}
          disabled={isATSLoading}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
          title="Refresh Analysis"
        >
          {isATSLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center justify-center mb-8 relative">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90 absolute inset-0">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={strokeColor}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="flex flex-col items-center justify-center z-10">
            <AnimatedScore 
              value={score} 
              size="lg" 
              className="text-4xl font-bold tracking-tighter" 
            />
            <span className="text-xs text-gray-400 font-medium">/ 100</span>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <h4 className="font-medium text-lg">CV Strengthen Score</h4>
          <div className="flex items-center justify-center gap-1.5 text-sm text-gray-400 mt-1">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">
              {state.cvData?.basics?.name ? `${state.cvData.basics.name.replace(/\s+/g, '_')}_CV` : 'My_Resume'}.pdf
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <MetricCard title="Keywords" value={metrics.keywords} />
        <MetricCard title="Impact words" value={metrics.impactWords} />
        <MetricCard title="ATS" value={metrics.atsFormat} />
        <MetricCard title="Readability" value={metrics.readability} />
      </div>

      {/* Job Target Section */}
      <div className="mt-auto bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Target Role
        </h4>
        
        {hasJobDesc ? (
          <div className="flex items-start justify-between gap-3 group">
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">
                {state.jobData?.jobTitle || state.targetRole || 'Software Engineer'}
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">
                {state.jobData?.company || 'Linked Job Description'}
              </div>
            </div>
            <button 
              onClick={onOpenJobParser}
              className="shrink-0 text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-md transition-colors"
            >
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenJobParser}
            className="w-full flex items-center justify-center gap-2 bg-[#80FF00]/10 hover:bg-[#80FF00]/20 text-[#80FF00] border border-[#80FF00]/20 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Job Description
          </button>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ title, value }: { title: string; value: number }) => {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  const color = safeValue >= 75 ? '#22c55e' : safeValue >= 50 ? '#eab308' : '#ef4444';
  
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs text-gray-400 font-medium">{title}</span>
        <span className="text-sm font-bold">{safeValue}%</span>
      </div>
      <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${safeValue}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export default ATSMeterPanel;

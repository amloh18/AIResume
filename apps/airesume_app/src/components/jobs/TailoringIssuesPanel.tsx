'use client';

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auditCvForJob, type TailoringIssue, type TailoringAuditReport } from '@/lib/cv-tailoring/tailoringAudit';

interface TailoringIssuesPanelProps {
  job: any;
  masterCv?: any;
  className?: string;
  onResolveIssue?: (issue: TailoringIssue) => void;
  compact?: boolean;
}

export const TailoringIssuesPanel: React.FC<TailoringIssuesPanelProps> = ({
  job,
  masterCv,
  className = '',
  onResolveIssue,
  compact = false,
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'blocking' | 'attention'>('all');

  // Deterministically audit CV against the job
  const report: TailoringAuditReport = React.useMemo(() => {
    return auditCvForJob(masterCv, job);
  }, [masterCv, job]);

  const { issues, issuesCount, hasBlockers, score } = report;

  const filteredIssues = issues.filter((issue) => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  });

  const handleAction = (issue: TailoringIssue) => {
    if (onResolveIssue) {
      onResolveIssue(issue);
      return;
    }
    // Default action navigates to master CV editor
    router.push('/dashboard/resumes');
  };

  if (issues.length === 0) {
    return (
      <div className={`rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 ${className}`}>
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Tailoring Quality Gate Passed
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Source CV is complete, verified, and well-aligned with role requirements.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all ${
        hasBlockers
          ? 'border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-950/10'
          : 'border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-950/10'
      } ${className}`}
    >
      {/* Header Banner */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {hasBlockers ? (
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                {hasBlockers ? 'CV / Cover Letter Requires Attention' : 'Tailoring Optimization Suggested'}
              </h4>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  score >= 80
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : score >= 50
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                Health {score}%
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {issuesCount.blocking > 0 && `${issuesCount.blocking} blocking`}
              {issuesCount.blocking > 0 && issuesCount.attention > 0 && ' · '}
              {issuesCount.attention > 0 && `${issuesCount.attention} to review`}
              {(issuesCount.blocking > 0 || issuesCount.attention > 0) && issuesCount.optional > 0 && ' · '}
              {issuesCount.optional > 0 && `${issuesCount.optional} improvements`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
          title={isExpanded ? 'Collapse issues' : 'Expand issues'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Issue List */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-white/5 space-y-3">
          {/* Severity filter tabs if multiple */}
          {(issuesCount.blocking > 0 || issuesCount.attention > 0) && (
            <div className="flex items-center gap-1.5 pt-2">
              <button
                type="button"
                onClick={() => setFilterSeverity('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  filterSeverity === 'all'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                All ({issues.length})
              </button>
              {issuesCount.blocking > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterSeverity('blocking')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    filterSeverity === 'blocking'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  Blocking ({issuesCount.blocking})
                </button>
              )}
              {issuesCount.attention > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterSeverity('attention')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    filterSeverity === 'attention'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  Attention ({issuesCount.attention})
                </button>
              )}
            </div>
          )}

          {/* Cards for each issue */}
          <div className="space-y-2 mt-2 max-h-[320px] overflow-y-auto pr-1">
            {filteredIssues.map((issue) => {
              const isBlocker = issue.severity === 'blocking';
              const isAttention = issue.severity === 'attention';

              return (
                <div
                  key={issue.id}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isBlocker
                      ? 'border-rose-300 dark:border-rose-900/40 bg-white dark:bg-[#1a1215]'
                      : isAttention
                      ? 'border-amber-300 dark:border-amber-900/40 bg-white dark:bg-[#191612]'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {isBlocker ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : isAttention ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {issue.title}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                        isBlocker
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : isAttention
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-2">
                    {issue.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 italic text-[10px] truncate max-w-[210px]">
                      {issue.recommendation}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAction(issue)}
                      className="px-2 py-1 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-[10px] hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>{issue.actionLabel || 'Resolve'}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TailoringIssuesPanel;

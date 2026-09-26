'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  MessageSquare,
  XCircle,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import CompanyLogo from '@/components/ui/CompanyLogo';

interface AttentionItem {
  _id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  type: 'needs_input' | 'failed' | 'captcha' | 'unanswered' | 'email_failed';
  message: string;
  actionLabel: string;
  actionUrl: string;
  createdAt: string;
}

interface NeedsAttentionWidgetProps {
  limit?: number;
}

/**
 * NeedsAttentionWidget - Shows items requiring user intervention
 * 
 * Displays:
 * - Applications needing user input (unanswered questions)
 * - Failed automations
 * - CAPTCHA detections
 * - Email delivery failures
 */
export default function NeedsAttentionWidget({ limit = 5 }: NeedsAttentionWidgetProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAttentionItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);

      // Fetch applications with the pipeline fields (internalStatus/reviewReason)
      // — not the fictional `needs_input,failed` statuses, which matched nothing
      // and left this widget permanently empty.
      const res = await authenticatedFetch(
        '/api/jobs?limit=50',
        { signal }
      );
      
      if (!res.ok) {
        throw new Error('Failed to fetch attention items');
      }

      const data = await res.json();
      const rawJobs = data.jobs || data.data || [];

      // Transform into attention items
      const attentionItems: AttentionItem[] = rawJobs
        .filter((job: any) => {
          const internal = String(job.internalStatus || '');
          return (
            job.status === 'needs_input' ||
            internal === 'review_required' ||
            internal === 'automation_failed' ||
            internal === 'automation_unknown' ||
            internal === 'automation_dismissed' ||
            job.deadLetter ||
            job.skipReason ||
            job.emailStatus === 'failed'
          );
        })
        .map((job: any) => {
          let type: AttentionItem['type'] = 'needs_input';
          let message = '';
          let actionLabel = 'Review';
          const actionUrl = `/dashboard/jobs?tab=applications&jobId=${job.id || job._id}`;
          const internal = String(job.internalStatus || '');
          const reason = String(job.reviewReason || '');

          if (internal === 'automation_failed' || job.deadLetter) {
            type = 'failed';
            message = reason || 'Application automation failed — retry it or apply manually';
            actionLabel = 'Retry';
          } else if (internal === 'automation_unknown') {
            type = 'needs_input';
            message = 'The run ended without confirmation — verify whether it was submitted';
            actionLabel = 'Review';
          } else if (/captcha/i.test(reason)) {
            type = 'captcha';
            message = 'CAPTCHA detected — complete it manually to continue';
            actionLabel = 'Complete CAPTCHA';
          } else if (internal === 'review_required') {
            type = 'needs_input';
            message =
              reason ||
              'Application paused and waiting for you (approve, or take over and apply manually)';
            actionLabel = /approval/i.test(reason) ? 'Approve' : 'Review';
          } else if (internal === 'automation_dismissed') {
            type = 'needs_input';
            message = 'You chose to apply manually — mark it applied when done';
            actionLabel = 'Review';
          } else if (job.skipReason) {
            type = 'unanswered';
            message = job.skipReason;
            actionLabel = 'Review';
          } else if (job.status === 'needs_input') {
            type = 'needs_input';
            message = job.needsInputReason || 'Additional information required';
            actionLabel = 'Provide Input';
          } else if (job.emailStatus === 'failed') {
            type = 'email_failed';
            message = 'Application email delivery failed';
            actionLabel = 'Retry Email';
          }

          return {
            _id: job._id || job.id,
            jobId: job._id || job.id,
            jobTitle: job.jobTitle || job.title || 'Untitled Role',
            company: job.company || 'Unknown Company',
            companyLogo: job.companyLogo,
            type,
            message,
            actionLabel,
            actionUrl,
            createdAt: job.updatedAt || job.createdAt,
          };
        })
        .slice(0, limit);

      setItems(attentionItems);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to load attention items:', err);
      setError(err.message || 'Failed to load attention items');
    }
  }, [limit]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAttentionItems(controller.signal);
    return () => controller.abort();
  }, [fetchAttentionItems]);

  const getTypeIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'needs_input':
        return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case 'captcha':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'unanswered':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'email_failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeBg = (type: AttentionItem['type']) => {
    switch (type) {
      case 'needs_input':
        return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800/30';
      case 'failed':
        return 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800/30';
      case 'captcha':
        return 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-800/30';
      case 'unanswered':
        return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800/30';
      case 'email_failed':
        return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800/30';
      default:
        return 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10';
    }
  };

  // No loading skeleton on purpose. The widget is purely additive — it either
  // has something the user must act on, or it renders nothing (see the
  // `items.length === 0` guard below). Showing a placeholder card while the
  // fetch is in flight made the dashboard flash an amber "Needs Attention"
  // panel on every load, then collapse it when the list came back empty.
  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Needs Attention</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => fetchAttentionItems()}
            className="mt-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null; // Don't show section if nothing needs attention
  }

  return (
    <div className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-[#141810] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Needs Attention</h3>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
            {items.length}
          </span>
        </div>
        {items.length > 3 && (
          <button
            onClick={() => router.push('/dashboard/jobs?tab=applications&filter=needs_attention')}
            className="text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item._id}
            onClick={() => router.push(item.actionUrl)}
            className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getTypeBg(item.type)}`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {getTypeIcon(item.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {item.jobTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CompanyLogo
                  company={item.company}
                  size={12}
                  logoUrl={item.companyLogo}
                  jobId={item.jobId}
                />
                <span className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                  {item.company}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {item.message}
              </p>
            </div>

            {/* Action */}
            <div className="shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {item.actionLabel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

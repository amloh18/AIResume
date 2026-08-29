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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttentionItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch jobs needing attention
      const res = await authenticatedFetch(
        '/api/jobs?limit=50&status=needs_input,failed&lite=true',
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
          return (
            job.status === 'needs_input' ||
            job.automationStatus === 'needs_user_action' ||
            job.automationStatus === 'failed' ||
            job.skipReason
          );
        })
        .map((job: any) => {
          let type: AttentionItem['type'] = 'needs_input';
          let message = '';
          let actionLabel = 'Review';
          let actionUrl = `/dashboard/jobs?tab=applications&jobId=${job.id || job._id}`;

          if (job.automationStatus === 'failed' || job.status === 'failed') {
            type = 'failed';
            message = job.automationError || 'Application automation failed';
            actionLabel = 'Retry';
          } else if (job.automationStatus === 'captcha_detected') {
            type = 'captcha';
            message = 'CAPTCHA detected - manual completion required';
            actionLabel = 'Complete CAPTCHA';
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
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Needs Attention</h3>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

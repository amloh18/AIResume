'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Mail,
  MailOpen,
  Send,
  Search,
  Filter,
  RefreshCw,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
  Bot,
  Clock,
  Star,
  Archive,
  MessageSquare,
  Briefcase,
  Building2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  Copy,
  Check,
  Shield,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Communication {
  _id: string;
  userId: string;
  jmapEmailId?: string;
  jmapThreadId?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  direction: 'inbound' | 'outbound';
  type: string;
  status: string;
  subject: string;
  bodySnippet: string;
  textBody?: string;
  htmlBody?: string;
  senderEmail: string;
  senderName?: string;
  recipients: Array<{ email: string; name?: string; type: string }>;
  jobId?: string;
  applicationId?: string;
  classification: string;
  classificationConfidence: number;
  matchConfidence: string;
  matchScore?: number;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: Array<{ filename: string; size: number; contentType: string }>;
  isAutomated: boolean;
  sentAt?: string;
  receivedAt: string;
  scheduledAt?: string;
  createdAt: string;
}

interface Job {
  _id: string;
  title?: string;
  jobTitle?: string;
  company?: any;
  status?: string;
}

interface CommsFilter {
  jobId?: string;
  direction?: string;
  classification?: string;
  status?: string;
}

// ============================================================================
// Classification Badge Configuration (High-contrast for both Light and Dark)
// ============================================================================

const CLASSIFICATION_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  APPLICATION_ACKNOWLEDGEMENT: {
    label: 'Acknowledged',
    className:
      'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/50',
    icon: CheckCircle,
  },
  APPLICATION_UPDATE: {
    label: 'Update',
    className:
      'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/50',
    icon: RefreshCw,
  },
  REJECTION: {
    label: 'Rejected',
    className:
      'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700/50',
    icon: XCircle,
  },
  INTERVIEW_INVITATION: {
    label: 'Interview',
    className:
      'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700/50',
    icon: Calendar,
  },
  INTERVIEW_CONFIRMATION: {
    label: 'Interview',
    className:
      'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700/50',
    icon: Calendar,
  },
  ASSESSMENT: {
    label: 'Assessment',
    className:
      'text-amber-800 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50',
    icon: FileText,
  },
  RECRUITER_MESSAGE: {
    label: 'Recruiter',
    className:
      'text-cyan-800 bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-700/50',
    icon: MessageSquare,
  },
  REQUEST_FOR_INFORMATION: {
    label: 'Info Request',
    className:
      'text-amber-800 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50',
    icon: AlertCircle,
  },
  OFFER: {
    label: 'Offer',
    className:
      'text-green-800 bg-green-100 dark:text-green-300 dark:bg-green-900/40 border border-green-200 dark:border-green-700/50',
    icon: CheckCircle,
  },
  FOLLOW_UP: {
    label: 'Follow-up',
    className:
      'text-orange-800 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-700/50',
    icon: Clock,
  },
  GENERAL_RECRUITING: {
    label: 'Recruiting',
    className:
      'text-slate-800 bg-slate-100 dark:text-slate-300 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700',
    icon: Briefcase,
  },
  MARKETING: {
    label: 'Marketing',
    className:
      'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700',
    icon: Mail,
  },
  SYSTEM: {
    label: 'System',
    className:
      'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700',
    icon: Bot,
  },
  UNKNOWN: {
    label: 'Unknown',
    className:
      'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700',
    icon: Mail,
  },
};

// ============================================================================
// CommsPanel Component
// ============================================================================

export default function CommsPanel({ metrics }: { metrics?: any }) {
  const { data: session } = useSession();
  const isAdmin =
    (session?.user as any)?.role === 'admin' ||
    (session?.user as any)?.role === 'superadmin';

  const [communications, setCommunications] = useState<Communication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<CommsFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Assigned Application Email state
  const [assignedEmail, setAssignedEmail] = useState<string | null>(null);
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string>('checking');
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [adminBypass, setAdminBypass] = useState(false);

  // Admin seed state
  const [seeding, setSeeding] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch assigned email account
  const fetchAssignedEmail = useCallback(async () => {
    try {
      const res = await fetch('/api/communications/account');
      if (res.ok) {
        const data = await res.json();
        setAssignedEmail(data.assignedEmail || null);
        setSuggestedEmail(data.suggestedEmail || null);
        setEmailStatus(data.status || (data.assignedEmail ? 'active' : 'unassigned'));
      } else {
        setEmailStatus('unassigned');
      }
    } catch (error) {
      console.error('Failed to fetch assigned email:', error);
      setEmailStatus('unassigned');
    }
  }, []);

  // Fetch communications
  const fetchCommunications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.jobId) params.set('jobId', filter.jobId);
      if (filter.direction) params.set('direction', filter.direction);
      if (filter.classification) params.set('classification', filter.classification);
      if (filter.status) params.set('status', filter.status);
      params.set('limit', '100');

      const res = await fetch(`/api/communications?${params}`);
      if (res.ok) {
        const data = await res.json();
        const list: Communication[] =
          data.communications || data.data?.communications || [];
        setCommunications(list);
        setTotalUnread(data.unreadCount ?? data.data?.unreadCount ?? 0);

        // Keep selected email updated if exists in list without breaking referential identity
        setSelectedComm((prev) => {
          if (!prev) return null;
          const fresh = list.find((c) => c._id === prev._id);
          if (!fresh) return prev;
          if (
            fresh.isRead === prev.isRead &&
            fresh.isStarred === prev.isStarred &&
            fresh.status === prev.status
          ) {
            return prev;
          }
          return fresh;
        });
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter.jobId, filter.direction, filter.classification, filter.status]);

  // Fetch jobs for filter dropdown (both tracker applications & jobs)
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?limit=200&lite=true');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  }, []);

  // Fetch unread counts per job
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/communications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data.counts || data.data?.counts || {});
      }
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchAssignedEmail();
    fetchCommunications();
    fetchJobs();
    fetchUnreadCounts();
  }, [fetchAssignedEmail, fetchCommunications, fetchJobs, fetchUnreadCounts]);

  // Generate / Assign Application Email
  const handleGenerateEmail = async () => {
    setGeneratingEmail(true);
    try {
      const res = await fetch('/api/communications/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.assignedEmail) {
          setAssignedEmail(data.assignedEmail);
          setEmailStatus(data.status || 'active');
          setActionNotice({
            type: 'success',
            message: `Application email created: ${data.assignedEmail}`,
          });
          setTimeout(() => setActionNotice(null), 5000);
        }
      }
    } catch (error) {
      console.error('Failed to generate application email:', error);
      setActionNotice({ type: 'error', message: 'Failed to generate application email' });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setGeneratingEmail(false);
    }
  };

  // Copy email to clipboard
  const handleCopyEmail = () => {
    if (!assignedEmail) return;
    navigator.clipboard.writeText(assignedEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Sync emails
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/communications/sync', { method: 'POST' });
      if (res.ok) {
        await fetchCommunications();
        await fetchUnreadCounts();
        setActionNotice({ type: 'success', message: 'Synced inbox with mail server' });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setActionNotice({ type: 'error', message: 'Failed to sync inbox' });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  // Admin: Seed Mock Application Emails
  const handleSeedMockEmails = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/communications/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionNotice({
          type: 'success',
          message: data.message || 'Seeded mock application emails successfully',
        });
        setAdminBypass(true);
        await fetchCommunications();
        await fetchJobs();
        await fetchUnreadCounts();
        await fetchAssignedEmail();
        setTimeout(() => setActionNotice(null), 5000);
      } else {
        const err = await res.json();
        setActionNotice({ type: 'error', message: err.error || 'Failed to seed emails' });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (error: any) {
      console.error('Seed mock emails error:', error);
      setActionNotice({ type: 'error', message: 'Failed to seed mock emails' });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setSeeding(false);
    }
  };

  // Mark as read
  const handleMarkRead = async (commId: string) => {
    try {
      await fetch(`/api/communications/${commId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      setCommunications((prev) =>
        prev.map((c) => (c._id === commId ? { ...c, isRead: true } : c))
      );
      setSelectedComm((prev) => (prev?._id === commId ? { ...prev, isRead: true } : prev));
      setTotalUnread((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Toggle star
  const handleToggleStar = async (commId: string, currentStarred: boolean) => {
    try {
      await fetch(`/api/communications/${commId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !currentStarred }),
      });
      setCommunications((prev) =>
        prev.map((c) => (c._id === commId ? { ...c, isStarred: !currentStarred } : c))
      );
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  // Client-side search filtering
  const filteredCommunications = useMemo(() => {
    if (!searchQuery.trim()) return communications;
    const q = searchQuery.toLowerCase().trim();
    return communications.filter(
      (c) =>
        c.subject?.toLowerCase().includes(q) ||
        c.senderEmail?.toLowerCase().includes(q) ||
        c.senderName?.toLowerCase().includes(q) ||
        c.bodySnippet?.toLowerCase().includes(q)
    );
  }, [communications, searchQuery]);

  // Classification summary count
  const classificationCounts = useMemo(() => {
    return communications.reduce((acc, c) => {
      acc[c.classification] = (acc[c.classification] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [communications]);

  // 1. Loading Skeleton while checking account status
  if (emailStatus === 'checking') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#121811] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center animate-pulse">
            <Mail className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse" />
          <div className="h-3 w-64 bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // 2. Full Step Before UI: Dedicated Application Email Setup (When not linked)
  if (!assignedEmail && !adminBypass) {
    return (
      <div className="flex flex-col h-auto bg-white dark:bg-[#121811] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden relative">
        {/* Subtle animated accent shimmer line across the top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent animate-pulse pointer-events-none" />

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
          <div className="max-w-xl w-full text-center space-y-6">
            {/* Step badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Step 1 • Dedicated Application Email</span>
            </div>

            {/* Icon with subtle aura */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-lime-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:via-lime-500/10 dark:to-teal-500/10 border border-emerald-300/60 dark:border-emerald-700/60 flex items-center justify-center text-[#013f2e] dark:text-[#36D39B] shadow-2xs mx-auto">
              <Mail className="w-8 h-8" />
            </div>

            {/* Heading & description */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Create your dedicated application email
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
                Generate a private email address linked directly to your applications. Interview invites, recruiter communications, and status updates sync automatically into this inbox.
              </p>
            </div>

            {/* Suggested address preview */}
            {suggestedEmail && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300 font-mono">
                <span className="text-gray-400 dark:text-gray-500 font-sans">Suggested address:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{suggestedEmail}</span>
              </div>
            )}

            {/* Benefits 3-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left my-1">
              <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/10 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                  <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Auto Recruiter Sync</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Inbound emails and interview invites automatically map to your tracked applications.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/10 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Private &amp; Dedicated</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Keeps your personal inbox clutter-free with zero spam and dedicated sender reputation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-200/70 dark:border-white/10 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>1-Click Generation</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Generated in seconds. Fully configured with private domain verification and automated sync.
                </p>
              </div>
            </div>

            {/* Action Button (Subtle, NO bounce animation) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <button
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#013f2e] hover:bg-[#025c43] dark:bg-[#36D39B] dark:text-gray-950 dark:hover:bg-[#2ec58f] rounded-xl shadow-xs hover:shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer w-full sm:w-auto"
              >
                {generatingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Application Email...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Application Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Notice / error message if any */}
            {actionNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between border w-full text-left ${
                  actionNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {actionNotice.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{actionNotice.message}</span>
                </div>
                <button
                  onClick={() => setActionNotice(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Admin options */}
            {isAdmin && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
                <button
                  onClick={handleSeedMockEmails}
                  disabled={seeding}
                  className="text-purple-700 dark:text-purple-400 hover:underline inline-flex items-center gap-1.5 font-medium"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
                  <span>(Admin) Seed mock emails</span>
                </button>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <button
                  onClick={() => setAdminBypass(true)}
                  className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:underline"
                >
                  (Admin) Preview inbox UI
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121811] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
      {/* 1. Header Toolbar with Application Email */}
      <div className="px-5 py-3.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Inbox
            </h3>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-700/50 rounded-full">
                {totalUnread} unread
              </span>
            )}
          </div>

          {/* Assigned Email Pill (When linked) */}
          {assignedEmail && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-white/10">
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1a230f] border border-gray-200 dark:border-emerald-800/40 text-xs text-gray-700 dark:text-gray-300 shadow-2xs"
                title="Dedicated application email for recruiter communications"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-gray-900 dark:text-white font-medium">
                  {assignedEmail}
                </span>
                <button
                  onClick={handleCopyEmail}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                  title="Copy assigned email"
                >
                  {copiedEmail ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Admin Preview Mode Pill */}
          {adminBypass && !assignedEmail && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-white/10">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                Admin Preview Mode
              </span>
              <button
                onClick={() => setAdminBypass(false)}
                className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
              >
                Back to Setup
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Admin Mock Seed Button */}
          {isAdmin && (
            <button
              onClick={handleSeedMockEmails}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
              title="Seed mock recruiter emails linked to tracker jobs (Admin only)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Seeding...' : 'Seed Mock Emails'}</span>
            </button>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-2xs disabled:opacity-50"
            title="Sync latest emails from mail server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Inbox'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner (if any) */}
      {actionNotice && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Assigned Email Bar (When linked) */}
      {assignedEmail && (
        <div className="sm:hidden px-4 py-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01]">
          <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
            <span className="font-mono text-gray-900 dark:text-white truncate">
              {assignedEmail}
            </span>
            <button
              onClick={handleCopyEmail}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-medium pl-2"
            >
              {copiedEmail ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* 2. Search & Filters Bar (Inline) */}
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#121811] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search emails by subject, sender, or snippet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B] transition-colors h-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Clear search"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs shrink-0">
          {/* Direction filter */}
          <select
            value={filter.direction || ''}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, direction: e.target.value || undefined }))
            }
            className="h-8 px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#182216] border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B]"
          >
            <option value="">All directions</option>
            <option value="inbound">Inbound (Received)</option>
            <option value="outbound">Outbound (Sent)</option>
          </select>

          {/* Classification filter */}
          <select
            value={filter.classification || ''}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                classification: e.target.value || undefined,
              }))
            }
            className="h-8 px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#182216] border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B]"
          >
            <option value="">All types</option>
            <option value="INTERVIEW_INVITATION">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="APPLICATION_ACKNOWLEDGEMENT">Acknowledged</option>
            <option value="APPLICATION_UPDATE">Update</option>
            <option value="REQUEST_FOR_INFORMATION">Info Request</option>
            <option value="ASSESSMENT">Assessment</option>
            <option value="RECRUITER_MESSAGE">Recruiter</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="REJECTION">Rejected</option>
          </select>

          {/* Job filter */}
          {jobs.length > 0 && (
            <select
              value={filter.jobId || ''}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, jobId: e.target.value || undefined }))
              }
              className="h-8 px-2.5 py-1 text-xs bg-gray-50 dark:bg-[#182216] border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B] max-w-[180px] truncate"
            >
              <option value="">All tracker jobs</option>
              {jobs.map((j) => {
                const title = j.jobTitle || j.title || 'Untitled Role';
                const company =
                  typeof j.company === 'string'
                    ? j.company
                    : j.company?.name || 'Company';
                return (
                  <option key={j._id} value={j._id}>
                    {title} @ {company}
                  </option>
                );
              })}
            </select>
          )}

          {/* Reset Filters */}
          {(filter.direction || filter.classification || filter.jobId || searchQuery) && (
            <button
              onClick={() => {
                setFilter({});
                setSearchQuery('');
              }}
              className="h-8 px-2 py-1 text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Classification Summary Badges */}
      {Object.keys(classificationCounts).length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01] flex items-center gap-2 flex-wrap flex-shrink-0">
          {Object.entries(classificationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([cls, count]) => {
              const config =
                CLASSIFICATION_CONFIG[cls] || CLASSIFICATION_CONFIG.UNKNOWN;
              const Icon = config.icon;
              return (
                <button
                  key={cls}
                  onClick={() =>
                    setFilter((prev) => ({
                      ...prev,
                      classification: prev.classification === cls ? undefined : cls,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] rounded-full font-medium transition-all ${
                    config.className
                  } ${
                    filter.classification === cls
                      ? 'ring-2 ring-offset-1 ring-emerald-500'
                      : 'hover:opacity-80'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>
                    {config.label}: {count}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {/* 4. Main Two-Column View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: List or Skeleton / Empty */}
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-white/10 overflow-y-auto">
          {loading ? (
            /* Skeleton Loading State */
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] animate-pulse space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10" />
                      <div className="w-32 h-3.5 rounded bg-gray-200 dark:bg-white/10" />
                      <div className="w-16 h-3.5 rounded-full bg-gray-200 dark:bg-white/10" />
                    </div>
                    <div className="w-10 h-3 rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                  <div className="w-3/4 h-3.5 rounded bg-gray-200 dark:bg-white/10" />
                  <div className="w-full h-3 rounded bg-gray-200 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : filteredCommunications.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-[#013f2e] dark:text-[#36D39B] mb-4 shadow-sm">
                <Inbox className="w-8 h-8" />
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">
                {searchQuery || filter.direction || filter.classification || filter.jobId
                  ? 'No matching communications found'
                  : 'No communications yet'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
                {searchQuery || filter.direction || filter.classification || filter.jobId
                  ? 'Try clearing your search query or relaxing your filter selection.'
                  : 'When you submit applications or recruiters follow up, interview invites and application updates will sync automatically to your communications inbox.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {searchQuery || filter.direction || filter.classification || filter.jobId ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilter({});
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    Clear filters
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#013f2e] dark:bg-[#36D39B] dark:text-gray-950 rounded-xl hover:opacity-90 transition-all shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Syncing...' : 'Sync Inbox'}</span>
                    </button>


                    {isAdmin && (
                      <button
                        onClick={handleSeedMockEmails}
                        disabled={seeding}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{seeding ? 'Seeding emails...' : 'Seed Mock Emails (Admin Demo)'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Populated Email List */
            filteredCommunications.map((comm) => (
              <EmailRow
                key={comm._id}
                communication={comm}
                isSelected={selectedComm?._id === comm._id}
                onSelect={() => {
                  setSelectedComm(comm);
                  if (!comm.isRead) handleMarkRead(comm._id);
                }}
                onToggleStar={() => handleToggleStar(comm._id, comm.isStarred)}
              />
            ))
          )}
        </div>

        {/* Right Column: Email Detail View or Skeleton / Placeholder */}
        <div className="w-[420px] lg:w-[500px] flex-shrink-0 flex flex-col bg-white dark:bg-[#121811] overflow-hidden">
          {loading ? (
            /* Detail Skeleton */
            <div className="p-6 space-y-5 animate-pulse flex-1">
              <div className="flex items-center justify-between">
                <div className="w-24 h-5 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="w-16 h-7 rounded-lg bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="w-3/4 h-5 rounded bg-gray-200 dark:bg-white/10" />
                <div className="w-1/2 h-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <div className="w-1/3 h-3 rounded bg-gray-200 dark:bg-white/10" />
              </div>
              <div className="space-y-2.5 pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="w-full h-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <div className="w-full h-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <div className="w-4/5 h-3.5 rounded bg-gray-200 dark:bg-white/10" />
                <div className="w-2/3 h-3.5 rounded bg-gray-200 dark:bg-white/10" />
              </div>
            </div>
          ) : selectedComm ? (
            /* Selected Email View */
            <EmailDetail
              communication={selectedComm}
              onClose={() => setSelectedComm(null)}
              onReply={() => {
                // Future compose reply action
              }}
            />
          ) : (
            /* Unselected Placeholder */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                <Mail className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Select an email to view details
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                Review message headers, intent classification, recruiter replies, and linked application details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Email Row Component (Crisp contrast in Light & Dark modes)
// ============================================================================

function EmailRow({
  communication: comm,
  isSelected,
  onSelect,
  onToggleStar,
}: {
  communication: Communication;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  const config =
    CLASSIFICATION_CONFIG[comm.classification] || CLASSIFICATION_CONFIG.UNKNOWN;
  const Icon = config.icon;
  const DirectionIcon = comm.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;
  const directionColor =
    comm.direction === 'inbound'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-blue-600 dark:text-blue-400';

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3.5 border-b border-gray-100 dark:border-white/5 cursor-pointer transition-all ${
        isSelected
          ? 'bg-emerald-50/80 dark:bg-[#1a230f]/80 border-l-4 border-l-[#013f2e] dark:border-l-[#36D39B]'
          : !comm.isRead
          ? 'bg-emerald-50/30 dark:bg-white/[0.03] hover:bg-emerald-50/60 dark:hover:bg-white/[0.06] border-l-4 border-l-emerald-600 dark:border-l-[#36D39B]'
          : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.03] border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Direction + Unread dot */}
        <div className="mt-1 flex flex-col items-center gap-1.5 flex-shrink-0">
          <DirectionIcon className={`w-3.5 h-3.5 ${directionColor}`} />
          {!comm.isRead && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full" title="Unread" />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span
                className={`text-xs truncate ${
                  !comm.isRead
                    ? 'text-gray-900 dark:text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300 font-medium'
                }`}
              >
                {comm.senderName || comm.senderEmail}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full font-medium ${config.className}`}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{config.label}</span>
              </span>
              {comm.isAutomated && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10 font-medium">
                  <Bot className="w-2.5 h-2.5" />
                  Auto
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar();
                }}
                className={`p-1 rounded transition-colors ${
                  comm.isStarred
                    ? 'text-amber-500'
                    : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-300'
                }`}
                title={comm.isStarred ? 'Starred' : 'Star message'}
              >
                <Star
                  className="w-3.5 h-3.5"
                  fill={comm.isStarred ? 'currentColor' : 'none'}
                />
              </button>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {formatTimeAgo(comm.receivedAt)}
              </span>
            </div>
          </div>

          <p
            className={`text-xs mt-1 truncate ${
              !comm.isRead
                ? 'text-gray-900 dark:text-white font-semibold'
                : 'text-gray-800 dark:text-gray-200 font-medium'
            }`}
          >
            {comm.subject}
          </p>

          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
            {comm.bodySnippet}
          </p>

          {/* Job Association or Attachments badge */}
          {(comm.jobId || (comm.hasAttachments && comm.attachments?.length > 0)) && (
            <div className="flex items-center gap-3 mt-1.5">
              {comm.jobId && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                  <Briefcase className="w-3 h-3 text-[#013f2e] dark:text-[#36D39B]" />
                  <span>Linked to application</span>
                </div>
              )}
              {comm.hasAttachments && comm.attachments?.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                  <FileText className="w-3 h-3 text-blue-500" />
                  <span>
                    {comm.attachments.length} file
                    {comm.attachments.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Email Detail View Component
// ============================================================================

function EmailDetail({
  communication: comm,
  onClose,
  onReply,
}: {
  communication: Communication;
  onClose: () => void;
  onReply: () => void;
}) {
  const config =
    CLASSIFICATION_CONFIG[comm.classification] || CLASSIFICATION_CONFIG.UNKNOWN;
  const Icon = config.icon;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Detail Header */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/[0.01] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium ${config.className}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
          </span>
          {comm.classificationConfidence && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
              {Math.round(comm.classificationConfidence * 100)}% match
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            title="Close detail view"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subject & Participant Info */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-white/10 space-y-2 flex-shrink-0">
        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
          {comm.subject}
        </h3>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">
              From:
            </span>
            <span className="text-gray-900 dark:text-gray-100 break-all font-medium">
              {comm.senderName
                ? `${comm.senderName} <${comm.senderEmail}>`
                : comm.senderEmail}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">
              To:
            </span>
            <span className="text-gray-800 dark:text-gray-300 break-all">
              {comm.recipients?.map((r) => r.email).join(', ') || 'Me'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400 w-12 flex-shrink-0">
              Date:
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {new Date(comm.receivedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-white dark:bg-[#121811]">
        {/* TODO: Re-enable HTML rendering once isomorphic-dompurify is added.
            htmlBody comes from arbitrary external senders and must be sanitized
            before use with dangerouslySetInnerHTML to prevent stored XSS.
            Until then, fall through to the plain-text branch for all messages. */}
        <div className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
          {comm.textBody || comm.htmlBody || comm.bodySnippet}
        </div>
      </div>


      {/* Linked Job Tracker Card */}
      {comm.jobId && (
        <div className="px-5 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Briefcase className="w-4 h-4 text-[#013f2e] dark:text-[#36D39B] flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                Linked to Tracker Job
              </span>
            </div>
            <a
              href={`/dashboard/jobs?tab=applications&jobId=${comm.jobId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#013f2e] dark:text-[#36D39B] hover:underline"
            >
              <span>View Job in Tracker</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Attachments Section */}
      {comm.hasAttachments && comm.attachments?.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] flex-shrink-0">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Attachments ({comm.attachments.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {comm.attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-800 dark:text-gray-200 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="font-medium truncate max-w-[180px]">{att.filename}</span>
                <span className="text-[10px] text-gray-400">({formatFileSize(att.size)})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { CHIP_INLINE, CHIP_TONES, chipTone, type ChipTone } from '@/components/ui/chip-styles';
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
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  Copy,
  Check,
  Shield,
  Reply,
  Forward,
  Paperclip,
  Loader2,
  X,
  Wand2,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';

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
  threadId?: string;
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
  /** A logo already resolved and persisted by a previous view, when the API returns it. */
  companyLogo?: string | null;
}

interface CommsFilter {
  jobId?: string;
  direction?: string;
  classification?: string;
  status?: string;
}

/**
 * A reply or forward being composed in the reading pane.
 *
 * `inReplyTo` / `jobId` / `applicationId` are carried over from the message being answered, so the
 * outbound record lands in the same thread and stays linked to its application.
 */
interface ComposeDraft {
  mode: 'reply' | 'forward';
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  jobId?: string;
  applicationId?: string;
}

// ============================================================================
// Classification Badge Configuration (High-contrast for both Light and Dark)
// ============================================================================

/**
 * Classification chips. Hues live in `CHIP_TONES` — this table only picks one,
 * so the chip recipe has a single definition instead of a second copy here.
 */
const CLASSIFICATION_CONFIG: Record<
  string,
  { label: string; tone: ChipTone; icon: any }
> = {
  APPLICATION_ACKNOWLEDGEMENT: {
    label: 'Acknowledged',
    tone: 'emerald',
    icon: CheckCircle,
  },
  APPLICATION_UPDATE: {
    label: 'Update',
    tone: 'blue',
    icon: RefreshCw,
  },
  REJECTION: {
    label: 'Rejected',
    tone: 'rose',
    icon: XCircle,
  },
  INTERVIEW_INVITATION: {
    label: 'Interview',
    tone: 'purple',
    icon: Calendar,
  },
  INTERVIEW_CONFIRMATION: {
    label: 'Interview',
    tone: 'purple',
    icon: Calendar,
  },
  ASSESSMENT: {
    label: 'Assessment',
    tone: 'amber',
    icon: FileText,
  },
  RECRUITER_MESSAGE: {
    label: 'Recruiter',
    tone: 'cyan',
    icon: MessageSquare,
  },
  REQUEST_FOR_INFORMATION: {
    label: 'Info Request',
    tone: 'amber',
    icon: AlertCircle,
  },
  OFFER: {
    label: 'Offer',
    tone: 'green',
    icon: CheckCircle,
  },
  FOLLOW_UP: {
    label: 'Follow-up',
    tone: 'orange',
    icon: Clock,
  },
  GENERAL_RECRUITING: {
    label: 'Recruiting',
    tone: 'slate',
    icon: Briefcase,
  },
  MARKETING: {
    label: 'Marketing',
    tone: 'neutral',
    icon: Mail,
  },
  SYSTEM: {
    label: 'System',
    tone: 'neutral',
    icon: Bot,
  },
  UNKNOWN: {
    label: 'Unknown',
    tone: 'neutral',
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

  // Mark read / unread. Both directions are needed: opening a message marks it read, and the reading
  // pane offers "mark unread" to put it back in the queue.
  const handleSetReadState = async (commId: string, isRead: boolean) => {
    // Guard the unread counter — only move it when the state actually changes.
    const current = communications.find((c) => c._id === commId);
    if (current && current.isRead === isRead) return;

    try {
      await fetch(`/api/communications/${commId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      });
      setCommunications((prev) =>
        prev.map((c) => (c._id === commId ? { ...c, isRead } : c))
      );
      setSelectedComm((prev) => (prev?._id === commId ? { ...prev, isRead } : prev));
      setTotalUnread((prev) => (isRead ? Math.max(0, prev - 1) : prev + 1));
    } catch (error) {
      console.error('Failed to update read state:', error);
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
            <div className={`${chipTone('emerald', 'md')} font-semibold`}>
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
    /* `flex-1 min-h-0` (not `h-full`): this panel is a flex item of the fixed-height
       wrapper in JobsDashboard, so flex sizing hands it exactly the space available,
       while `min-h-0` is what stops its own content from forcing it taller than that
       box — a flex item's automatic minimum size would otherwise win, the panel would
       overflow, and the shell's `overflow-hidden` would clip it with no scrollbar. */
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#121811] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
      {/* 1. Header Toolbar with Application Email */}
      <div className="px-5 py-3.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Inbox
            </h3>
            {totalUnread > 0 && (
              <span className={`${CHIP_INLINE} ${CHIP_TONES.emerald} font-semibold`}>
                {totalUnread} unread
              </span>
            )}
          </div>

          {/* Classification summary chips — moved up here from their own strip, so the
              header carries the filters and the panel is one bar shorter. Each chip is
              also the classification filter (click to toggle).
              `flex-wrap` + `min-w-0` on the group: six chips are wider than a narrow
              panel, and without these they would push the header into horizontal
              overflow instead of wrapping. */}
          {Object.keys(classificationCounts).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
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
                      className={`${CHIP_INLINE} ${CHIP_TONES[config.tone]} font-medium ${
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
              <span className={`${CHIP_INLINE} ${CHIP_TONES.purple} font-medium`}>
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

      {/* The classification summary chips used to sit here as their own strip between the
          filters and the list. They now live in the header row beside the "Inbox" title, so
          the panel has one consolidated header instead of three stacked bars. */}

      {/* 4. Main Two-Column View — the list is a fixed-width column and the reading pane takes the
          remaining space, so a message body gets the width it needs to be readable. */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Column: message list. On narrow screens the two panes take turns — selecting a
            message swaps the list out for the reading pane, and Back swaps it back. */}
        <div
          className={`${
            selectedComm ? 'hidden sm:flex' : 'flex'
          } w-full sm:w-[320px] lg:w-[360px] xl:w-[400px] flex-shrink-0 flex-col border-r border-gray-200 dark:border-white/10 overflow-y-auto`}
        >
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
            filteredCommunications.map((comm) => {
              const threadCount = communications.filter(
                (c) =>
                  c._id === comm._id ||
                  (comm.threadId && c.threadId && c.threadId === comm.threadId) ||
                  (comm.jobId && c.jobId && String(c.jobId) === String(comm.jobId)) ||
                  (c.inReplyTo && (c.inReplyTo === comm.messageId || c.messageId === comm.inReplyTo))
              ).length;
              return (
                <EmailRow
                  key={comm._id}
                  communication={comm}
                  threadCount={threadCount}
                  jobs={jobs}
                  isSelected={selectedComm?._id === comm._id}
                  onSelect={() => {
                    setSelectedComm(comm);
                    if (!comm.isRead) handleSetReadState(comm._id, true);
                  }}
                  onToggleStar={() => handleToggleStar(comm._id, comm.isStarred)}
                />
              );
            })
          )}
        </div>

        {/* Right Column: reading pane. `flex-1 min-w-0` — without `min-w-0` a flex item refuses to
            shrink below its content width, and a long unbroken subject would push the pane wide. */}
        <div
          className={`${
            selectedComm ? 'flex' : 'hidden sm:flex'
          } flex-1 min-w-0 flex-col bg-white dark:bg-[#121811] overflow-hidden`}
        >
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
              allCommunications={communications}
              jobs={jobs}
              assignedEmail={assignedEmail || ''}
              candidateName={session?.user?.name || 'You'}
              onClose={() => setSelectedComm(null)}
              onToggleStar={() => handleToggleStar(selectedComm._id, selectedComm.isStarred)}
              onSetReadState={(isRead) => handleSetReadState(selectedComm._id, isRead)}
              onThreadUpdated={async () => {
                await fetchCommunications();
                await fetchUnreadCounts();
                setActionNotice({ type: 'success', message: 'Reply sent' });
                setTimeout(() => setActionNotice(null), 4000);
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
  threadCount,
  jobs,
  isSelected,
  onSelect,
  onToggleStar,
}: {
  communication: Communication;
  threadCount?: number;
  jobs: Job[];
  isSelected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  const config =
    CLASSIFICATION_CONFIG[comm.classification] || CLASSIFICATION_CONFIG.UNKNOWN;
  const Icon = config.icon;
  const isInbound = comm.direction === 'inbound';
  const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
  const attachments = comm.hasAttachments ? comm.attachments || [] : [];

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative w-full px-4 py-3.5 border-b border-gray-100 dark:border-white/5 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-emerald-50/80 dark:bg-[#1a230f]/80'
          : !comm.isRead
            ? 'bg-emerald-50/25 dark:bg-white/[0.03] hover:bg-emerald-50/50 dark:hover:bg-white/[0.06]'
            : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.03]'
      }`}
    >
      {/* Selection accent as its own element, so the row keeps a plain background underneath it. */}
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          isSelected
            ? 'bg-[#013f2e] dark:bg-[#36D39B]'
            : !comm.isRead
              ? 'bg-emerald-400/70 dark:bg-[#36D39B]/60'
              : 'bg-transparent'
        }`}
      />

      <div className="flex gap-3">
        {/* Avatar. A sender disc is most of what makes a list read as mail rather than as records.
            The wrapper stays `relative` so the direction badge keeps its corner, and `flex` so the
            avatar is a flex item: an inline-level box would sit on the text baseline and add
            descender space, shifting the badge and the row height. */}
        <div className="relative flex flex-shrink-0">
          <SenderAvatar comm={comm} jobs={jobs} size={36} />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-[#121811] ${
              isInbound ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            title={isInbound ? 'Received' : 'Sent'}
          >
            <DirectionIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[13px] truncate ${
                !comm.isRead
                  ? 'font-bold text-gray-900 dark:text-white'
                  : 'font-medium text-gray-700 dark:text-gray-300'
              }`}
            >
              {comm.senderName || comm.senderEmail}
            </span>
            {!comm.isRead && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"
                title="Unread"
              />
            )}
            <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0">
              {formatTimeAgo(comm.receivedAt)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
              className={`p-0.5 rounded transition-colors flex-shrink-0 ${
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
          </div>

          <p
            className={`text-[13px] mt-0.5 truncate ${
              !comm.isRead
                ? 'font-semibold text-gray-900 dark:text-white'
                : 'font-medium text-gray-800 dark:text-gray-200'
            }`}
          >
            {comm.subject}
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
            {comm.bodySnippet}
          </p>

          {/* Meta row: our classification, the application link, and attachments. */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`${CHIP_INLINE} ${CHIP_TONES[config.tone]} font-medium`}>
              <Icon className="w-2.5 h-2.5" />
              <span>{config.label}</span>
            </span>

            {threadCount && threadCount > 1 ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full"
                title={`${threadCount} messages in thread`}
              >
                <MessageSquare className="w-2.5 h-2.5" />
                <span>{threadCount}</span>
              </span>
            ) : null}

            {comm.isAutomated && (
              <span className={`${CHIP_INLINE} ${CHIP_TONES.neutral} font-medium`}>
                <Bot className="w-2.5 h-2.5" />
                Auto
              </span>
            )}

            {comm.jobId && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[#013f2e] dark:text-[#36D39B]"
                title="Linked to a tracker application"
              >
                <Briefcase className="w-3 h-3" />
                <span>Application</span>
              </span>
            )}

            {attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                <Paperclip className="w-3 h-3" />
                <span>
                  {attachments.length} file{attachments.length > 1 ? 's' : ''}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Email Detail View Component
// ============================================================================

interface EmailDetailProps {
  communication: Communication;
  allCommunications: Communication[];
  jobs: Job[];
  assignedEmail: string;
  candidateName: string;
  onClose: () => void;
  onToggleStar: () => void;
  onSetReadState: (isRead: boolean) => void;
  onThreadUpdated?: (newComm: any) => void;
}

const RECREATE_PRESETS = [
  { id: 'formal', label: '✨ Professional', tone: 'formal', instruction: 'Write a professional, compelling, and courteous response.' },
  { id: 'concise', label: '⚡ Concise', tone: 'concise', instruction: 'Keep it very concise, under 3 short sentences, direct and clear.' },
  { id: 'availability', label: '📅 Confirm Times', tone: 'formal', instruction: 'Confirm enthusiasm and provide flexible availability for an interview or call.' },
  { id: 'questions', label: '❓ Ask Details', tone: 'formal', instruction: 'Thank them and ask politely for more information about the interview structure, timeline, or team.' },
  { id: 'custom', label: '💬 Custom Prompt', tone: 'formal', instruction: '' },
];

function getInitialDraftBody(
  comm: Communication,
  jobTitle?: string,
  companyName?: string,
  candidateName?: string
): string {
  const recruiter = comm.senderName || 'Hiring Team';
  const job = jobTitle || 'the position';
  const company = companyName || 'your company';
  const user = candidateName || 'Best regards';

  if (comm.classification === 'INTERVIEW_INVITATION') {
    return `Dear ${recruiter},

Thank you so much for the invitation to interview for the ${job} role at ${company}. I am very excited about this opportunity and would love to speak with the team!

I would be happy to coordinate a time that works best. Please let me know which time slots work best for your team.

Thank you again for your time and consideration.

Best regards,
${user}`;
  }

  if (comm.classification === 'REQUEST_FOR_INFORMATION') {
    return `Dear ${recruiter},

Thank you for following up regarding my application for the ${job} position at ${company}.

I am glad to provide the requested information. Please let me know if you need any additional details or documentation from my end.

Best regards,
${user}`;
  }

  if (comm.classification === 'APPLICATION_ACKNOWLEDGEMENT' || comm.classification === 'APPLICATION_UPDATE') {
    return `Dear ${recruiter},

Thank you for the update regarding my application for the ${job} position at ${company}.

I remain very interested in the role and look forward to learning more about the next steps in the process.

Best regards,
${user}`;
  }

  return `Dear ${recruiter},

Thank you for your message regarding the ${job} position at ${company}.

I would welcome the opportunity to discuss how my background aligns with your team's goals. Please let me know if you have any questions.

Best regards,
${user}`;
}

function EmailDetail({
  communication: comm,
  allCommunications,
  jobs,
  assignedEmail,
  candidateName,
  onClose,
  onToggleStar,
  onSetReadState,
  onThreadUpdated,
}: EmailDetailProps) {
  // Resolve linked job details
  const linkedJob = useMemo(() => {
    if (!comm.jobId) return null;
    return jobs.find((j) => String(j._id) === String(comm.jobId)) || null;
  }, [comm.jobId, jobs]);

  const companyName = useMemo(() => {
    if (!linkedJob) {
      if (comm.senderName?.includes('(') && comm.senderName?.includes(')')) {
        const match = comm.senderName.match(/\((.*?)\)/);
        if (match) return match[1];
      }
      return 'Company';
    }
    return typeof linkedJob.company === 'string'
      ? linkedJob.company
      : linkedJob.company?.name || 'Company';
  }, [linkedJob, comm.senderName]);

  const jobTitle = useMemo(() => {
    if (linkedJob?.jobTitle || linkedJob?.title) {
      return linkedJob.jobTitle || linkedJob.title;
    }
    const cleanSubj = comm.subject
      .replace(/^(re|fwd|interview invitation:|application confirmed:|prep guide & agenda:|application for)\s*:?/i, '')
      .replace(/at\s+.*$/i, '')
      .replace(/-\s+.*$/i, '')
      .trim();
    return cleanSubj || 'the position';
  }, [linkedJob, comm.subject]);

  const recruiterName = useMemo(() => {
    return comm.senderName || (linkedJob?.company as any)?.contactDetails?.name || 'Recruiter';
  }, [comm.senderName, linkedJob]);

  // Initial thread from loaded list
  const [threadMessages, setThreadMessages] = useState<Communication[]>(() => {
    const related = allCommunications.filter((c) => {
      if (c._id === comm._id) return true;
      if (comm.threadId && c.threadId && c.threadId === comm.threadId) return true;
      if (comm.jobId && c.jobId && String(c.jobId) === String(comm.jobId)) return true;
      if (c.inReplyTo && (c.inReplyTo === comm.messageId || c.messageId === comm.inReplyTo)) return true;
      return false;
    });
    if (related.length === 0) return [comm];
    return related.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
  });

  const [loadingThread, setLoadingThread] = useState(false);

  // Fetch thread asynchronously from server
  useEffect(() => {
    let isMounted = true;
    const fetchThread = async () => {
      setLoadingThread(true);
      try {
        const res = await fetch(`/api/communications/thread/${comm._id}`);
        if (res.ok) {
          const data = await res.json();
          const list: Communication[] = data.data || data.communications || [];
          if (isMounted && list.length > 0) {
            setThreadMessages(list);
          }
        }
      } catch (err) {
        console.error('Failed to fetch thread:', err);
      } finally {
        if (isMounted) setLoadingThread(false);
      }
    };
    fetchThread();
    return () => {
      isMounted = false;
    };
  }, [comm._id]);

  // Draft state
  const [draftMode, setDraftMode] = useState<'reply' | 'forward'>('reply');
  const [draftTo, setDraftTo] = useState<string>(comm.direction === 'inbound' ? comm.senderEmail : '');
  const [draftSubject, setDraftSubject] = useState<string>(() => {
    return /^(re|fwd):/i.test(comm.subject.trim()) ? comm.subject : `Re: ${comm.subject}`;
  });
  const [draftBody, setDraftBody] = useState<string>(() => {
    return getInitialDraftBody(comm, jobTitle, companyName, candidateName);
  });

  // Recreate with AI state
  const [isRecreating, setIsRecreating] = useState(false);
  const [selectedTonePreset, setSelectedTonePreset] = useState<string>('formal');
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [recreateNotice, setRecreateNotice] = useState<string | null>(null);

  // Send state
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Copy feedback states
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const draftRef = useRef<HTMLDivElement>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-sync draft when selected communication changes
  useEffect(() => {
    setDraftSubject(/^(re|fwd):/i.test(comm.subject.trim()) ? comm.subject : `Re: ${comm.subject}`);
    setDraftTo(comm.direction === 'inbound' ? comm.senderEmail : '');
    setDraftBody(getInitialDraftBody(comm, jobTitle, companyName, candidateName));
    setDraftMode('reply');
    setSendError(null);
    setRecreateNotice(null);
    setShowCustomPrompt(false);
  }, [comm._id, comm.subject, comm.senderEmail, comm.direction, jobTitle, companyName, candidateName]);

  const handleScrollToDraft = () => {
    draftRef.current?.scrollIntoView({ behavior: 'smooth' });
    draftTextareaRef.current?.focus();
  };

  const handleRecreateDraft = async (toneOverride?: string, customOverride?: string) => {
    const tone = toneOverride || selectedTonePreset;
    const instruction = customOverride !== undefined ? customOverride : customInstruction;
    setIsRecreating(true);
    setSendError(null);
    setRecreateNotice(null);

    try {
      // Find latest inbound message for thread context
      const latestInbound = [...threadMessages].reverse().find((m) => m.direction === 'inbound') || comm;

      // Thread summary for AI context
      const threadSummary = threadMessages
        .map((m) => `${m.direction === 'inbound' ? 'Recruiter' : 'Candidate'}: ${(m.textBody || m.bodySnippet || '').slice(0, 250)}`)
        .join('\n');

      const res = await fetch('/api/tracker/emails/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'recreate',
          variables: {
            CANDIDATE_NAME: candidateName || 'Candidate',
            RECRUITER_NAME: latestInbound.senderName || recruiterName,
            JOB_TITLE: jobTitle,
            COMPANY_NAME: companyName,
            LAST_MESSAGE: latestInbound.textBody || latestInbound.bodySnippet || '',
            CURRENT_DRAFT: draftBody,
            CURRENT_SUBJECT: draftSubject,
            THREAD_SUMMARY: threadSummary,
            TONE_PREFERENCE: tone,
            CUSTOM_INSTRUCTION: instruction,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.subject) setDraftSubject(data.subject);
        if (data.body) setDraftBody(data.body);
        setRecreateNotice('✨ Draft rewritten with AI!');
        setTimeout(() => setRecreateNotice(null), 4000);
      } else {
        setSendError(data.error || 'Failed to rewrite draft with AI.');
      }
    } catch (err: any) {
      console.error('Recreate draft error:', err);
      setSendError('Failed to generate AI rewrite. Check your connection.');
    } finally {
      setIsRecreating(false);
    }
  };

  const handleSendDraft = async () => {
    const to = draftTo.trim() || (comm.direction === 'inbound' ? comm.senderEmail : '');
    if (!to) {
      setSendError('Please provide a recipient email address.');
      return;
    }
    if (!draftBody.trim()) {
      setSendError('Draft body cannot be empty.');
      return;
    }

    setSendingDraft(true);
    setSendError(null);

    try {
      const res = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [to],
          subject: draftSubject.trim() || '(no subject)',
          body: draftBody,
          jobId: comm.jobId,
          applicationId: comm.applicationId,
          inReplyTo: comm.messageId,
          threadId: comm.threadId || comm._id,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setSendError(data?.error || 'Failed to send email. Check mail server settings.');
        return;
      }

      // Append new message immediately to thread
      const createdComm = data.data || {
        _id: `temp-${Date.now()}`,
        direction: 'outbound',
        type: 'user_composed',
        status: 'sent',
        subject: draftSubject,
        textBody: draftBody,
        bodySnippet: draftBody.slice(0, 300),
        senderEmail: assignedEmail || 'you@buildairesume.com',
        senderName: candidateName || 'You',
        recipients: [{ email: to, type: 'to' }],
        receivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        jobId: comm.jobId,
      };

      setThreadMessages((prev) => [...prev, createdComm]);
      setDraftBody('');
      setRecreateNotice('Reply sent successfully!');
      setTimeout(() => setRecreateNotice(null), 4000);

      if (onThreadUpdated) onThreadUpdated(createdComm);
    } catch (err: any) {
      console.error('Send draft error:', err);
      setSendError('Failed to send email. Check your connection.');
    } finally {
      setSendingDraft(false);
    }
  };

  const handleResetDraft = () => {
    setDraftBody(getInitialDraftBody(comm, jobTitle, companyName, candidateName));
    setDraftSubject(/^(re|fwd):/i.test(comm.subject.trim()) ? comm.subject : `Re: ${comm.subject}`);
    setSendError(null);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(draftSubject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftBody);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(comm.senderEmail);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const recipients = comm.recipients || [];
  const toList = recipients.filter((r) => r.type === 'to' || !r.type);
  const ccList = recipients.filter((r) => r.type === 'cc');

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* 1. Subject, Sender Info & Thread Meta */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
        {/* The classification strip that used to sit above this block — chip, confidence
            and close button on its own bar — is gone. Its controls are kept but folded
            onto the subject line: deleting them outright would strand mobile users on the
            reading pane, because below `sm` the list is swapped out rather than shown
            beside the preview, so the back control is the only way to return to it.
            The classification itself is still visible per row in the message list. */}
        <div className="flex items-start gap-2">
          <button
            onClick={onClose}
            className="sm:hidden -ml-1.5 mt-0.5 p-1.5 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
            title="Back to list"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h2 className="flex-1 min-w-0 text-lg font-bold text-gray-900 dark:text-white leading-snug break-words">
            {comm.subject}
          </h2>
          <button
            onClick={onClose}
            className="hidden sm:inline-flex mt-0.5 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
            title="Close reading pane"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-3 mt-3">
          <SenderAvatar comm={comm} jobs={jobs} size={36} className="flex-shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {comm.senderName || comm.senderEmail}
              </span>
              {comm.senderName && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  &lt;{comm.senderEmail}&gt;
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 break-words">
              <span className="text-gray-400 dark:text-gray-500">To: </span>
              {toList.map((r) => r.email).join(', ') || 'Me'}
              {ccList.length > 0 && (
                <>
                  <span className="text-gray-400 dark:text-gray-500"> · Cc: </span>
                  {ccList.map((r) => r.email).join(', ')}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {new Date(comm.receivedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            {threadMessages.length > 1 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                <MessageSquare className="w-2.5 h-2.5" />
                <span>{threadMessages.length} messages</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The action toolbar that used to sit here is gone: reply, forward, star, read-state
          and copy are now icons inline on the subject line above, beside the close control. */}

      {/* 2. Scrollable Thread & Draft Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5 bg-white dark:bg-[#121811]">
        {/* Messages in chronological order */}
        {threadMessages.map((msg, index) => {
          const isInbound = msg.direction === 'inbound';
          const msgAttachments = msg.hasAttachments ? msg.attachments || [] : [];
          const msgBodyText = msg.textBody || msg.htmlBody || msg.bodySnippet || '';
          const msgParagraphs = msgBodyText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

          if (isInbound) {
            return (
              <div key={msg._id || index} className="space-y-2">
                {/* Recruiter Header */}
                <div className="flex items-center gap-2.5">
                  <SenderAvatar comm={msg} jobs={jobs} size={32} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {msg.senderName || msg.senderEmail}
                      </span>
                      {msg.senderName && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                          &lt;{msg.senderEmail}&gt;
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        <ArrowDownLeft className="w-2.5 h-2.5" />
                        <span>Received</span>
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {new Date(msg.receivedAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recruiter Message Card */}
                <div className="ml-10 rounded-2xl bg-white dark:bg-[#151c14] border border-gray-200 dark:border-white/10 p-4 shadow-2xs space-y-3">
                  {msg.subject && msg.subject !== comm.subject && (
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 pb-2 border-b border-gray-100 dark:border-white/5">
                      {msg.subject}
                    </p>
                  )}
                  <div className="space-y-2.5">
                    {msgParagraphs.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic">No text content</p>
                    ) : (
                      msgParagraphs.map((para, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap"
                        >
                          {para}
                        </p>
                      ))
                    )}
                  </div>

                  {/* Attachments */}
                  {msgAttachments.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-2">
                      {msgAttachments.map((att, attIdx) => (
                        <div
                          key={attIdx}
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs"
                        >
                          <Paperclip className="w-3 h-3 text-gray-400" />
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                            {att.filename}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatFileSize(att.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Copy Message button */}
                  <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-end">
                    <button
                      onClick={() => copyMessage(msg._id, msgBodyText)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                    >
                      {copiedMessageId === msg._id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Outbound (Candidate Sent Message)
          return (
            <div key={msg._id || index} className="space-y-2">
              {/* Candidate Header (Right Aligned - Journey Sidebar Style) */}
              <div className="flex items-center gap-2.5 justify-end">
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {candidateName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      <span>Sent</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {msg.senderEmail || assignedEmail || 'you@buildairesume.com'}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(msg.sentAt || msg.receivedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#013f2e] dark:bg-[#36D39B] text-white dark:text-gray-950 text-xs font-bold flex items-center justify-center shrink-0">
                  {(candidateName || 'Y').charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Candidate Message Card */}
              <div className="mr-10 rounded-2xl bg-gray-50/90 dark:bg-[#1a2318] border border-gray-200/80 dark:border-white/10 p-4 shadow-2xs space-y-3">
                {msg.subject && (
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-white/5">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Subject: {msg.subject}
                    </span>
                  </div>
                )}
                <div className="space-y-2.5">
                  {msgParagraphs.map((para, pIdx) => (
                    <p
                      key={pIdx}
                      className="text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap"
                    >
                      {para}
                    </p>
                  ))}
                </div>

                {/* Attachments */}
                {msgAttachments.length > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 flex flex-wrap gap-2">
                    {msgAttachments.map((att, attIdx) => (
                      <div
                        key={attIdx}
                        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs"
                      >
                        <Paperclip className="w-3 h-3 text-gray-400" />
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                          {att.filename}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatFileSize(att.size)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Copy Message button */}
                <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 flex justify-end">
                  <button
                    onClick={() => copyMessage(msg._id, msgBodyText)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                  >
                    {copiedMessageId === msg._id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* 5. Response Draft Card (Journey Sidebar Comms Style) */}
        <div
          ref={draftRef}
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] shadow-sm overflow-hidden mt-6"
        >
          {/* Draft Top Bar */}
          <div className="px-4 py-3 bg-white dark:bg-[#182216] border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#013f2e] dark:bg-[#36D39B] text-white dark:text-gray-950 text-[10px] font-bold flex items-center justify-center shrink-0">
                {(candidateName || 'Y').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                Your Response Draft
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50">
                <Sparkles className="w-2.5 h-2.5" />
                <span>AI Assisted</span>
              </span>
            </div>

            {/* Mode toggle (Reply / Forward) */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setDraftMode('reply')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  draftMode === 'reply'
                    ? 'bg-white dark:bg-[#20281d] text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Reply
              </button>
              <button
                onClick={() => setDraftMode('forward')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  draftMode === 'forward'
                    ? 'bg-white dark:bg-[#20281d] text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Forward
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Forward Recipient row */}
            {draftMode === 'forward' && (
              <div className="flex items-center gap-2">
                <span className="w-16 text-xs font-semibold text-gray-500 dark:text-gray-400">To:</span>
                <input
                  type="email"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  placeholder="recipient@company.com"
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-[#182216] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B]"
                />
              </div>
            )}

            {/* Subject row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 shrink-0">
                  Subject:
                </span>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-[#182216] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-medium focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B]"
                />
              </div>
              <button
                onClick={handleCopySubject}
                className="text-[10px] font-bold text-[#013f2e] dark:text-emerald-400 hover:underline shrink-0"
              >
                {copiedSubject ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Draft Body Textarea */}
            <div className="relative">
              <textarea
                ref={draftTextareaRef}
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={7}
                placeholder="Write your email draft or click 'Recreate' to rewrite using AI..."
                className="w-full text-xs sm:text-[13px] leading-relaxed p-3.5 rounded-xl bg-white dark:bg-[#182216] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#013f2e] dark:focus:border-[#36D39B] transition-colors resize-y"
              />
            </div>

            {/* AI Recreate Toolbar & Presets */}
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-1">
                    AI Style:
                  </span>
                  {RECREATE_PRESETS.map((p) => {
                    const isSelected = selectedTonePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedTonePreset(p.id);
                          if (p.id === 'custom') {
                            setShowCustomPrompt(true);
                          } else {
                            handleRecreateDraft(p.tone, p.instruction);
                          }
                        }}
                        disabled={isRecreating}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Recreate Button */}
                <button
                  onClick={() => handleRecreateDraft()}
                  disabled={isRecreating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 dark:bg-[#36D39B] text-white dark:text-gray-950 text-xs font-bold shadow-sm hover:opacity-95 transition disabled:opacity-50"
                  title="Rewrite the draft with AI"
                >
                  {isRecreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rewriting with AI…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Recreate</span>
                    </>
                  )}
                </button>
              </div>

              {/* Expandable Custom Instruction Input */}
              {showCustomPrompt && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRecreateDraft('formal', customInstruction);
                      }
                    }}
                    placeholder="e.g. Mention I'm available Thursday 2pm, and express excitement for the frontend lead role..."
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-emerald-300 dark:border-emerald-700/60 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleRecreateDraft('formal', customInstruction)}
                    disabled={isRecreating}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 dark:bg-[#36D39B] text-white dark:text-gray-950 text-xs font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowCustomPrompt(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Notice or Error Banner */}
            {recreateNotice && (
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{recreateNotice}</span>
              </div>
            )}
            {sendError && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Bottom Actions (Send Draft, Copy, Reset) */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendDraft}
                  disabled={sendingDraft || !draftBody.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#013f2e] dark:bg-[#36D39B] text-white dark:text-gray-950 text-xs font-bold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
                >
                  {sendingDraft ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{sendingDraft ? 'Sending…' : 'Send Draft'}</span>
                </button>

                <button
                  onClick={handleCopyDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#20281d] text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#273021] transition"
                >
                  {copiedDraft ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={handleResetDraft}
                className="text-[11px] font-medium text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>

        {/* 6. Linked Tracker Application Banner */}
        {comm.jobId && (
          <div className="px-5 py-3 border border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01]">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="w-4 h-4 text-[#013f2e] dark:text-[#36D39B] flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  Linked to tracker application: <span className="font-bold">{jobTitle}</span> @ {companyName}
                </span>
              </div>
              <a
                href={`/dashboard/jobs?tab=applications&jobId=${comm.jobId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#013f2e] dark:text-[#36D39B] hover:underline flex-shrink-0"
              >
                <span>Open in Tracker</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
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

/** "Jane Holmes" → "JH". An address with no display name → "jane.holmes@…" reads as "JH" too. */
function initialsOf(value: string): string {
  const name = (value || '').trim();
  if (!name) return '?';

  // For an address, use the local part so the initials describe the person, not the domain.
  const source = name.includes('@') ? name.split('@')[0] : name;
  const parts = source.split(/[\s._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Avatar tones. Muted pairs so a disc never competes with the classification chips.
 */
const AVATAR_TONES = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
];

/**
 * Pick a sender's avatar tone.
 *
 * Deterministic on the input: the same correspondent keeps the same colour across renders and
 * reloads. A colour that changed on every render would read as a different person.
 */
function avatarTone(seed: string): string {
  const key = (seed || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/**
 * The company behind a communication, for logo lookup.
 *
 * Prefers the company on the linked application; otherwise reads the company a recruiter puts in
 * parentheses in their display name ("Jane Holmes (Stripe)"). `name` is null when nothing
 * identifies a company — the caller then falls back to the sender's initials rather than guessing
 * at a domain.
 */
function companyOfCommunication(
  comm: Communication,
  jobs: Job[]
): { name: string | null; logoUrl: string | null; jobId: string | null } {
  const linked = comm.jobId ? jobs.find((j) => String(j._id) === String(comm.jobId)) : null;

  if (linked) {
    const name =
      typeof linked.company === 'string' ? linked.company : linked.company?.name || null;
    return { name: name || null, logoUrl: linked.companyLogo || null, jobId: String(linked._id) };
  }

  const match = comm.senderName?.match(/\((.*?)\)/);
  return { name: match ? match[1] : null, logoUrl: null, jobId: null };
}

/**
 * A communication's avatar: the company's logo when we can identify the company, the sender's
 * initials otherwise.
 *
 * A logo answers "who is this from" faster than initials — but only when it really is the sender's
 * company. So the initials remain the fallback, and they are the *sender's* initials rather than
 * the company's, which is what `fallbackLabel` is for: without it a recruiter at Airbnb would
 * fall back to "AI" instead of their own initials.
 */
function SenderAvatar({
  comm,
  jobs,
  size = 36,
  className = '',
}: {
  comm: Communication;
  jobs: Job[];
  size?: number;
  className?: string;
}) {
  const seed = comm.senderName || comm.senderEmail;
  const { name, logoUrl, jobId } = useMemo(() => companyOfCommunication(comm, jobs), [comm, jobs]);

  if (name) {
    return (
      <CompanyLogo
        company={name}
        logoUrl={logoUrl}
        jobId={jobId}
        size={size}
        fallbackLabel={initialsOf(seed)}
        className={className}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${avatarTone(
        seed
      )} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.34)) }}
      title={seed}
    >
      {initialsOf(seed)}
    </span>
  );
}

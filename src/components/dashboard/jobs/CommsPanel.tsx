'use client';

import { useState, useEffect, useCallback } from 'react';
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
  title: string;
  company?: { name: string; domain?: string };
  status: string;
}

interface CommsFilter {
  jobId?: string;
  direction?: string;
  classification?: string;
  status?: string;
}

// ============================================================================
// Classification Badge
// ============================================================================

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  APPLICATION_ACKNOWLEDGEMENT: { label: 'Acknowledged', color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle },
  APPLICATION_UPDATE: { label: 'Update', color: 'text-blue-400 bg-blue-400/10', icon: RefreshCw },
  REJECTION: { label: 'Rejected', color: 'text-red-400 bg-red-400/10', icon: XCircle },
  INTERVIEW_INVITATION: { label: 'Interview', color: 'text-purple-400 bg-purple-400/10', icon: Calendar },
  INTERVIEW_CONFIRMATION: { label: 'Interview', color: 'text-purple-400 bg-purple-400/10', icon: Calendar },
  ASSESSMENT: { label: 'Assessment', color: 'text-orange-400 bg-orange-400/10', icon: FileText },
  RECRUITER_MESSAGE: { label: 'Recruiter', color: 'text-cyan-400 bg-cyan-400/10', icon: MessageSquare },
  REQUEST_FOR_INFORMATION: { label: 'Info Request', color: 'text-yellow-400 bg-yellow-400/10', icon: AlertCircle },
  OFFER: { label: 'Offer', color: 'text-green-400 bg-green-400/10', icon: CheckCircle },
  FOLLOW_UP: { label: 'Follow-up', color: 'text-amber-400 bg-amber-400/10', icon: Clock },
  GENERAL_RECRUITING: { label: 'Recruiting', color: 'text-slate-400 bg-slate-400/10', icon: Briefcase },
  MARKETING: { label: 'Marketing', color: 'text-gray-400 bg-gray-400/10', icon: Mail },
  SYSTEM: { label: 'System', color: 'text-gray-400 bg-gray-400/10', icon: Bot },
  UNKNOWN: { label: 'Unknown', color: 'text-gray-400 bg-gray-400/10', icon: Mail },
};

// ============================================================================
// CommsPanel Component
// ============================================================================

export default function CommsPanel({ metrics }: { metrics?: any }) {
  const { data: session } = useSession();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<CommsFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

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
        setCommunications(data.communications || []);
        setTotalUnread(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch communications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch jobs for filter dropdown
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
        setUnreadCounts(data.counts || {});
      }
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchCommunications();
    fetchJobs();
    fetchUnreadCounts();
  }, [fetchCommunications, fetchJobs, fetchUnreadCounts]);

  // Sync from Stalwart
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/communications/sync', { method: 'POST' });
      if (res.ok) {
        await fetchCommunications();
        await fetchUnreadCounts();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
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
      setCommunications(prev =>
        prev.map(c => c._id === commId ? { ...c, isRead: true } : c)
      );
      setTotalUnread(prev => Math.max(0, prev - 1));
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
      setCommunications(prev =>
        prev.map(c => c._id === commId ? { ...c, isStarred: !currentStarred } : c)
      );
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  // Filter jobs that have communications
  const jobsWithComms = jobs.filter(j => unreadCounts[j._id] !== undefined);

  // Classification summary
  const classificationCounts = communications.reduce((acc, c) => {
    acc[c.classification] = (acc[c.classification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex h-full">
      {/* Left: Filters + List */}
      <div className="flex-1 flex flex-col border-r border-white/5">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-white">Communications</h3>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                {totalUnread} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Sync emails"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="px-4 py-2 border-b border-white/5 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direction filter */}
            <select
              value={filter.direction || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, direction: e.target.value || undefined }))}
              className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-gray-300 focus:outline-none"
            >
              <option value="">All directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>

            {/* Classification filter */}
            <select
              value={filter.classification || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, classification: e.target.value || undefined }))}
              className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-gray-300 focus:outline-none"
            >
              <option value="">All types</option>
              <option value="INTERVIEW_INVITATION">Interview</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTION">Rejected</option>
              <option value="APPLICATION_ACKNOWLEDGEMENT">Acknowledged</option>
              <option value="RECRUITER_MESSAGE">Recruiter</option>
              <option value="FOLLOW_UP">Follow-up</option>
            </select>

            {/* Job filter */}
            <select
              value={filter.jobId || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, jobId: e.target.value || undefined }))}
              className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded-md text-gray-300 focus:outline-none"
            >
              <option value="">All jobs</option>
              {jobsWithComms.map(j => (
                <option key={j._id} value={j._id}>
                  {j.title} @ {j.company?.name || 'Unknown'}
                  {unreadCounts[j._id] ? ` (${unreadCounts[j._id]} unread)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Classification Summary */}
        {Object.keys(classificationCounts).length > 0 && (
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-wrap">
            {Object.entries(classificationCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([cls, count]) => {
                const config = CLASSIFICATION_CONFIG[cls] || CLASSIFICATION_CONFIG.UNKNOWN;
                const Icon = config.icon;
                return (
                  <span
                    key={cls}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    {config.label}: {count}
                  </span>
                );
              })}
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : communications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Inbox className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">No communications found</p>
              <p className="text-xs mt-1">Click refresh to sync emails from Stalwart</p>
            </div>
          ) : (
            communications.map(comm => (
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
      </div>

      {/* Right: Email Detail */}
      {selectedComm ? (
        <div className="w-[480px] flex flex-col">
          <EmailDetail
            communication={selectedComm}
            onClose={() => setSelectedComm(null)}
            onReply={() => {
              // TODO: Open compose modal
            }}
          />
        </div>
      ) : (
        <div className="w-[480px] flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select an email to view</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Email Row
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
  const config = CLASSIFICATION_CONFIG[comm.classification] || CLASSIFICATION_CONFIG.UNKNOWN;
  const Icon = config.icon;
  const DirectionIcon = comm.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;
  const directionColor = comm.direction === 'inbound' ? 'text-emerald-400' : 'text-blue-400';

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 border-b border-white/5 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-white/10'
          : comm.isRead
          ? 'hover:bg-white/5'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Direction + Read indicator */}
        <div className="mt-1 flex flex-col items-center gap-1">
          <DirectionIcon className={`w-3.5 h-3.5 ${directionColor}`} />
          {!comm.isRead && (
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm truncate ${comm.isRead ? 'text-gray-300' : 'text-white font-medium'}`}>
                {comm.senderName || comm.senderEmail}
              </span>
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full ${config.color}`}>
                <Icon className="w-2.5 h-2.5" />
                {config.label}
              </span>
              {comm.isAutomated && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full text-gray-400 bg-gray-400/10">
                  <Bot className="w-2.5 h-2.5" />
                  Auto
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
                className={`p-0.5 rounded ${comm.isStarred ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
              >
                <Star className="w-3.5 h-3.5" fill={comm.isStarred ? 'currentColor' : 'none'} />
              </button>
              <span className="text-[10px] text-gray-500">
                {formatTimeAgo(comm.receivedAt)}
              </span>
            </div>
          </div>

          <p className={`text-sm mt-0.5 truncate ${comm.isRead ? 'text-gray-400' : 'text-gray-200'}`}>
            {comm.subject}
          </p>

          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {comm.bodySnippet.substring(0, 100)}
          </p>

          {/* Job association */}
          {comm.jobId && (
            <div className="flex items-center gap-1 mt-1">
              <Briefcase className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">Linked to job</span>
            </div>
          )}

          {/* Attachments */}
          {comm.hasAttachments && (
            <div className="flex items-center gap-1 mt-1">
              <FileText className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">
                {comm.attachments.length} attachment{comm.attachments.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Email Detail
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
  const config = CLASSIFICATION_CONFIG[comm.classification] || CLASSIFICATION_CONFIG.UNKNOWN;
  const Icon = config.icon;

  return (
    <div className="flex flex-col h-full border-l border-white/5">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
          <span className="text-[10px] text-gray-500">
            {comm.classificationConfidence ? `${Math.round(comm.classificationConfidence * 100)}% confidence` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onReply}
            className="px-3 py-1 text-xs bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors"
          >
            Reply
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/5"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subject */}
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-medium text-white">{comm.subject}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            From: {comm.senderName ? `${comm.senderName} <${comm.senderEmail}>` : comm.senderEmail}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            To: {comm.recipients.map(r => r.email).join(', ')}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            {new Date(comm.receivedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {comm.htmlBody ? (
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: comm.htmlBody }}
          />
        ) : (
          <div className="text-sm text-gray-300 whitespace-pre-wrap">
            {comm.textBody || comm.bodySnippet}
          </div>
        )}
      </div>

      {/* Job Association */}
      {comm.jobId && (
        <div className="px-4 py-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-400">Associated with job</span>
            <a
              href={`/dashboard/jobs?tab=comms&jobId=${comm.jobId}`}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              View <ExternalLink className="w-3 h-3 inline" />
            </a>
          </div>
        </div>
      )}

      {/* Attachments */}
      {comm.hasAttachments && comm.attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-xs text-gray-500 mb-1">Attachments</p>
          <div className="flex flex-wrap gap-2">
            {comm.attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-xs text-gray-300"
              >
                <FileText className="w-3 h-3" />
                {att.filename}
                <span className="text-gray-500">({formatFileSize(att.size)})</span>
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

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

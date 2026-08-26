'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, RefreshCw, AlertTriangle, Send, Sparkles, Check, CheckSquare, 
  Paperclip, Users, FileText, BarChart2, Plus, Calendar, HelpCircle, 
  ChevronRight, ChevronDown, CheckCircle, Trash2, ArrowRight, ExternalLink,
  MoreVertical, Smile, ThumbsUp, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmailConnectModal from './EmailConnectModal';


interface EmailMessage {
  id?: string;
  _id?: string;
  providerMessageId: string;
  providerThreadId: string;
  direction: 'inbound' | 'outbound';
  senderEmail: string;
  senderName?: string;
  subject: string;
  bodySnippet: string;
  receivedAt: string | Date;
  isRead: boolean;
  stageClassification?: string;
  triggeredStageChange: boolean;
  hasAttachments?: boolean;
  attachmentNames?: string[];
}

interface EmailThread {
  id?: string;
  _id?: string;
  providerThreadId: string;
  threadSubject: string;
  lastMessageAt: string | Date;
  messageCount: number;
  unreadCount: number;
  participantEmails: string[];
}

interface CommunicationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onRefreshJob?: () => void;
}

const formatStageClassification = (classification: string) => {
  if (!classification) return '';
  const mapping: Record<string, string> = {
    APPLICATION_ACKNOWLEDGED: 'Applied',
    SCREENING_REQUESTED: 'Screening',
    INTERVIEW_SCHEDULED: 'Interview',
    OFFER_RECEIVED: 'Offer',
    REJECTION_RECEIVED: 'Rejected',
  };
  return mapping[classification] || classification.toLowerCase().replace(/_/g, ' ');
};

export const CommunicationSidebar: React.FC<CommunicationSidebarProps> = ({
  isOpen,
  onClose,
  job,
  onRefreshJob
}) => {
  const [activeTab, setActiveTab] = useState<'emails' | 'people' | 'files' | 'insights'>('emails');
  const [loading, setLoading] = useState(true);
  const [isAutomated, setIsAutomated] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  
  // Filtering & Sorting states
  const [emailFilter, setEmailFilter] = useState<'all' | 'unread'>('all');
  const [emailSortOrder, setEmailSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Calendar states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Composer states
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  const [tonePreference, setTonePreference] = useState<'formal' | 'startup-friendly' | 'confident' | 'conversational'>('formal');

  // Connection settings states
  const [connectEmailInput, setConnectEmailInput] = useState('');
  const [connectProvider, setConnectProvider] = useState<'gmail' | 'outlook' | 'imap'>('gmail');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [isEmailConnectModalOpen, setIsEmailConnectModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'email' | 'calendar'>('email');

  const handleModalConnected = (data: { provider: string; emailAddress: string; syncStatus: string }) => {
    setIsAutomated(true);
    fetchEmailDetails();
    fetchCalendarStatus();
    if (onRefreshJob) onRefreshJob();
  };

  // Undo state
  const [lastStageLogId, setLastStageLogId] = useState<string | null>(null);
  const [lastStageFrom, setLastStageFrom] = useState<string | null>(null);

  // Options context menu
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const jobId = job.id || job._id;

  // Clearbit Logo loading
  useEffect(() => {
    if (job.company) {
      const formattedCompany = job.company.toLowerCase().replace(/[^a-z0-9]/g, '');
      setCompanyLogoUrl(`https://logo.clearbit.com/${formattedCompany}.com`);
      setLogoError(false);
    }
  }, [job.company]);

  const fetchEmailDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tracker/emails?jobId=${jobId}`);
      const data = await res.json();
      if (data.success) {
        setIsAutomated(data.isAutomated);
        setEmailAddress(data.emailAddress);
        setSyncStatus(data.syncStatus);
        setMessages(data.messages || []);
        setThreads(data.threads || []);
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      const res = await fetch('/api/user/settings');
      const data = await res.json();
      if (data.success && data.data?.settings?.advanced?.integrations?.calendar) {
        setCalendarConnected(data.data.settings.advanced.integrations.calendar.connected);
      }
    } catch (err) {
      console.error('Error fetching calendar status:', err);
    }
  };

  useEffect(() => {
    if (isOpen && jobId) {
      fetchEmailDetails();
      fetchCalendarStatus();
    }
  }, [isOpen, jobId]);

  const handleConnectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectEmailInput) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsConnecting(true);
    try {
      const res = await fetch('/api/tracker/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          provider: connectProvider,
          emailAddress: connectEmailInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsAutomated(true);
        setEmailAddress(data.emailAddress);
        setSyncStatus(data.syncStatus);
        toast.success(`Successfully connected ${connectEmailInput}`);
        fetchEmailDetails();
        if (onRefreshJob) onRefreshJob();
      }
    } catch (err) {
      toast.error('Failed to connect email account');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Are you sure you want to disconnect your email? Syncing will stop.')) return;
    try {
      const res = await fetch('/api/tracker/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' })
      });
      const data = await res.json();
      if (data.success) {
        setIsAutomated(false);
        setSyncStatus('disconnected');
        toast.success('Email disconnected successfully');
        fetchEmailDetails();
        if (onRefreshJob) onRefreshJob();
      }
    } catch (err) {
      toast.error('Failed to disconnect email');
    }
  };

  const handleConnectCalendar = async () => {
    setCalendarConnecting(true);
    try {
      const response = await fetch('/api/calendar/auth');
      const data = await response.json();
      if (data.success) {
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setCalendarConnecting(false);
            fetchCalendarStatus();
            toast.success('Google Calendar connected successfully!');
          }
        }, 1000);
      } else {
        toast.error('Failed to initiate calendar auth');
        setCalendarConnecting(false);
      }
    } catch (error) {
      toast.error('Error connecting calendar');
      setCalendarConnecting(false);
    }
  };

  const handleForceSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Calendar synced successfully!');
      } else {
        toast.error(data.error || 'Failed to sync calendar');
      }
    } catch (err) {
      toast.error('Error syncing calendar');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleAttachmentSync = async (filename: string) => {
    if (!calendarConnected) {
      toast.error('Please connect Google Calendar first under Tab/Settings');
      return;
    }
    setSyncingCalendar(true);
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Event '${filename.replace('.ics', '')}' synced to Google Calendar!`);
      } else {
        toast.error('Sync failed');
      }
    } catch (err) {
      toast.error('Error syncing attachment');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSending(true);
    try {
      const recruiterEmail = job.contactDetails?.email || (messages.find(m => m.direction === 'inbound')?.senderEmail) || 'recruiter@company.com';
      const mainThread = threads[0]?.providerThreadId || '';

      const res = await fetch('/api/tracker/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reply',
          jobId,
          threadId: mainThread,
          subject: threads[0]?.threadSubject ? `Re: ${threads[0].threadSubject}` : `Follow-up: ${job.jobTitle} application`,
          bodyText: replyText,
          recipientEmail: recruiterEmail,
          recipientName: job.contactDetails?.name || 'Recruiter'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Email sent successfully!');
        setReplyText('');
        fetchEmailDetails();
      }
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleAiAssistDraft = async (type: string) => {
    setIsGeneratingAi(true);
    setShowAiDropdown(false);
    try {
      const lastMsg = messages.find(m => m.direction === 'inbound')?.bodySnippet || '';
      
      const res = await fetch('/api/tracker/emails/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: type,
          variables: {
            CANDIDATE_NAME: sessionUserDisplayName(),
            COMPANY_NAME: job.company,
            JOB_TITLE: job.jobTitle || job.title,
            RECRUITER_NAME: job.contactDetails?.name || 'Jane',
            TONE_PREFERENCE: tonePreference,
            CUSTOM_INSTRUCTION: customInstructions,
            DAYS_SINCE_LAST_CONTACT: 7,
            LAST_EMAIL_BODY: lastMsg
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setReplyText(data.body);
        toast.success('AI draft created');
        setShowCustomPromptInput(false);
        setCustomInstructions('');
      } else {
        toast.error('Failed to draft with AI');
      }
    } catch (err) {
      toast.error('Error generating AI assist');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const sessionUserDisplayName = () => 'Candidate';

  const handleUndoStageChange = async () => {
    if (!lastStageLogId) return;
    try {
      const res = await fetch('/api/tracker/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'undo_stage_change',
          jobId,
          logId: lastStageLogId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Stage change reverted successfully.');
        setLastStageLogId(null);
        setLastStageFrom(null);
        if (onRefreshJob) onRefreshJob();
      }
    } catch (err) {
      toast.error('Failed to revert stage change');
    }
  };

  // Dynamic extractors
  const contacts = [
    ...(job.contactDetails?.name || job.contactDetails?.email ? [{
      name: job.contactDetails.name || 'Recruiter',
      email: job.contactDetails.email || 'No email logged',
      role: 'Recruiter'
    }] : []),
    ...messages
      .filter((m, i, self) => m.direction === 'inbound' && self.findIndex(t => t.senderEmail === m.senderEmail) === i)
      .map(m => ({
        name: m.senderName || 'Hiring Team',
        email: m.senderEmail,
        role: 'Sender'
      }))
  ].filter((c, i, self) => self.findIndex(t => t.email === c.email) === i);

  const attachments = messages
    .filter(m => m.hasAttachments && m.attachmentNames)
    .flatMap(m => (m.attachmentNames || []).map(name => ({
      name,
      messageId: m.id || m._id,
      receivedAt: m.receivedAt,
      senderName: m.senderName || m.senderEmail,
      isIcs: name.endsWith('.ics')
    })));

  const filteredMessages = messages
    .filter(m => emailFilter === 'all' || !m.isRead)
    .sort((a, b) => {
      const dateA = new Date(a.receivedAt).getTime();
      const dateB = new Date(b.receivedAt).getTime();
      return emailSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const unreadCount = messages.filter(m => !m.isRead && m.direction === 'inbound').length;

  const getInsightsSummary = () => {
    if (messages.length === 0) {
      return "No communications logged yet for this job application. Connect your automated inbox or log manually to see AI insights.";
    }
    const lastMsg = messages[messages.length - 1];
    const isOutbound = lastMsg.direction === 'outbound';
    return `Application initiated for ${job.jobTitle || job.title} at ${job.company || 'Google'}. Last message was ${isOutbound ? 'sent by you' : 'received from ' + (lastMsg.senderName || lastMsg.senderEmail)} on ${new Date(lastMsg.receivedAt).toLocaleDateString()}. Email communication auto-synced and linked to pipeline status.`;
  };

  const getNextAction = (): string | null => {
    if (messages.length === 0) return null;
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    if (!lastInbound) return null;
    const cls = lastInbound.stageClassification;
    if (cls === 'INTERVIEW_SCHEDULED') return 'Interview scheduled — prepare with Interview Prep';
    if (cls === 'SCREENING_REQUESTED') return 'Respond to screening request';
    if (cls === 'OFFER_RECEIVED') return 'Review and respond to offer';
    if (cls === 'REJECTION_RECEIVED') return 'Consider follow-up or archive this application';
    return `Follow up on last message from ${new Date(lastInbound.receivedAt).toLocaleDateString()}`;
  };

  const getReplyLatency = (): string => {
    if (messages.length < 2) return '-';
    const pairs: number[] = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].direction === 'outbound' && messages[i - 1].direction === 'inbound') {
        const inboundTime = new Date(messages[i - 1].receivedAt).getTime();
        const outboundTime = new Date(messages[i].receivedAt).getTime();
        pairs.push(outboundTime - inboundTime);
      }
    }
    if (pairs.length === 0) return '-';
    const avgMs = pairs.reduce((a, b) => a + b, 0) / pairs.length;
    const hours = avgMs / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${Math.round(hours / 24)}d`;
  };

  const getSentiment = (): { label: string; color: string } => {
    if (messages.length === 0) return { label: 'N/A', color: 'text-gray-500' };
    const positiveWords = ['thank', 'great', 'excited', 'congratulations', 'offer', 'approved', 'accepted', 'love', 'excellent', 'perfect'];
    const negativeWords = ['unfortunately', 'regret', 'declined', 'rejected', 'not selected', 'closed', 'unable', 'sorry'];
    const allText = messages.map(m => m.bodySnippet?.toLowerCase() || '').join(' ');
    const posCount = positiveWords.filter(w => allText.includes(w)).length;
    const negCount = negativeWords.filter(w => allText.includes(w)).length;
    if (posCount > negCount) return { label: 'Positive', color: 'text-emerald-500' };
    if (negCount > posCount) return { label: 'Needs Attention', color: 'text-red-500' };
    return { label: 'Neutral', color: 'text-gray-500' };
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={sidebarRef}
      className="fixed right-3 top-3 bottom-3 h-auto w-[450px] bg-white dark:bg-[#141810] shadow-2xl z-[9999] flex flex-col rounded-2xl overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#191f15] flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-emerald-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Communication</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] text-small font-semibold flex-shrink-0">
        <button 
          onClick={() => setActiveTab('emails')}
          className={`flex-1 py-3.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'emails' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          Emails
        </button>
        <button 
          onClick={() => setActiveTab('people')}
          className={`flex-1 py-3.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'people' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          People
          {contacts.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {contacts.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'files' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          Files
          {attachments.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {attachments.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-3.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'insights' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          Insights
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0c0f0a] p-4 min-h-0 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mb-2" />
            <p className="text-small font-medium">Fetching email threads...</p>
          </div>
        ) : (
          <>
            {/* TABS 1: EMAILS */}
            {activeTab === 'emails' && (
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                
                {/* 1. Job Context Card (Mockup) */}
                <div className="bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 p-3 sm:p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-h3 text-gray-700 dark:text-gray-300 animate-fade-in">
                      {!logoError && companyLogoUrl ? (
                        <img 
                          src={companyLogoUrl} 
                          alt={job.company} 
                          onError={() => setLogoError(true)} 
                          className="h-full w-full object-contain bg-white p-1"
                        />
                      ) : (
                        job.company ? job.company.substring(0, 1).toUpperCase() : 'J'
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-small leading-tight">{job.company || 'Google'}</h4>
                      <p className="text-small text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{job.jobTitle || job.title || 'Software Engineer'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      {job.status || 'Interview'}
                    </span>
                    <div className="relative">
                      <button 
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 transition"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {showOptionsMenu && (
                        <div className="absolute right-0 top-8 z-[1020] w-48 bg-white dark:bg-[#181f15] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 flex flex-col gap-1 text-small text-gray-700 dark:text-gray-300 font-medium">
                          <button 
                            onClick={() => {
                              setShowOptionsMenu(false);
                              fetchEmailDetails();
                            }} 
                            className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"
                          >
                            <RefreshCw size={12} />
                            Refresh Emails
                          </button>
                          {calendarConnected ? (
                            <button 
                              onClick={() => {
                                setShowOptionsMenu(false);
                                handleForceSyncCalendar();
                              }} 
                              className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"
                            >
                              <Calendar size={12} />
                              Sync to Calendar
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setShowOptionsMenu(false);
                                setModalInitialTab('calendar');
                                setIsEmailConnectModalOpen(true);
                              }} 
                              className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2 text-blue-500 font-semibold"
                            >
                              <Calendar size={12} />
                              Link Google Calendar
                            </button>
                          )}
                          <a 
                            href={`https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(job.contactDetails?.email || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setShowOptionsMenu(false)}
                            className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg flex items-center gap-2"
                          >
                            <ExternalLink size={12} />
                            Open in Gmail
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Filter / Sorter Row (Mockup) */}
                <div className="flex items-center justify-between text-small py-1">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEmailFilter('all')} 
                      className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                        emailFilter === 'all' 
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-white dark:bg-[#131810] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:text-gray-700'
                      }`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setEmailFilter('unread')} 
                      className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                        emailFilter === 'unread' 
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-white dark:bg-[#131810] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:text-gray-700'
                      }`}
                    >
                      Unread
                      {unreadCount > 0 && (
                        <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select 
                      value={emailSortOrder}
                      onChange={(e) => setEmailSortOrder(e.target.value as 'newest' | 'oldest')}
                      className="bg-white dark:bg-[#131810] text-gray-600 dark:text-gray-300 text-small font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                    <button 
                      onClick={fetchEmailDetails}
                      className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#131810] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition"
                    >
                      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {!isAutomated && (
                  <div className="bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 p-4 rounded-2xl shadow-sm text-small animate-fade-in">
                    <div className="flex gap-2.5 items-start mb-3">
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">Auto Sync Inbox</h4>
                        <p className="text-small text-gray-500 dark:text-gray-400 mt-0.5 leading-5">
                          Connect your email inbox to auto-sync recruiter threads, matching them to job cards and auto-updating stages instantly.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setModalInitialTab('email');
                        setIsEmailConnectModalOpen(true);
                      }}
                      className="w-full bg-[#013f2e] hover:brightness-95 text-black font-semibold py-2.5 rounded-xl text-small flex items-center justify-center gap-1.5 transition duration-150 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Connect Automated Integration
                    </button>
                  </div>
                )}

                {/* Auto Stage movement Toast/Banner inside Sidebar */}
                {lastStageLogId && (
                  <div className="bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/20 p-3 rounded-xl flex items-center justify-between gap-2 shadow-sm text-small text-emerald-900 dark:text-emerald-300">
                    <p className="leading-5">
                      📧 Recruiter email auto-moved this job to <b>{job.status.toUpperCase()}</b>.
                    </p>
                    <button 
                      onClick={handleUndoStageChange}
                      className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded border border-gray-300 transition duration-150 shrink-0"
                    >
                      Undo Move
                    </button>
                  </div>
                )}

                {/* Threaded Email List View */}
                {filteredMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-gray-400">
                    <Mail className="h-10 w-10 text-gray-300 mb-2" />
                    <h5 className="text-small font-semibold text-gray-700 dark:text-white/80">No email history logged</h5>
                    <p className="text-small text-gray-500 mt-1 max-w-[240px]">
                      Sync your inbox or log messages using the reply composer below.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-0 relative py-2">
                    {/* The vertical timeline connector line */}
                    <div className="absolute left-[20px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-white/10 z-0"></div>

                    {filteredMessages.map((msg, index) => {
                      const isOutbound = msg.direction === 'outbound';
                      const date = new Date(msg.receivedAt);

                      return (
                        <div 
                          key={msg.id || msg._id || index}
                          className="relative flex items-start gap-4 z-10"
                        >
                          {/* Timeline Left Column */}
                          <div className="flex flex-col items-center w-[40px] shrink-0">
                            {isOutbound ? (
                              <div className="h-10 w-10 rounded-full border-2 border-emerald-500 bg-emerald-55 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500 shadow-sm transition-transform hover:scale-105">
                                <Mail className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center font-bold text-small shadow-sm overflow-hidden border border-gray-200 dark:border-white/10 transition-transform hover:scale-105">
                                  {msg.senderName === 'Jane Smith' ? (
                                    <img 
                                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120" 
                                      alt="Jane" 
                                      className="h-full w-full object-cover" 
                                    />
                                  ) : (
                                    msg.senderName?.substring(0, 1).toUpperCase() || 'R'
                                  )}
                                </div>
                                <div className="h-5 w-5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 shadow-sm">
                                  <Mail className="h-3 w-3" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Timeline Bubble Card */}
                          <div className="flex-1 min-w-0">
                            <div 
                              className={`border rounded-2xl p-4 shadow-sm transition duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 ${
                                isOutbound 
                                  ? 'bg-[#f4fbf0] dark:bg-[#152312] border-emerald-500/20' 
                                  : 'bg-white dark:bg-[#131810] border-gray-200 dark:border-white/10'
                              }`}
                            >
                              {/* Header sender info */}
                              <div className="flex items-center justify-between gap-2 mb-1.5 text-small">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {isOutbound ? 'You' : (msg.senderName || msg.senderEmail)}
                                  </span>
                                  {!isOutbound && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 text-[9px] font-bold">
                                      Recruiter
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
                                  <span>
                                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isOutbound && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                                  {!isOutbound && !msg.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                                  )}
                                </div>
                              </div>

                              {/* Subject */}
                              <h5 className="text-small font-bold text-gray-800 dark:text-gray-200 mb-1 leading-5">
                                {msg.subject}
                              </h5>
                              
                              {/* Message snippet */}
                              <p className="text-small text-gray-600 dark:text-gray-300 leading-relaxed font-normal whitespace-pre-line">
                                {msg.bodySnippet}
                              </p>

                              {/* Attachment chips */}
                              {msg.hasAttachments && msg.attachmentNames && msg.attachmentNames.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {msg.attachmentNames.map((name, idx) => {
                                    const isIcs = name.endsWith('.ics');
                                    return (
                                      <button 
                                        key={idx}
                                        onClick={() => isIcs ? handleAttachmentSync(name) : toast.success(`Downloaded ${name}`)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#181f15] border border-gray-200 dark:border-white/10 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-150 hover:scale-[1.02]"
                                      >
                                        {isIcs ? (
                                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                        ) : (
                                          <FileText className="h-3.5 w-3.5 text-red-500" />
                                        )}
                                        <span>{name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Stage movement Info */}
                              {msg.stageClassification && msg.triggeredStageChange && (
                                <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
                                  <CheckCircle size={10} />
                                  <span>Auto-moved stage to {formatStageClassification(msg.stageClassification)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Composer Section */}
                <div className="border-t border-gray-200 dark:border-white/10 pt-4 bg-white dark:bg-[#141810] p-4 -mx-4 -mb-4 rounded-b-2xl flex-shrink-0 flex flex-col gap-2.5 shadow-lg">
                  {/* AI assist triggers / Custom instruction form */}
                  {showCustomPromptInput && (
                    <div className="p-3 bg-gray-50 dark:bg-[#181f15] border border-gray-200 dark:border-white/10 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          AI Prompt Instructions
                        </label>
                        <button 
                          onClick={() => setShowCustomPromptInput(false)}
                          className="text-[10px] font-semibold text-red-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="What should this email highlight? (e.g. ask for 15% salary increase, mention notice period of 3 weeks)"
                        className="w-full text-small p-2 bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none dark:text-white h-16 resize-none"
                      />
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 font-medium">Tone:</span>
                          <select 
                            value={tonePreference}
                            onChange={(e: any) => setTonePreference(e.target.value)}
                            className="text-[10px] font-semibold bg-transparent border-b border-gray-300 dark:border-white/10 dark:text-white focus:outline-none"
                          >
                            <option value="formal">Formal</option>
                            <option value="startup-friendly">Startup Friendly</option>
                            <option value="confident">Confident</option>
                            <option value="conversational">Conversational</option>
                          </select>
                        </div>
                        <button 
                          onClick={() => handleAiAssistDraft('custom')}
                          disabled={isGeneratingAi}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1 rounded-lg text-[10px] transition duration-150"
                        >
                          Generate Custom Draft
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI assist helper dropdown toggle */}
                  <div className="relative flex items-center justify-between text-small">
                    <span className="text-gray-400 font-medium">Reply to recruiter</span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setShowAiDropdown(!showAiDropdown);
                          setShowCustomPromptInput(false);
                        }}
                        disabled={isGeneratingAi}
                        className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold transition hover:scale-105"
                      >
                        <Sparkles size={12} className={isGeneratingAi ? 'animate-spin' : ''} />
                        {isGeneratingAi ? 'Drafting...' : 'AI Assist'}
                      </button>

                      {showAiDropdown && (
                        <div className="absolute right-0 bottom-8 z-[1010] w-[200px] bg-white dark:bg-[#181f15] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 text-small text-gray-700 dark:text-gray-300 font-medium">
                          <button onClick={() => handleAiAssistDraft('initial_outreach')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Draft Cold Outreach
                          </button>
                          <button onClick={() => handleAiAssistDraft('thank_you')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Post-Interview Thank You
                          </button>
                          <button onClick={() => handleAiAssistDraft('follow_up')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Follow Up (No Response)
                          </button>
                          <button onClick={() => handleAiAssistDraft('reschedule')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Request Reschedule
                          </button>
                          <button onClick={() => handleAiAssistDraft('extension')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Request Extension
                          </button>
                          <button onClick={() => handleAiAssistDraft('negotiation')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Negotiate Salary Package
                          </button>
                          <button onClick={() => handleAiAssistDraft('acceptance')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Formal Acceptance
                          </button>
                          <button onClick={() => handleAiAssistDraft('decline')} disabled={isGeneratingAi} className="p-2 text-left hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isGeneratingAi && <Loader2 size={12} className="animate-spin" />}
                            Politely Decline Offer
                          </button>
                          <button onClick={() => setShowCustomPromptInput(true)} className="p-2 text-left text-emerald-600 dark:text-emerald-400 font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg animate-pulse">Custom Prompt draft...</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Input Composer */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 flex gap-2 items-center px-3 py-2 bg-gray-50 dark:bg-[#181f15] border border-gray-200 dark:border-white/10 rounded-2xl">
                      <button 
                        onClick={() => toast.success('Attachment selected')} 
                        className="text-gray-400 hover:text-gray-600 p-1 hover:scale-110 transition-transform"
                      >
                        <Paperclip size={16} />
                      </button>
                      <button 
                        onClick={() => setReplyText(prev => prev + ' 😊')} 
                        className="text-gray-400 hover:text-gray-600 p-1 hover:scale-110 transition-transform"
                      >
                        <Smile size={16} />
                      </button>
                      <button 
                        onClick={() => setShowCustomPromptInput(true)} 
                        className="text-gray-400 hover:text-[#013f2e] p-1 hover:scale-110 transition-transform"
                      >
                        <Sparkles size={16} />
                      </button>
                      
                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${job.contactDetails?.name || 'recruiter'}...`}
                        className="flex-1 text-small bg-transparent focus:outline-none dark:text-white h-10 resize-none py-2 scrollbar-none"
                      />
                    </div>
                    <button 
                      onClick={handleSendReply}
                      disabled={isSending || !replyText.trim()}
                      className="h-11 w-11 shrink-0 bg-[#013f2e] hover:brightness-95 text-black rounded-2xl flex items-center justify-center transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Open in Gmail utility */}
                  <div className="pt-2 text-center border-t border-gray-100 dark:border-white/5">
                    <a 
                      href={`https://mail.google.com/mail/u/0/#search/from%3A${encodeURIComponent(job.contactDetails?.email || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-small font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition"
                    >
                      <Mail className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                      Open in Gmail
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 2: PEOPLE */}
            {activeTab === 'people' && (
              <div className="bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                <h4 className="text-small font-semibold text-gray-900 dark:text-white mb-4">Contacts Associated with this Application</h4>
                <div className="divide-y divide-gray-100 dark:divide-white/10">
                  {contacts.length === 0 ? (
                    <p className="text-small text-gray-500 py-4 text-center">No participants extracted from this thread yet.</p>
                  ) : (
                    contacts.map((contact, index) => (
                      <div key={index} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold text-small shadow-sm">
                            {contact.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-small font-semibold text-gray-900 dark:text-white">{contact.name}</h5>
                            <p className="text-[10px] text-gray-500 mt-0.5">{contact.email}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold">
                          {contact.role}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TABS 3: FILES */}
            {activeTab === 'files' && (
              <div className="bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 p-4 rounded-2xl shadow-sm animate-fade-in">
                <h4 className="text-small font-semibold text-gray-900 dark:text-white mb-4">Attachments & Documents</h4>
                <div className="space-y-3">
                  {attachments.length === 0 ? (
                    <p className="text-small text-gray-500 py-6 text-center">No email attachments found for this application.</p>
                  ) : (
                    attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#181f15] border border-gray-200 dark:border-white/10 rounded-xl text-small shadow-sm transition hover:scale-[1.01]">
                        <div className="flex items-center gap-2.5">
                          {file.isIcs ? (
                            <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-red-500 shrink-0" />
                          )}
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">{file.name}</h5>
                            <p className="text-[10px] text-gray-500 mt-0.5">Synced from Recruiter Email</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => file.isIcs ? handleAttachmentSync(file.name) : toast.success(`Previewing ${file.name}`)}
                          className="text-emerald-500 hover:text-emerald-600 font-bold hover:underline"
                        >
                          {file.isIcs ? (calendarConnected ? 'Add to Calendar' : 'Connect Calendar') : 'Preview'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TABS 4: INSIGHTS */}
            {activeTab === 'insights' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 p-4 rounded-2xl shadow-sm space-y-3 text-small leading-5">
                  <h4 className="text-small font-semibold text-gray-900 dark:text-white">AI Thread Summary</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {getInsightsSummary()}
                  </p>
                  {getNextAction() && (
                    <div className="flex flex-col gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-2.5 rounded-xl border border-yellow-500/10 animate-pulse">
                      <span className="uppercase tracking-wider">Recommended Next Action:</span>
                      <span className="font-semibold text-small mt-0.5">{getNextAction()}</span>
                    </div>
                  )}
                </div>

                {/* KPI metrics */}
                <div className="bg-white dark:bg-[#131810] border border-gray-200 dark:border-white/10 p-4 rounded-2xl shadow-sm text-small">
                  <h4 className="text-small font-semibold text-gray-900 dark:text-white mb-3">Communication Health</h4>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 dark:bg-[#181f15] p-3 rounded-xl border border-gray-200 dark:border-white/5 hover:scale-105 transition-transform duration-200">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Reply Latency</p>
                      <p className="text-h3 font-bold text-gray-900 dark:text-white mt-1">{getReplyLatency()}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#181f15] p-3 rounded-xl border border-gray-200 dark:border-white/5 hover:scale-105 transition-transform duration-200">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Recruiter Sentiment</p>
                      <p className={`text-h3 font-bold mt-1 ${getSentiment().color}`}>{getSentiment().label}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <EmailConnectModal
        isOpen={isEmailConnectModalOpen}
        onClose={() => setIsEmailConnectModalOpen(false)}
        initialTab={modalInitialTab}
        onConnected={handleModalConnected}
      />
    </div>
  );
};

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Mail, Send, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { JobApplication } from '@/types/job';

interface JobCommunicationTabProps {
  job: JobApplication;
  isRecruiterVisibilityStage: boolean;
  recruiterVisibilitySteps: string[];
  hasRecruiterEmail: boolean;
  handleOpenEmail: (index: number) => void;
  setIsEmailConnectModalOpen: (open: boolean) => void;
}

const JobCommunicationTab: React.FC<JobCommunicationTabProps> = ({
  job,
  isRecruiterVisibilityStage,
  recruiterVisibilitySteps,
  hasRecruiterEmail,
  handleOpenEmail,
  setIsEmailConnectModalOpen
}) => {
  const [emails, setEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tonePreference, setTonePreference] = useState<'formal' | 'startup-friendly' | 'confident' | 'conversational'>('formal');

  const getToneSuffix = (tone: string) => {
    switch (tone) {
      case 'formal':
        return 'I hope this message finds you well. ';
      case 'startup-friendly':
        return 'Hope you are doing well! ';
      case 'confident':
        return '';
      case 'conversational':
        return 'Hey! ';
      default:
        return '';
    }
  };

  const fetchEmails = useCallback(async () => {
    const jobId = job.id || job._id;
    if (!jobId) return;
    try {
      setEmailsLoading(true);
      const res = await fetch(`/api/tracker/emails?jobId=${jobId}`);
      const data = await res.json();
      if (data.success) {
        setEmails(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching emails in JobCommunicationTab:', err);
    } finally {
      setEmailsLoading(false);
    }
  }, [job]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    const recruiterEmail = job.contactDetails?.email || emails.find(m => m.direction === 'inbound')?.senderEmail || '';
    if (!recruiterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recruiterEmail)) {
      toast.error('Save a valid recruiter email in the People tab before sending.');
      return;
    }

    setIsSending(true);
    try {
      const mainThread = emails[0]?.providerThreadId || '';
      const tonePrefix = getToneSuffix(tonePreference);
      const bodyText = tonePrefix ? `${tonePrefix}${replyText}` : replyText;
      const jobId = job.id || job._id;

      const res = await fetch('/api/tracker/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reply',
          jobId,
          threadId: mainThread,
          subject: emails[0]?.subject ? `Re: ${emails[0].subject}` : `Follow-up: ${job.jobTitle} application`,
          bodyText,
          recipientEmail: recruiterEmail,
          recipientName: job.contactDetails?.name || 'Recruiter'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Email sent successfully!');
        setReplyText('');
        fetchEmails();
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Recruiter Outreach &amp; Comms</h4>
        <button
          onClick={() => setIsEmailConnectModalOpen(true)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
        >
          Inbox Sync
        </button>
      </div>

      {emailsLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-2" />
          <p className="text-small">Fetching email threads...</p>
        </div>
      ) : emails.length > 0 ? (
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
          <div className="space-y-3.5">
            {emails.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              const date = new Date(msg.receivedAt);
              const key = msg.providerMessageId || msg._id || msg.id;
              return (
                <div key={key} className={`p-3 rounded-xl border text-small leading-relaxed ${
                  isOutbound
                    ? 'bg-[#f4fbf0] dark:bg-[#152312] border-emerald-500/20'
                    : 'bg-white dark:bg-[#131810] border-gray-200 dark:border-white/10'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-gray-900 dark:text-white">
                      {isOutbound ? 'You' : (msg.senderName || msg.senderEmail)}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-semibold">{msg.subject}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] line-clamp-2 mt-0.5">{msg.bodySnippet}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] p-4 space-y-3 mt-4 flex-shrink-0">
            <p className="text-small font-bold text-gray-900 dark:text-white">Quick Reply</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Draft your follow-up or reply email here..."
              className="w-full h-[100px] text-small rounded-lg border border-gray-250 bg-white p-2.5 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white"
            />
            <div className="flex justify-between items-center gap-2">
              <select
                value={tonePreference}
                onChange={(e) => setTonePreference(e.target.value as any)}
                className="bg-white dark:bg-[#131810] text-[11px] font-bold px-2 py-1 rounded-lg border border-gray-200 dark:border-white/10 focus:outline-none cursor-pointer text-gray-600 dark:text-gray-300"
              >
                <option value="formal">👔 Formal</option>
                <option value="startup-friendly">🚀 Startup</option>
                <option value="confident">💪 Confident</option>
                <option value="conversational">💬 Conversational</option>
              </select>
              <button
                onClick={handleSendReply}
                disabled={isSending || !replyText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 text-[11px] font-bold transition disabled:opacity-60 shrink-0"
              >
                {isSending ? 'Sending...' : 'Send Reply'}
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ) : isRecruiterVisibilityStage ? (
        <div className="space-y-4 flex-1">
          <div className="space-y-3">
            {recruiterVisibilitySteps.map((step, index) => (
              <div key={`${step}-${index}`} className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <p className="text-small leading-relaxed text-gray-700 dark:text-gray-300">{step}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-gray-255 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-[#181f16]">
            <p className="text-small font-bold text-gray-900 dark:text-white mb-2">Current action path</p>
            <p className="text-small leading-relaxed text-gray-600 dark:text-gray-300 mb-3">
              {hasRecruiterEmail
                ? 'Open the draft email now, then confirm whether you sent it so the tracker can keep the timeline honest.'
                : 'Use the manual fallback first: copy the draft, add a recruiter email, or send the same message through LinkedIn.'}
            </p>
            <button
              onClick={() => handleOpenEmail(0)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#80FF00] px-4 py-2.5 text-small font-bold text-black shadow-sm transition hover:brightness-95"
            >
              <Mail className="h-4 w-4" />
              Open Outreach Template
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <Mail className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-small text-gray-500 dark:text-gray-400">No emails synced yet for this job.</p>
          <button
            type="button"
            onClick={() => setIsEmailConnectModalOpen(true)}
            className="text-[11px] font-bold text-emerald-600 dark:text-[#80FF00] hover:underline"
          >
            Connect inbox to start tracking recruiter threads
          </button>
        </div>
      )}
    </div>
  );
};

export default JobCommunicationTab;

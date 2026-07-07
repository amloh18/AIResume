export interface UnifiedMessage {
  id: string;
  jobId: string;
  direction: 'inbound' | 'outbound';
  senderName: string;
  senderEmail: string;
  recipientName?: string;
  recipientEmail?: string;
  subject: string;
  bodySnippet: string;
  bodyText?: string;
  receivedAt: Date;
  isRead: boolean;
  hasAttachments: boolean;
  attachmentNames?: string[];
  source: 'email' | 'linkedin' | 'manual';
  providerMessageId?: string;
  providerThreadId?: string;
  stageClassification?: string;
  triggeredStageChange?: boolean;
  matchConfidence?: number;
  matchStatus?: 'auto' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedThread {
  id: string;
  jobId: string;
  subject: string;
  participantEmails: string[];
  participantNames?: string[];
  messageCount: number;
  unreadCount: number;
  lastMessageAt: Date;
  lastMessageSnippet: string;
  source: 'email' | 'linkedin' | 'mixed';
  providerThreadId?: string;
  messages: UnifiedMessage[];
  createdAt: Date;
  updatedAt: Date;
}

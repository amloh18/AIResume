import nodemailer from 'nodemailer';

export interface EmailSyncMessage {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  receivedAt: Date;
  direction: 'inbound' | 'outbound';
  hasAttachments: boolean;
  attachments: { name: string; url?: string }[];
  stageClassification?: string;
  stageConfidence?: number;
  isRead: boolean;
  bodyText?: string;
  providerMessageId?: string;
}

export interface EmailSyncResult {
  success: boolean;
  provider: 'gmail' | 'outlook' | 'imap';
  emailAddress: string;
  syncedCount: number;
  errors: string[];
  messages: EmailSyncMessage[];
}

export interface OutlookMessage {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  from: { emailAddress: { address: string; name?: string } };
  toRecipients: { emailAddress: { address: string; name?: string } }[];
  attachments?: { name: string; contentBytes?: string }[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  payload: {
    headers: { name: string; value: string }[];
    body: { data?: string; size?: number };
  };
  snippet: string;
  internalDate: number;
  labelIds?: string[];
}

const STAGE_CLASSIFICATION_MAP: Record<string, string> = {
  INTERVIEW_SCHEDULED: 'interview',
  SCREENING_REQUESTED: 'screening',
  OFFER_RECEIVED: 'offer',
  APPLICATION_REJECTED: 'rejected',
  APPLICATION_WITHDRAWN: 'withdrawn',
  APPLICATION_ACCEPTED: 'accepted',
  FOLLOW_UP_REQUIRED: 'follow_up',
  NONE: '',
};

/**
 * Unified Email Sync Service
 * Supports Gmail (via API), Outlook (via Microsoft Graph), and IMAP custom domains
 */
export class UnifiedEmailSyncService {
  private accessToken: string;
  private refreshToken?: string;
  private provider: 'gmail' | 'outlook' | 'imap';
  private imapConfig?: { host: string; port: number; user: string; password: string };
  private smtpConfig?: { host: string; port: number; user: string; password: string };
  private expiresAt?: Date;

  constructor(config: {
    accessToken: string;
    refreshToken?: string;
    provider: 'gmail' | 'outlook' | 'imap';
    expiresAt?: Date;
    imapConfig?: { host: string; port: number; user: string; password: string };
    smtpConfig?: { host: string; port: number; user: string; password: string };
  }) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.provider = config.provider;
    this.expiresAt = config.expiresAt;
    this.imapConfig = config.imapConfig;
    this.smtpConfig = config.smtpConfig;
  }

  getProvider(): 'gmail' | 'outlook' | 'imap' {
    return this.provider;
  }

  normalizeStageClassification(classification?: string): string {
    if (!classification) return '';
    return STAGE_CLASSIFICATION_MAP[classification] || classification.toLowerCase();
  }

  async fetchMessages(jobId?: string, limit = 50): Promise<EmailSyncResult> {
    if (this.provider === 'gmail') {
      return this.fetchGmailMessages(jobId, limit);
    }
    if (this.provider === 'outlook') {
      return this.fetchOutlookMessages(jobId, limit);
    }
    return this.fetchImapMessages(jobId, limit);
  }

  async sendEmail(to: string, subject: string, bodyText: string, inReplyTo?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.provider === 'imap' && this.smtpConfig) {
      return this.sendViaSmtp(to, subject, bodyText);
    }
    if (this.provider === 'gmail') {
      return this.sendViaGmailApi(to, subject, bodyText, inReplyTo);
    }
    if (this.provider === 'outlook') {
      return this.sendViaOutlookApi(to, subject, bodyText, inReplyTo);
    }
    return { success: false, error: 'No sending method configured for this provider' };
  }

  private async fetchGmailMessages(jobId?: string, limit = 50): Promise<EmailSyncResult> {
    const result: EmailSyncResult = {
      success: true,
      provider: 'gmail',
      emailAddress: '',
      syncedCount: 0,
      errors: [],
      messages: [],
    };

    try {
      const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!profileResponse.ok) throw new Error('Failed to fetch Gmail profile');
      const profileData = await profileResponse.json();
      result.emailAddress = profileData.emailAddress || '';

      const maxResults = Math.min(limit, 500);
      let messagesUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent('subject:"Job Application" OR subject:"Interview"')}`;

      const messagesResponse = await fetch(messagesUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!messagesResponse.ok) {
        const errText = await messagesResponse.text();
        throw new Error(`Gmail messages list failed: ${messagesResponse.status} ${errText}`);
      }

      const messagesData = await messagesResponse.json();
      const messageIds = messagesData.messages || [];
      result.syncedCount = messageIds.length;

      for (const msgRef of messageIds.slice(0, maxResults)) {
        try {
          const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date&metadataHeaders=In-Reply-To&metadataHeaders=References`, {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          });
          if (!detailResponse.ok) continue;

          const msg = await detailResponse.json();
          const headers = Object.fromEntries(msg.payload.headers.map((h: any) => [h.name.toLowerCase(), h.value]));
          const isInbound = !headers.from?.includes('user@cvcircle.com');
          const bodySnippet = msg.snippet || '';

          result.messages.push({
            id: msg.id,
            threadId: msg.threadId,
            subject: headers.subject || '(no subject)',
            snippet: bodySnippet,
            from: { email: this.extractEmail(headers.from || ''), name: headers.from },
            to: [{ email: this.extractEmail(headers.to || '') }],
            receivedAt: new Date(parseInt(msg.internalDate || Date.now())),
            direction: isInbound ? 'inbound' : 'outbound',
            hasAttachments: msg.payload.headers.some((h: any) => h.name.toLowerCase() === 'content-type' && h.value.includes('multipart/mixed')),
            attachments: [],
            isRead: !msg.labelIds?.includes('UNREAD'),
            bodyText: bodySnippet,
            providerMessageId: msg.id,
          });
        } catch (err) {
          result.errors.push(`Failed to fetch Gmail message ${msgRef.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(`Gmail sync failed: ${err.message}`);
    }

    return result;
  }

  private async fetchOutlookMessages(jobId?: string, limit = 50): Promise<EmailSyncResult> {
    const result: EmailSyncResult = {
      success: true,
      provider: 'outlook',
      emailAddress: '',
      syncedCount: 0,
      errors: [],
      messages: [],
    };

    try {
      const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (!profileResponse.ok) throw new Error('Failed to fetch Outlook profile');
      const profileData = await profileResponse.json();
      result.emailAddress = profileData.mail || profileData.userPrincipalName || '';

      const top = Math.min(limit, 1000);
      const messagesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${top}&$select=id,subject,bodyPreview,receivedDateTime,isRead,hasAttachments,from,toRecipients,conversationId&$orderby=receivedDateTime desc`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } }
      );

      if (!messagesResponse.ok) {
        const errText = await messagesResponse.text();
        throw new Error(`Outlook messages list failed: ${messagesResponse.status} ${errText}`);
      }

      const messagesData = await messagesResponse.json();
      const outlookMessages: OutlookMessage[] = messagesData.value || [];
      result.syncedCount = outlookMessages.length;

      for (const msg of outlookMessages) {
        const bodyResponse = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${msg.id}?$select=body,attachments`, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        const bodyData = bodyResponse.ok ? await bodyResponse.json() : {};

        const isInbound = msg.from?.emailAddress?.address !== result.emailAddress;
        const bodyContent = bodyData.body?.content || msg.bodyPreview || '';

        result.messages.push({
          id: msg.id,
          threadId: msg.conversationId,
          subject: msg.subject || '(no subject)',
          snippet: msg.bodyPreview || '',
          from: { email: msg.from?.emailAddress?.address || '', name: msg.from?.emailAddress?.name },
          to: msg.toRecipients?.map((r: any) => ({ email: r.emailAddress?.address || '', name: r.emailAddress?.name })) || [],
          receivedAt: new Date(msg.receivedDateTime),
          direction: isInbound ? 'inbound' : 'outbound',
          hasAttachments: msg.hasAttachments || false,
          attachments: (bodyData.attachments || []).map((a: any) => ({ name: a.name || a.fileName || 'attachment' })),
          isRead: msg.isRead,
          bodyText: bodyContent,
          providerMessageId: msg.id,
        });
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(`Outlook sync failed: ${err.message}`);
    }

    return result;
  }

  private async fetchImapMessages(jobId?: string, limit = 50): Promise<EmailSyncResult> {
    const result: EmailSyncResult = {
      success: true,
      provider: 'imap',
      emailAddress: this.imapConfig?.user || '',
      syncedCount: 0,
      errors: [],
      messages: [],
    };

    // IMAP fetching requires imapflow or node-imap, which is not installed in this environment
    // This is a placeholder for IMAP integration
    result.errors.push('IMAP sync not yet implemented — use Gmail or Outlook integration for automatic email sync');
    result.success = false;

    return result;
  }

  private async sendViaSmtp(to: string, subject: string, bodyText: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.smtpConfig) return { success: false, error: 'SMTP not configured for IMAP provider' };

    try {
      const transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port || 465,
        secure: this.smtpConfig.port === 465,
        auth: { user: this.smtpConfig.user, pass: this.smtpConfig.password },
        tls: { rejectUnauthorized: false },
      });

      const info = await transporter.sendMail({
        from: `"CVCircle" <${this.smtpConfig.user}>`,
        to,
        subject,
        text: bodyText,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async sendViaGmailApi(to: string, subject: string, bodyText: string, inReplyTo?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        bodyText,
      ].join('\n');

      const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encoded,
          ...(inReplyTo ? { threadId: inReplyTo } : {}),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Gmail send failed: ${response.status} ${errText}` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async sendViaOutlookApi(to: string, subject: string, bodyText: string, inReplyTo?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message: any = {
        subject,
        body: { contentType: 'text', content: bodyText },
        toRecipients: [{ emailAddress: { address: to } }],
      };

      if (inReplyTo) {
        // Outlook uses conversationId for threading
        message.conversationId = inReplyTo;
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Outlook send failed: ${response.status} ${errText}` };
      }

      return { success: true, messageId: inReplyTo || `outlook-${Date.now()}` };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private extractEmail(value: string): string {
    const match = value.match(/<([^>]+)>/);
    return match ? match[1] : value.trim();
  }
}

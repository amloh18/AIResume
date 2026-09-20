/**
 * JMAP Service
 *
 * Primary mail API for BuildAIResume communication system.
 * Uses Stalwart JMAP for mailbox access, message querying, threading, submission.
 *
 * Architecture:
 * App → JMAP Service → Stalwart JMAP API → Mailbox/Submission
 */

import nodemailer from 'nodemailer';

// ============================================================================
// Configuration
// ============================================================================

function getJmapConfig() {
  const baseUrl = process.env.STALWART_JMAP_URL || 'http://localhost:8085/jmap';
  const user = process.env.STALWART_JMAP_USER || 'admin';
  const pass = process.env.STALWART_JMAP_PASSWORD || process.env.STALWART_RECOVERY_PASSWORD || '';
  return { baseUrl, user, pass };
}

function getSmtpConfig() {
  const host = process.env.STALWART_SMTP_HOST || '192.168.1.8';
  const port = parseInt(process.env.STALWART_SMTP_PORT || '587');
  const secure = process.env.STALWART_SMTP_SECURE === 'true' || port === 465;
  const user = process.env.STALWART_SMTP_USER || 'applications@morigrid.com';
  const pass = process.env.STALWART_SMTP_PASSWORD || process.env.STALWART_RECOVERY_PASSWORD || '';
  const senderEmail = process.env.APPLICATION_SENDER_EMAIL || 'admin@morigrid.com';
  const senderName = process.env.APPLICATION_SENDER_NAME || 'BuildAIResume';
  return { host, port, secure, user, pass, senderEmail, senderName };
}

// ============================================================================
// JMAP Session
// ============================================================================

export interface JmapSession {
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  eventSourceUrl: string;
  accounts: Record<string, JmapAccount>;
  primaryAccounts: Record<string, string>;
  username: string;
  capabilities: Record<string, any>;
}

export interface JmapAccount {
  name: string;
  isPersonal: boolean;
  isReadOnly: boolean;
  accountCapabilities: Record<string, any>;
}

let cachedSession: JmapSession | null = null;
let sessionExpiry: number = 0;

/**
 * Get JMAP session (cached for 5 minutes)
 */
export async function getJmapSession(): Promise<JmapSession> {
  if (cachedSession && Date.now() < sessionExpiry) {
    return cachedSession;
  }

  const { baseUrl, user, pass } = getJmapConfig();
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');

  const response = await fetch(`${baseUrl}/session`, {
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error(`JMAP session failed: ${response.status} ${response.statusText}`);
  }

  const session = await response.json();

  // Option A: If baseUrl is internal, rewrite external URLs to use baseUrl origin
  try {
    const baseOrigin = new URL(baseUrl).origin;
    const rewriteUrl = (url?: string) => {
      if (!url) return url;
      try {
        const parsed = new URL(url);
        return `${baseOrigin}${parsed.pathname}${parsed.search}`;
      } catch {
        return url;
      }
    };
    if (session.apiUrl) session.apiUrl = rewriteUrl(session.apiUrl);
    if (session.downloadUrl) session.downloadUrl = rewriteUrl(session.downloadUrl);
    if (session.uploadUrl) session.uploadUrl = rewriteUrl(session.uploadUrl);
    if (session.eventSourceUrl) session.eventSourceUrl = rewriteUrl(session.eventSourceUrl);
  } catch {
    // Keep original session URLs if parsing fails
  }

  cachedSession = session;
  sessionExpiry = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes
  return session;
}

/**
 * Get the primary account ID
 */
export async function getAccountId(): Promise<string> {
  const session = await getJmapSession();
  const accounts = Object.entries(session.accounts);
  if (accounts.length === 0) throw new Error('No JMAP accounts found');
  return accounts[0][0];
}

// ============================================================================
// JMAP Methods
// ============================================================================

/**
 * Execute a JMAP method call
 */
export async function jmapCall(
  method: string,
  params: Record<string, any>,
  accountId?: string
): Promise<any> {
  if (!accountId) {
    accountId = await getAccountId();
  }

  const { user, pass } = getJmapConfig();
  const session = await getJmapSession();
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');

  const response = await fetch(session.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      using: [
        'urn:ietf:params:jmap:core',
        'urn:ietf:params:jmap:mail',
        'urn:ietf:params:jmap:submission',
      ],
      methodCalls: [
        [method, { accountId, ...params }, 'call0'],
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`JMAP call failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const [methodName, responseData, callId] = result.methodResponses[0];

  if (methodName === 'error') {
    throw new Error(`JMAP error: ${responseData.description || responseData.type}`);
  }

  return responseData;
}

/**
 * Execute multiple JMAP method calls in a single request
 */
export async function jmapMultiCall(
  calls: Array<[string, Record<string, any>]>
): Promise<any[]> {
  const accountId = await getAccountId();
  const { user, pass } = getJmapConfig();
  const session = await getJmapSession();
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');

  const methodCalls = calls.map(([method, params], i) => [
    method,
    { accountId, ...params },
    `call${i}`,
  ]);

  const response = await fetch(session.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      using: [
        'urn:ietf:params:jmap:core',
        'urn:ietf:params:jmap:mail',
        'urn:ietf:params:jmap:submission',
      ],
      methodCalls,
    }),
  });

  if (!response.ok) {
    throw new Error(`JMAP multi-call failed: ${response.status}`);
  }

  const result = await response.json();
  return result.methodResponses.map(([methodName, data]: [string, any]) => {
    if (methodName === 'error') {
      throw new Error(`JMAP error: ${data.description || data.type}`);
    }
    return data;
  });
}

// ============================================================================
// Mailbox Operations
// ============================================================================

export interface JmapMailbox {
  id: string;
  name: string;
  parentId: string | null;
  role: string;
  sortOrder: number;
  isSubscribed: boolean;
  totalEmails: number;
  unreadEmails: number;
  totalThreads: number;
  unreadThreads: number;
}

/**
 * Get all mailboxes
 */
export async function getMailboxes(): Promise<JmapMailbox[]> {
  const result = await jmapCall('Mailbox/get', {
    properties: [
      'id', 'name', 'parentId', 'role', 'sortOrder', 'isSubscribed',
      'totalEmails', 'unreadEmails', 'totalThreads', 'unreadThreads',
    ],
  });
  return result.list || [];
}

/**
 * Get mailbox by role
 */
export async function getMailboxByRole(role: string): Promise<JmapMailbox | null> {
  const mailboxes = await getMailboxes();
  return mailboxes.find(m => m.role === role) || null;
}

// ============================================================================
// Email Operations
// ============================================================================

/** A single JMAP body-part descriptor (RFC 8621 §4.1.1). */
export interface EmailBodyPart {
  partId: string;
  blobId?: string;
  size?: number;
  type?: string;
  name?: string;
  charset?: string;
  disposition?: string;
  cid?: string;
  subParts?: EmailBodyPart[];
}

export interface JmapEmail {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  from: Array<{ name?: string; email: string }>;
  to: Array<{ name?: string; email: string }>;
  cc?: Array<{ name?: string; email: string }>;
  bcc?: Array<{ name?: string; email: string }>;
  subject: string;
  receivedAt: string;
  /** RFC 8621 §4.1.1 — an array of body-part descriptors. Union with string to tolerate non-conforming servers. */
  textBody?: EmailBodyPart[] | string;
  /** RFC 8621 §4.1.1 — an array of body-part descriptors. Union with string to tolerate non-conforming servers. */
  htmlBody?: EmailBodyPart[] | string;
  /** RFC 8621 §4.1.4 — the actual text content, keyed by partId. Populated via fetchTextBodyValues / fetchHTMLBodyValues. */
  bodyValues?: Record<string, { value: string; isTruncated: boolean }>;
  headers?: Array<{ name: string; value: string }>;
  size?: number;
  preview?: string;
}

/**
 * Resolve a JMAP body property to plain text.
 *
 * Handles all four cases:
 *   - EmailBodyPart[] + populated bodyValues → joined text
 *   - EmailBodyPart[] + missing bodyValues entry → '' (no throw)
 *   - plain string (non-conforming server) → returned as-is
 *   - undefined / null → ''
 */
export function resolveBodyText(
  body: EmailBodyPart[] | string | undefined | null,
  bodyValues: JmapEmail['bodyValues']
): string {
  if (!body) return '';
  if (typeof body === 'string') return body;
  return body
    .map((part) => bodyValues?.[part.partId]?.value ?? '')
    .filter(Boolean)
    .join('\n');
}

/**
 * Get emails from a mailbox
 */
export async function getEmails(params: {
  mailboxId?: string;
  mailboxRole?: string;
  limit?: number;
  sort?: string;
  sortOrder?: 'ascending' | 'descending';
  filter?: Record<string, any>;
  properties?: string[];
}): Promise<{ list: JmapEmail[]; total: number; state: string }> {
  const { mailboxId, mailboxRole, limit = 50, sort = 'receivedAt', sortOrder = 'descending', filter, properties } = params;

  let targetMailboxId = mailboxId;
  if (!targetMailboxId && mailboxRole) {
    const mailbox = await getMailboxByRole(mailboxRole);
    if (!mailbox) throw new Error(`Mailbox with role '${mailboxRole}' not found`);
    targetMailboxId = mailbox.id;
  }

  const queryFilter: any = filter || {};
  if (targetMailboxId) {
    queryFilter.inMailbox = targetMailboxId;
  }

  let emailIds: string[] = [];
  let state = '';
  let total = 0;

  try {
    const result = await jmapCall('Email/query', {
      filter: queryFilter,
      sort: [{ property: sort, isAscending: sortOrder === 'ascending' }],
      limit,
    });
    emailIds = result.ids || [];
    state = result.state;
    total = result.total ?? emailIds.length;
  } catch (err: any) {
    // If Email/query is not supported or search indexing is unavailable, fall back to Email/get
    const allEmails = await jmapCall('Email/get', {
      ids: null,
      properties: ['id', 'mailboxIds', 'receivedAt', sort],
    });
    let filtered = allEmails.list || [];
    if (targetMailboxId) {
      filtered = filtered.filter((e: any) => e.mailboxIds?.[targetMailboxId]);
    }
    filtered.sort((a: any, b: any) => {
      const ta = new Date(a[sort] || 0).getTime();
      const tb = new Date(b[sort] || 0).getTime();
      return sortOrder === 'ascending' ? ta - tb : tb - ta;
    });
    emailIds = filtered.slice(0, limit).map((e: any) => e.id);
    state = allEmails.state;
    total = filtered.length;
  }

  if (emailIds.length === 0) {
    return { list: [], total: 0, state };
  }

  const emailProperties = properties || [
    'id', 'threadId', 'mailboxIds', 'keywords', 'from', 'to', 'cc',
    'subject', 'receivedAt', 'textBody', 'htmlBody', 'size', 'preview',
    'headers', 'bodyValues',
  ];

  const emails = await jmapCall('Email/get', {
    ids: emailIds,
    properties: emailProperties,
    fetchTextBodyValues: true,
    fetchHTMLBodyValues: true,
  });

  return {
    list: emails.list || [],
    total,
    state,
  };
}



/**
 * Get a single email by ID
 */
export async function getEmailById(emailId: string): Promise<JmapEmail | null> {
  try {
    const result = await jmapCall('Email/get', {
      ids: [emailId],
      properties: [
        'id', 'threadId', 'mailboxIds', 'keywords', 'from', 'to', 'cc', 'bcc',
        'subject', 'receivedAt', 'textBody', 'htmlBody', 'size', 'preview',
        'headers', 'bodyValues',
      ],
      fetchTextBodyValues: true,
      fetchHTMLBodyValues: true,
    });
    return result.list?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Search emails
 */
export async function searchEmails(params: {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  since?: string;
  before?: string;
  limit?: number;
  mailboxRole?: string;
}): Promise<JmapEmail[]> {
  const filter: Record<string, any> = {};

  if (params.query) filter.text = params.query;
  if (params.from) filter.from = params.from;
  if (params.to) filter.to = params.to;
  if (params.subject) filter.subject = params.subject;
  if (params.since) filter.after = params.since;
  if (params.before) filter.before = params.before;

  const res = await getEmails({
    mailboxRole: params.mailboxRole,
    filter,
    limit: params.limit || 50,
  });

  return res.list || [];
}

// ============================================================================
// Thread Operations
// ============================================================================

export interface JmapThread {
  id: string;
  emailIds: string[];
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  messageIds: string[];
  subject: string;
  lastMessageAt: string;
  size: number;
}

/**
 * Get email threads
 */
export async function getThreads(params: {
  mailboxRole?: string;
  limit?: number;
}): Promise<JmapThread[]> {
  const filter: Record<string, any> = {};

  if (params.mailboxRole) {
    const mailbox = await getMailboxByRole(params.mailboxRole);
    if (mailbox) filter.inMailbox = mailbox.id;
  }

  const result = await jmapCall('EmailThread/get', {
    filter,
    limit: params.limit || 50,
    properties: [
      'id', 'emailIds', 'mailboxIds', 'keywords', 'messageIds',
      'subject', 'lastMessageAt', 'size',
    ],
  });

  return result.list || [];
}

// ============================================================================
// Email Submission (Sending)
// ============================================================================

export interface SendEmailParams {
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
  messageId?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType: string;
  }>;
  identityId?: string;
}

/**
 * Send email via JMAP submission
 */
export async function sendEmailViaJmap(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Build RFC 5322 message
    const message = buildRfc5322Message(params);

    // Create blob
    const session = await getJmapSession();
    const { user, pass } = getJmapConfig();
    const { senderName } = getSmtpConfig();
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const accountId = await getAccountId();

    // Upload blob
    const blobResponse = await fetch(`${session.apiUrl}/blob`, {
      method: 'POST',
      headers: {
        'Content-Type': 'message/rfc822',
        'Authorization': `Basic ${auth}`,
      },
      body: message,
    });

    if (!blobResponse.ok) {
      throw new Error(`Blob upload failed: ${blobResponse.status}`);
    }

    const blobResult = await blobResponse.json();
    const blobId = blobResult.blobId;

    // Create email from blob
    const emailResult = await jmapCall('Email/set', {
      create: {
        draft: {
          mailboxIds: { [await getSentMailboxId()]: true },
          from: [{ name: params.fromName || senderName, email: params.from }],
          to: params.to.map(e => ({ email: e })),
          cc: params.cc?.map(e => ({ email: e })),
          bcc: params.bcc?.map(e => ({ email: e })),
          subject: params.subject,
          bodyValues: {
            '': { value: params.textBody, isTruncated: false },
          },
          textBody: [''],
          keywords: { '$seen': true },
        },
      },
    });

    const emailId = emailResult.created?.draft?.id;
    if (!emailId) throw new Error('Failed to create email draft');

    // Submit for delivery
    const identityId = params.identityId || await getIdentityId();
    const submissionResult = await jmapCall('EmailSubmission/set', {
      create: {
        submission: {
          emailId,
          identityId,
          envelope: {
            mailFrom: { email: params.from },
            rcptTo: [...params.to, ...(params.cc || []), ...(params.bcc || [])].map(e => ({ email: e })),
          },
        },
      },
    });

    const submissionId = submissionResult.created?.submission?.id;
    if (!submissionId) throw new Error('Failed to create submission');

    return {
      success: true,
      messageId: emailId,
    };
  } catch (error: any) {
    console.error('JMAP send failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send email via SMTP (Nodemailer) — fallback or primary for application emails
 */
export async function sendEmailViaSmtp(params: SendEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}> {
  try {
    const { host, port, secure, user, pass, senderEmail, senderName } = getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    const mailOptions: any = {
      from: `"${params.fromName || senderName}" <${params.from || senderEmail}>`,
      to: params.to.join(', '),
      cc: params.cc?.join(', '),
      bcc: params.bcc?.join(', '),
      subject: params.subject,
      text: params.textBody,
      html: params.htmlBody,
      replyTo: params.replyTo,
      attachments: params.attachments,
    };

    // Add threading headers
    if (params.inReplyTo) {
      mailOptions.headers = {
        'In-Reply-To': params.inReplyTo,
        'References': params.references?.join(' ') || params.inReplyTo,
      };
    }

    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('SMTP send failed:', error);
    return {
      success: false,
      error: error.message,
      retryable: isRetryableSmtpError(error),
    };
  }
}

// ============================================================================
// Identity Operations
// ============================================================================

export interface JmapIdentity {
  id: string;
  name: string;
  email: string;
  mayDelete: boolean;
}

/**
 * Get sender identities
 */
export async function getIdentities(): Promise<JmapIdentity[]> {
  const result = await jmapCall('Identity/get', {
    properties: ['id', 'name', 'email', 'mayDelete'],
  });
  return result.list || [];
}

/**
 * Get the default identity ID
 */
async function getIdentityId(): Promise<string> {
  const identities = await getIdentities();
  if (identities.length === 0) throw new Error('No JMAP identities found');
  return identities[0].id;
}

// ============================================================================
// Flag Operations
// ============================================================================

/**
 * Mark email as read
 */
export async function markAsRead(emailIds: string[]): Promise<void> {
  await jmapCall('Email/set', {
    update: Object.fromEntries(
      emailIds.map(id => [id, { keywords: { $seen: true } }])
    ),
  });
}

/**
 * Mark email as unread
 */
export async function markAsUnread(emailIds: string[]): Promise<void> {
  await jmapCall('Email/set', {
    update: Object.fromEntries(
      emailIds.map(id => [id, { keywords: { $seen: false } }])
    ),
  });
}

/**
 * Flag email (star)
 */
export async function flagEmail(emailIds: string[]): Promise<void> {
  await jmapCall('Email/set', {
    update: Object.fromEntries(
      emailIds.map(id => [id, { keywords: { $flagged: true } }])
    ),
  });
}

/**
 * Move email to trash
 */
export async function trashEmail(emailIds: string[]): Promise<void> {
  const trashMailbox = await getMailboxByRole('trash');
  if (!trashMailbox) throw new Error('Trash mailbox not found');

  await jmapCall('Email/set', {
    update: Object.fromEntries(
      emailIds.map(id => [id, { mailboxIds: { [trashMailbox.id]: true } }])
    ),
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get sent mailbox ID
 */
async function getSentMailboxId(): Promise<string> {
  const sent = await getMailboxByRole('sent');
  if (!sent) throw new Error('Sent mailbox not found');
  return sent.id;
}

/**
 * Build RFC 5322 message from params
 */
function buildRfc5322Message(params: SendEmailParams): string {
  const { senderName } = getSmtpConfig();
  const lines: string[] = [];

  lines.push(`From: "${params.fromName || senderName}" <${params.from}>`);
  lines.push(`To: ${params.to.join(', ')}`);
  if (params.cc?.length) lines.push(`Cc: ${params.cc.join(', ')}`);
  if (params.bcc?.length) lines.push(`Bcc: ${params.bcc.join(', ')}`);
  lines.push(`Subject: ${params.subject}`);
  lines.push(`Date: ${new Date().toUTCString()}`);
  lines.push(`Message-ID: <${params.messageId || generateMessageId()}>`);

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references?.length) {
    lines.push(`References: ${params.references.join(' ')}`);
  }
  if (params.replyTo) {
    lines.push(`Reply-To: ${params.replyTo}`);
  }

  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: text/plain; charset=utf-8`);
  lines.push('');
  lines.push(params.textBody);

  return lines.join('\r\n');
}

/**
 * Generate a unique message ID
 */
function generateMessageId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}.${random}@morigrid.com`;
}

/**
 * Check if SMTP error is retryable
 */
function isRetryableSmtpError(error: any): boolean {
  const retryableCodes = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAGAIN', 'EHOSTUNREACH'];
  return retryableCodes.includes(error.code) ||
    error.message?.includes('timeout') ||
    error.message?.includes('connection');
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Test JMAP connection
 */
export async function testJmapConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const start = Date.now();
  try {
    const session = await getJmapSession();
    const latencyMs = Date.now() - start;
    return {
      success: true,
      message: `JMAP connected: ${Object.keys(session.accounts).length} account(s)`,
      latencyMs,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `JMAP connection failed: ${error.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const start = Date.now();
  try {
    const { host, port, secure, user, pass } = getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection successful',
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SMTP connection failed: ${error.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

export default {
  getJmapSession,
  getAccountId,
  jmapCall,
  jmapMultiCall,
  getMailboxes,
  getMailboxByRole,
  getEmails,
  getEmailById,
  searchEmails,
  getThreads,
  sendEmailViaJmap,
  sendEmailViaSmtp,
  getIdentities,
  markAsRead,
  markAsUnread,
  flagEmail,
  trashEmail,
  testJmapConnection,
  testSmtpConnection,
};

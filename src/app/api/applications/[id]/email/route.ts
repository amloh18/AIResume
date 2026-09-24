import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import JobApplication from '@/models/JobApplication';
import ApplicationEmailQueue from '@/models/ApplicationEmailQueue';
import { queueApplicationEmail } from '@/lib/services/applicationEmailService';
import { log } from '@/lib/structured-logger';
import {
  CORRELATION_HEADER,
  resolveCorrelationId,
  runWithCorrelation,
} from '@/lib/observability/correlation';

/**
 * POST /api/applications/[id]/email — enqueue an application email (the producer for
 * `ApplicationEmailQueue`).
 *
 * WHY THIS EXISTS
 * ---------------
 * The queue and its worker (`src/workers/emailWorker.ts` → Nodemailer → Stalwart) existed with zero
 * callers: `applicationemailqueues` held no documents and nothing ever wrote to it, so the whole
 * "send the CV by email" channel was dead code. This is the single producer for it.
 *
 * Design rules (AGENTS.md §16, §38, §40):
 *   - **Explicit, user-initiated only.** Nothing here runs automatically from the worker or a cron:
 *     sending an application email *is* a submission, so it needs the same user control as AUTO mode.
 *   - **Async.** The request only enqueues (202); the worker does the SMTP I/O, so no HTTP request
 *     waits on delivery.
 *   - **Idempotent.** The queue's `email_idempotency` index (applicationId + subject) plus the
 *     `queueApplicationEmail` duplicate handling mean a retried POST cannot send twice.
 *   - **Ownership.** Recipient and attachments come from the caller's own JobApplication document,
 *     never from client-supplied URLs.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_CHARS = 20_000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Hosts we will not fetch attachment bytes from (SSRF surface). */
function isFetchableAttachmentUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  // Bare IP literals (v4/v6) are rejected outright — they are the obvious way to aim a fetch at
  // a link-local/metadata address, and no legitimate stored attachment uses one.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host.includes(':')) return false;
  return true;
}

async function downloadAttachment(url: string, label: string): Promise<{ buffer: Buffer; fileName: string }> {
  if (!isFetchableAttachmentUrl(url)) {
    throw new Error(`${label} attachment URL is not an acceptable https URL`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`${label} download failed (${res.status})`);

    const declared = Number(res.headers.get('content-length') || '0');
    if (declared > MAX_ATTACHMENT_BYTES) throw new Error(`${label} attachment is larger than 5 MB`);

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error(`${label} attachment is larger than 5 MB`);

    const fileNameFromUrl = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    return { buffer: bytes, fileName: fileNameFromUrl || `${label}.pdf` };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Same trace contract as the auto-apply route: the id rides the response header here and the
  // queue document (`queueApplicationEmail` picks up the ambient context) on the way in.
  const correlationId = resolveCorrelationId(request.headers.get(CORRELATION_HEADER));
  const response = await runWithCorrelation({ correlationId }, () =>
    enqueueEmail(request, { params })
  );
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}

async function enqueueEmail(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await getConnection();

    const { id } = await params;
    const jobApplication = await JobApplication.findOne({
      _id: id,
      $or: [{ userId: auth.userId }, { userId: String(auth.userId) }],
    }).lean() as any;

    if (!jobApplication) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const recipient: string | undefined =
      (typeof body.recipient === 'string' && body.recipient.trim()) ||
      jobApplication.contacts?.find((c: any) => c.email)?.email ||
      jobApplication.contactDetails?.email ||
      undefined;

    if (!recipient || !EMAIL_REGEX.test(recipient)) {
      return NextResponse.json(
        {
          error: 'No deliverable employer email address on this application',
          hint: 'Add a contact email to the application, or pass `recipient` explicitly.',
        },
        { status: 400 }
      );
    }

    const subject =
      (typeof body.subject === 'string' && body.subject.trim()) ||
      `Application for ${jobApplication.jobTitle} at ${jobApplication.company}`;
    const message =
      (typeof body.message === 'string' && body.message.trim()) ||
      jobApplication.notes ||
      '';

    if (message.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'Message body is too long' }, { status: 400 });
    }

    // ── Attachments: only from this application's own stored documents ──────
    const emailData: Record<string, any> = {
      applicationId: String(jobApplication._id),
      jobId: String(jobApplication.jobId || jobApplication._id),
      userId: auth.userId,
      candidateName:
        [jobApplication.contactDetails?.name].filter(Boolean)[0] ||
        (jobApplication as any).candidateName ||
        '',
      candidateEmail: auth.userEmail || auth.user?.email || '',
      jobTitle: jobApplication.jobTitle,
      company: jobApplication.company,
      employerEmail: recipient,
      subject,
      body: message || `Please find my application for ${jobApplication.jobTitle} attached.`,
      replyTo: auth.userEmail || auth.user?.email || undefined,
    };

    if (body.includeResume !== false) {
      const resume = jobApplication.attachments?.find((a: any) => a.type === 'cv' && a.url);
      if (resume) {
        const dl = await downloadAttachment(resume.url, 'Resume');
        emailData.resumePdf = dl.buffer;
        emailData.resumeFileName = resume.name || dl.fileName;
      }
    }

    if (body.includeCoverLetter === true) {
      const cover = jobApplication.attachments?.find((a: any) => a.type === 'cover-letter' && a.url);
      if (cover) {
        const dl = await downloadAttachment(cover.url, 'Cover letter');
        emailData.coverLetterPdf = dl.buffer;
        emailData.coverLetterFileName = cover.name || dl.fileName;
      }
    }

    if (!emailData.candidateName || !emailData.candidateEmail) {
      return NextResponse.json(
        { error: 'Candidate name and email are required to send an application email' },
        { status: 400 }
      );
    }

    const result = await queueApplicationEmail(emailData as any, 50, new Date());

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to queue email' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        queued: true,
        queueItemId: result.queueItemId,
        applicationId: String(jobApplication._id),
        recipient,
        subject,
        message:
          'Application email queued. The email worker will send it and record the outcome on this application.',
      },
      { status: 202 }
    );
  } catch (error: any) {
    log.error('Failed to queue application email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to queue application email' },
      { status: 500 }
    );
  }
}

/** GET — queue status for this application, so the UI can show queued/sending/sent/failed/retrying. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getConnection();

  const { id } = await params;
  const items = await ApplicationEmailQueue.find({
    applicationId: id,
    userId: { $in: [auth.userId, String(auth.userId)] },
  })
    .select('status attempts retryCount nextRetryAt lastError emailData.subject emailData.employerEmail createdAt completedAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ success: true, emails: items });
}

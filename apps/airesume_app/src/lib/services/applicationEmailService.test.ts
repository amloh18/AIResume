import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  wasApplicationEmailSent,
  sendApplicationEmail,
} from './applicationEmailService';

const findOne = vi.fn();

vi.mock('mongoose', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      models: {
        ...actual.default?.models,
        ApplicationEmailQueue: { findOne: (...a: any[]) => findOne(...a) },
      },
    },
    models: {
      ...actual.models,
      ApplicationEmailQueue: { findOne: (...a: any[]) => findOne(...a) },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockResolvedValue(null);
});

afterEach(() => {
  delete process.env.APPLICATION_SENDER_EMAIL;
  delete process.env.STALWART_SMTP_HOST;
  delete process.env.EMAIL_SERVER_HOST;
});

describe('wasApplicationEmailSent — subject scoping', () => {
  it('does not treat a different email on the same application as already sent', async () => {
    // A "sent" row exists for the application, but for a different subject.
    findOne.mockResolvedValueOnce(null);

    const sent = await wasApplicationEmailSent(
      'app1',
      'application',
      'Follow-up: Backend Engineer at Acme'
    );

    expect(sent).toBe(false);
    expect(findOne).toHaveBeenCalledWith({
      applicationId: 'app1',
      status: 'sent',
      'emailData.subject': 'Follow-up: Backend Engineer at Acme',
    });
  });

  it('reports sent when the same application + subject is on the queue as sent', async () => {
    findOne.mockResolvedValueOnce({ _id: 'q1' });

    const sent = await wasApplicationEmailSent(
      'app1',
      'application',
      'Application for Backend Engineer at Acme'
    );

    expect(sent).toBe(true);
  });

  it('omits the subject clause when no subject is supplied (legacy call sites)', async () => {
    findOne.mockResolvedValueOnce(null);

    await wasApplicationEmailSent('app1');

    expect(findOne).toHaveBeenCalledWith({
      applicationId: 'app1',
      status: 'sent',
    });
  });

  it('fails open on storage errors (does not block a send path on a read error)', async () => {
    findOne.mockRejectedValueOnce(new Error('down'));

    await expect(wasApplicationEmailSent('app1', 'application', 's')).resolves.toBe(false);
  });
});

describe('sendApplicationEmail — configuration fails closed', () => {
  const data = {
    applicationId: 'app1',
    jobId: 'job1',
    userId: 'user1',
    candidateName: 'Jane Doe',
    candidateEmail: 'jane@example.com',
    jobTitle: 'Backend Engineer',
    company: 'Acme',
    employerEmail: 'jobs@acme.test',
    subject: 'Application for Backend Engineer at Acme',
    body: 'Hello, please find my application attached.',
  };

  it('refuses to send when SMTP is not configured, without retrying', async () => {
    const result = await sendApplicationEmail(data as any);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  it('refuses to send when APPLICATION_SENDER_EMAIL is missing (no baked-in sender identity)', async () => {
    process.env.STALWART_SMTP_HOST = 'stalwart.internal';
    process.env.STALWART_SMTP_USER = 'app@buildairesume.com';
    process.env.STALWART_SMTP_PASSWORD = 'x';

    const result = await sendApplicationEmail(data as any);

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/APPLICATION_SENDER_EMAIL/);
  });
});

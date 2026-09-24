import { describe, it, expect, vi, beforeEach } from 'vitest';
import webhookRetryService from './webhookRetryService';
import WebhookLog from '@/models/WebhookLog';
import { StripeProvider } from '@/lib/payment/providers/stripe';

vi.mock('@/models/WebhookLog', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));
vi.mock('@/lib/database', () => ({
  getConnection: vi.fn().mockResolvedValue(undefined),
  ensureConnection: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/payment/providers/stripe', () => ({
  StripeProvider: vi.fn(),
}));

const findAndUpdate = WebhookLog.findByIdAndUpdate as ReturnType<typeof vi.fn>;
const findById = WebhookLog.findById as ReturnType<typeof vi.fn>;
const handleMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (StripeProvider as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    () => ({ handleWebhookEvent: handleMock })
  );
  findAndUpdate.mockResolvedValue({});
});

const failedStripeLog = () => ({
  _id: 'log1',
  provider: 'stripe',
  eventType: 'checkout.session.completed',
  externalId: 'evt_123',
  status: 'failed',
  retryCount: 0,
  payload: { object: { id: 'cs_123' } },
});

describe('webhookRetryService — Stripe retry actually re-processes', () => {
  it('re-invokes the shared Stripe handler with the stored payload and marks the log processed', async () => {
    findById.mockResolvedValue(failedStripeLog());
    handleMock.mockResolvedValue({ handled: true, action: 'checkout_completed' });

    const result = await webhookRetryService.retryFailedWebhook('log1');

    expect(result.success).toBe(true);
    expect(handleMock).toHaveBeenCalledTimes(1);
    expect(handleMock.mock.calls[0][0]).toMatchObject({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_123' } },
    });

    const update = findAndUpdate.mock.calls[0][1];
    expect(update.status).toBe('processed');
    expect(update.retryCount).toBe(1);
  });

  it('reports failure (not an unhandled "not implemented" throw) when the handler declines the event', async () => {
    findById.mockResolvedValue(failedStripeLog());
    handleMock.mockResolvedValue({ handled: false, error: 'Missing metadata' });

    const result = await webhookRetryService.retryFailedWebhook('log1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Missing metadata/);
    expect(findAndUpdate.mock.calls[0][1].status).toBe('error');
  });

  it('increments retryCount and escalates to failed_permanently at the max', async () => {
    findById.mockResolvedValue({
      ...failedStripeLog(),
      retryCount: (webhookRetryService as any).MAX_RETRIES - 1,
    });
    handleMock.mockRejectedValue(new Error('boom'));

    const result = await webhookRetryService.retryFailedWebhook('log1');

    expect(result.success).toBe(false);
    const update = findAndUpdate.mock.calls[0][1];
    expect(update.status).toBe('failed_permanently');
  });

  it('gives up cleanly when the log is missing', async () => {
    findById.mockResolvedValue(null);

    const result = await webhookRetryService.retryFailedWebhook('nope');

    expect(result.success).toBe(false);
    expect(handleMock).not.toHaveBeenCalled();
  });
});

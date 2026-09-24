import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  runWithCorrelation,
  getCorrelationId,
  getCorrelationContext,
  setCorrelationFields,
  newCorrelationId,
  resolveCorrelationId,
  sanitizeIncomingCorrelationId,
  CORRELATION_HEADER,
} from './correlation';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('correlation id sanitisation (it lands in logs we do not control)', () => {
  it('accepts a bounded printable id', () => {
    expect(sanitizeIncomingCorrelationId('abc-123_XYZ.0:1')).toBe('abc-123_XYZ.0:1');
  });

  it('rejects empty, oversized, or non-printable input', () => {
    expect(sanitizeIncomingCorrelationId(null)).toBeNull();
    expect(sanitizeIncomingCorrelationId('')).toBeNull();
    expect(sanitizeIncomingCorrelationId('   ')).toBeNull();
    expect(sanitizeIncomingCorrelationId('x'.repeat(129))).toBeNull();
    expect(sanitizeIncomingCorrelationId('has space')).toBeNull();
    expect(sanitizeIncomingCorrelationId('inject\nnewline')).toBeNull();
    expect(sanitizeIncomingCorrelationId('<script>')).toBeNull();
  });

  it('reuses a sane inbound id and mints one otherwise', () => {
    expect(resolveCorrelationId('trace-1')).toBe('trace-1');
    expect(resolveCorrelationId(null)).toMatch(/^(cid-|[0-9a-f-]{8})/);
    // An unsanitised inbound value never reaches logs: a fresh id is minted instead.
    expect(resolveCorrelationId('bad id!')).not.toBe('bad id!');
    expect(sanitizeIncomingCorrelationId('bad id!')).toBeNull();
  });

  it('mints unique ids', () => {
    expect(newCorrelationId()).not.toBe(newCorrelationId());
  });

  it('exposes the header name used end to end', () => {
    expect(CORRELATION_HEADER).toBe('x-correlation-id');
  });
});

describe('ambient correlation context', () => {
  it('is visible inside the callback and gone after it', () => {
    expect(getCorrelationId()).toBeUndefined();

    runWithCorrelation({ correlationId: 'trace-a' }, () => {
      expect(getCorrelationId()).toBe('trace-a');
    });

    expect(getCorrelationId()).toBeUndefined();
  });

  it('survives awaits inside the callback', async () => {
    await runWithCorrelation({ correlationId: 'trace-b' }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      expect(getCorrelationId()).toBe('trace-b');
      await Promise.resolve();
      expect(getCorrelationId()).toBe('trace-b');
    });
  });

  it('does not leak across concurrent contexts', async () => {
    const seen = await Promise.all(
      ['trace-1', 'trace-2', 'trace-3'].map((id) =>
        runWithCorrelation({ correlationId: id }, async () => {
          await new Promise((r) => setTimeout(r, Math.random() * 10));
          return getCorrelationId();
        })
      )
    );

    expect(seen).toEqual(['trace-1', 'trace-2', 'trace-3']);
  });

  it('mints an id when none is supplied and enriches via setCorrelationFields', () => {
    runWithCorrelation({}, () => {
      const id = getCorrelationId();
      expect(id).toBeTruthy();

      setCorrelationFields({ applicationId: 'app-1', queueItemId: 'q-1' });
      expect(getCorrelationContext()).toMatchObject({
        correlationId: id,
        applicationId: 'app-1',
        queueItemId: 'q-1',
      });
    });
  });

  it('setCorrelationFields is a no-op outside a context (never a precondition)', () => {
    expect(() => setCorrelationFields({ applicationId: 'x' })).not.toThrow();
  });
});

describe('structured logger integration', () => {
  it('stamps the ambient correlation id on log entries', async () => {
    const { log } = await import('@/lib/structured-logger');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    runWithCorrelation({ correlationId: 'trace-log', userId: 'user-9' }, () => {
      log.info('hello from a tracked context');
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const written = String(spy.mock.calls[0][0]);
    expect(written).toContain('trace-log');
    expect(written).toContain('hello from a tracked context');
  });

  it('omits the id when there is no context', async () => {
    const { log } = await import('@/lib/structured-logger');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

    log.info('no context here');

    const written = String(spy.mock.calls[0][0]);
    expect(written).not.toContain('correlationId');
  });
});

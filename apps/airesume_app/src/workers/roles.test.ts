import { describe, it, expect } from 'vitest';
import {
  WORKER_LOOP_KEYS,
  describeWorkerPlan,
  getEnabledLoops,
  getWorkerPlan,
  isWorkerProcess,
  parseWorkerRole,
  resolveWorkerRole,
} from './roles';

/**
 * These guard the switch that keeps background loops out of the web container. The failure modes worth
 * pinning down are the quiet ones: a typo that stops queue processing, and a "web" role that still
 * starts a loop (which would keep interrupting work on every redeploy).
 */
describe('worker role resolution', () => {
  it('defaults to "all" so an unconfigured deployment keeps its previous behaviour', () => {
    expect(parseWorkerRole(undefined)).toEqual({ role: 'all' });
    expect(parseWorkerRole(null)).toEqual({ role: 'all' });
    expect(parseWorkerRole('')).toEqual({ role: 'all' });
    expect(parseWorkerRole('   ')).toEqual({ role: 'all' });
  });

  it('accepts the three roles, ignoring case and surrounding whitespace', () => {
    for (const value of ['all', 'web', 'worker']) {
      expect(parseWorkerRole(value)).toEqual({ role: value });
      expect(parseWorkerRole(value.toUpperCase())).toEqual({ role: value });
      expect(parseWorkerRole(`  ${value}  `)).toEqual({ role: value });
    }
  });

  it('fails open to "all" and explains itself when the value is unrecognised', () => {
    const { role, warning } = parseWorkerRole('web-worker');

    expect(role).toBe('all');
    expect(warning).toContain('web-worker');
    expect(warning).toContain('all, web, worker');
  });

  it('reads WORKER_ROLE from the provided environment', () => {
    expect(resolveWorkerRole({ WORKER_ROLE: 'web' }).role).toBe('web');
    expect(resolveWorkerRole({}).role).toBe('all');
  });
});

describe('worker plan', () => {
  it('runs every loop for "all" and "worker"', () => {
    for (const role of ['all', 'worker'] as const) {
      const plan = getWorkerPlan(role);
      expect(getEnabledLoops(plan)).toEqual([...WORKER_LOOP_KEYS]);
      expect(isWorkerProcess(plan)).toBe(true);
    }
  });

  it('enables no loop for "web" — the whole point of the role', () => {
    const plan = getWorkerPlan('web');

    expect(isWorkerProcess(plan)).toBe(false);
    expect(getEnabledLoops(plan)).toEqual([]);
    expect(describeWorkerPlan(plan)).toBe('none');
  });

  it('returns a copy, so a caller cannot mutate the shared plan', () => {
    const first = getWorkerPlan('all');
    first.email = false;

    expect(getWorkerPlan('all').email).toBe(true);
  });

  it('describes the enabled loops for logs', () => {
    expect(describeWorkerPlan(getWorkerPlan('worker'))).toBe(
      'email, emailIngestion, applicationQueue, reconciliation'
    );
  });
});

import { SubmissionVerifier } from '../../verification/submissionVerifier';
import { generateApplicationIdempotencyKey } from '../../verification/idempotencyGuard';
import { describe, it, expect } from 'vitest';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export function runCrashRecoverySuite(): { passed: boolean; results: string[] } {
  const verifier = new SubmissionVerifier();
  const results: string[] = [];

  // Test A: Safe Idempotency Key Generation
  const key1 = generateApplicationIdempotencyKey('user_123', 'job_456', 'cv_789');
  const key2 = generateApplicationIdempotencyKey('user_123', 'job_456', 'cv_789');
  const key3 = generateApplicationIdempotencyKey('user_123', 'job_456', 'cv_different');
  assert(key1 === key2, 'Keys with identical inputs must be identical');
  assert(key1 !== key3, 'Keys with different CV inputs must differ');
  assert(key1.length === 64, 'Key must be valid SHA-256 hash');
  results.push('✓ Test A: Idempotency Key Generation validated');

  // Test B: Worker crash after submit with Positive Confirmation Receipt
  const resB = verifier.verifyEvidence({
    confirmationId: 'GH-91823',
    confirmationUrl: 'https://boards.greenhouse.io/acme/jobs/123/confirmation',
    statusCode: 200,
  });
  assert(resB.confirmed === true, 'Valid confirmation ID must confirm application');
  assert(resB.confidence >= 0.95, 'Confirmation confidence must be >= 0.95');
  assert(resB.confirmationId === 'GH-91823', 'Confirmation ID must match input');
  results.push('✓ Test B: Post-Submit crash with receipt transitions to APPLIED');

  // Test C: Worker crash after submit without proof -> Must NOT mark applied
  const resC = verifier.verifyEvidence({
    statusCode: 500,
    domSuccessMatch: false,
  });
  assert(resC.confirmed === false, 'Absence of proof must reject APPLIED transition');
  assert(resC.confidence === 0, 'Unverified attempt must have 0 confidence');
  results.push('✓ Test C: Post-Submit crash without proof halts safely (Never duplicate submits)');

  // Test D: Manual confirmation provides 100% confidence
  const resD = verifier.verifyEvidence({
    userManuallyConfirmed: true,
  });
  assert(resD.confirmed === true, 'Manual confirmation must succeed');
  assert(resD.confidence === 1.0, 'Manual confirmation confidence must be 1.0');
  results.push('✓ Test D: Manual confirmation provides 100% verified trust');

  return { passed: true, results };
}

/*
 * Vitest entry point. This file used to export runCrashRecoverySuite() without ever registering a
 * test, so `vitest run` failed it with "No test suite found" and the assertions below never executed
 * in CI. The suite body is pure/offline (idempotency hashing + submission-evidence verification), so
 * it runs unconditionally; any failed assert() throws and fails the it() block.
 */
describe('crash recovery (submission verification + idempotency)', () => {
  it('passes all crash-recovery assertions', () => {
    const { passed, results } = runCrashRecoverySuite();
    expect(passed, results.join('\n')).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(4);
  });
});

import crypto from 'crypto';

export function generateApplicationIdempotencyKey(
  userId: string,
  jobId: string,
  cvId?: string
): string {
  const payload = `${userId}:::${jobId}:::${cvId || 'default'}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

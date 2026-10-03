/**
 * Sanitizes internal error messages before they reach the UI.
 *
 * Infrastructure failures (database, quota, network, auth internals) surface
 * as raw Error messages in API responses and catch blocks. Those details are
 * valuable in server logs but must never be shown to end users — when a
 * message matches a known internal pattern it is replaced with a friendly
 * fallback instead.
 */

const INTERNAL_ERROR_PATTERNS: RegExp[] = [
  // Database / Atlas
  /space quota/i,
  /writes? (?:are|is) blocked/i,
  /cloud\.mongodb\.com/i,
  /mongodb/i,
  /mongo(?:oses|server)/i,
  /replicaset/i,
  /mongoose/i,
  /cast to .* failed/i,
  /duplicate key/i,
  // Network
  /\b(?:ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNRESET|EPIPE|EHOSTUNREACH)\b/,
  /getaddrinfo/i,
  /querySrv/i,
  /connection (?:closed|refused|reset|pool|timed out|string)/i,
  /socket (?:hang up|closed|error)/i,
  /(?:TLS|SSL) handshake/i,
  /server selection (?:timed out|error)/i,
  /buffering timed out/i,
  // Auth / secrets internals
  /authentication failed/i,
  /IP .*not allowed/i,
  /decryption failed/i,
];

function extractMessage(error: unknown): string {
  if (typeof error === 'string') return error.trim();
  if (error instanceof Error) return (error.message || '').trim();
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message.trim();
  }
  return '';
}

/**
 * Returns a message that is safe to display to end users.
 *
 * - Ordinary messages pass through unchanged.
 * - Messages that look like internal infrastructure errors are replaced
 *   with `fallback`.
 * - Missing/empty input returns `fallback`.
 */
export function toUserFacingMessage(
  error: unknown,
  fallback = "Something went wrong on our side. Please try again in a moment."
): string {
  const raw = extractMessage(error);
  if (!raw) return fallback;
  for (const pattern of INTERNAL_ERROR_PATTERNS) {
    if (pattern.test(raw)) return fallback;
  }
  return raw;
}

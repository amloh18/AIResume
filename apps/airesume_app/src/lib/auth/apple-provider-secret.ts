import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

/**
 * Apple Sign-In client secret generator.
 *
 * Apple does not use a static client secret. The `client_secret` sent during
 * the OAuth token exchange must be an ES256-signed JWT created from the
 * `AuthKey_XXXXXXXXXX.p8` key downloaded from the Apple Developer portal:
 *   - iss: Apple 10-character Team ID        (APPLE_TEAM_ID)
 *   - sub: the Services ID / client ID       (APPLE_ID)
 *   - aud: https://appleid.apple.com
 *   - kid: the key ID in the JWT header      (APPLE_KEY_ID)
 *
 * Configuration (checked in this order):
 *   1. APPLE_SECRET      – optional pre-generated client-secret JWT (static,
 *                          valid up to 6 months). Takes priority if present.
 *   2. APPLE_KEY_PATH    – path to the .p8 key file (absolute, or relative to
 *                          the project root), together with APPLE_ID,
 *                          APPLE_TEAM_ID and APPLE_KEY_ID.
 *   3. APPLE_KEY_CONTENT – the .p8 file contents pasted directly as an env var
 *                          (useful in Docker/Dokploy where files are awkward).
 *
 * The generated secret is cached for the process lifetime and regenerated
 * automatically when it comes within 7 days of expiry (Apple allows a max
 * validity of 6 months per secret).
 */

const APPLE_TOKEN_AUDIENCE = 'https://appleid.apple.com';
const SECRET_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days (Apple maximum)
const REGENERATION_WINDOW_SECONDS = 7 * 24 * 60 * 60; // regenerate 7 days before expiry

interface CachedSecret {
  secret: string;
  expiresAt: number; // unix seconds
  clientId?: string;
}

let cachedSecret: CachedSecret | null = null;
let hasWarnedNotConfigured = false;

/** Normalize .p8 contents pasted into an environment variable. */
function normalizeKeyContent(raw: string): string {
  let key = raw.trim();

  // 1) Un-escape literal "\n" sequences (env vars / Dokploy often deliver the PEM
  //    as one line with backslash-n escapes instead of real newlines).
  //
  //    Detect this by the ABSENCE OF A REAL NEWLINE, not by the absence of the
  //    "-----BEGIN" marker. The original guard was `!key.includes('-----BEGIN')`,
  //    which is false for a single-line PEM — it still contains the BEGIN marker
  //    text — so the un-escaping was skipped in exactly the case it was written
  //    for. The key then reached jwt.sign() as one line with literal "\n", and
  //    ES256 failed with "secretOrPrivateKey must be an asymmetric key".
  if (!key.includes('\n') && key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  // 2) Base64-encoded PEM body.
  if (!key.includes('-----BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN')) key = decoded;
    } catch {
      // not base64 — leave as-is; signing will fail with a clear error
    }
  }

  // 3) Fully collapsed PEM: markers present but no line break anywhere
  //    ("-----BEGIN PRIVATE KEY-----MIGT...-----END PRIVATE KEY-----").
  //    Re-introduce the delimiters; OpenSSL accepts an unwrapped base64 body.
  if (key.includes('-----BEGIN') && !key.includes('\n')) {
    key = key
      .replace(/(-----BEGIN [A-Z0-9 ]+-----)/, '$1\n')
      .replace(/(-----END [A-Z0-9 ]+-----)/, '\n$1');
  }

  return key;
}

function readKeyFile(keyPath: string): string | null {
  if (!keyPath) return null;
  try {
    const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
    return fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    console.error(`🍎 Failed to read Apple .p8 key file at "${keyPath}":`, error);
    return null;
  }
}

/**
 * Get the Apple Sign-In client secret.
 *
 * Returns an empty string when Apple Sign-In is not configured — this keeps
 * the provider disabled without affecting the other auth providers.
 */
export function getAppleClientSecret(): string {
  // 1) Static pre-generated secret wins (user-generated JWT).
  if (process.env.APPLE_SECRET) {
    return process.env.APPLE_SECRET;
  }

  const clientId = process.env.APPLE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const rawKey = process.env.APPLE_KEY_CONTENT || (process.env.APPLE_KEY_PATH ? readKeyFile(process.env.APPLE_KEY_PATH) : null);

  if (!clientId || !teamId || !keyId || !rawKey) {
    if (!hasWarnedNotConfigured) {
      hasWarnedNotConfigured = true;
      console.warn(
        '🍎 Apple Sign-In is not fully configured. Set APPLE_ID, APPLE_TEAM_ID, APPLE_KEY_ID ' +
        'and either APPLE_KEY_PATH (a .p8 file) or APPLE_KEY_CONTENT, or a pre-generated APPLE_SECRET. ' +
        'The Apple provider will be unavailable until then.'
      );
    }
    return '';
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedSecret && cachedSecret.clientId === clientId && cachedSecret.expiresAt - now > REGENERATION_WINDOW_SECONDS) {
    return cachedSecret.secret;
  }

  try {
    const key = normalizeKeyContent(rawKey);
    const expiresAt = now + SECRET_TTL_SECONDS;
    const secret = jwt.sign({}, key, {
      algorithm: 'ES256',
      keyid: keyId,
      issuer: teamId,
      subject: clientId,
      audience: APPLE_TOKEN_AUDIENCE,
      expiresIn: SECRET_TTL_SECONDS,
    });
    cachedSecret = { secret, expiresAt, clientId };
    console.log(`🍎 Apple client secret generated (kid=${keyId}, valid ${Math.round(SECRET_TTL_SECONDS / 86400)} days)`);
    return secret;
  } catch (error) {
    console.error('🍎 Failed to generate Apple client secret from .p8 key:', error);
    return '';
  }
}

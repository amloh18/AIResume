import { getConnection } from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { sendVerificationCode } from '@/lib/email-service';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * 2FA session lifetime. Exported so the email template and the session record can never
 * disagree about how long the code is valid — the template used to hardcode "10 minutes".
 */
export const TWO_FACTOR_CODE_TTL_MS = 10 * 60 * 1000;

/** Failed attempts allowed before a session is destroyed. */
export const TWO_FACTOR_MAX_ATTEMPTS = 3;

/**
 * NOTE ON STORAGE
 *
 * These sessions used to live in a module-level `Map`. That silently breaks sign-in:
 *  - any process restart (deploy, crash, container recycle) drops every pending session;
 *  - `next dev` / Turbopack drops them on every file save;
 *  - with more than one instance or replica, the code is generated on one process and
 *    verified on another, so it is never found.
 * The user-visible symptom is "Invalid or expired session. Please sign in again." after
 * typing a correct code. Sessions now live in MongoDB (the app's primary store, already
 * required by this module) via the `VerificationToken` collection, which gives us the
 * existing TTL index, attempt counting and a shared view across instances.
 */

export interface TwoFactorSession {
  sessionId: string;
  userId: string;
  email: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
}

// Recovery code configuration
const RECOVERY_CODE_COUNT = 5;
const RECOVERY_CODE_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Generate a 6-digit verification code
 */
export function generateTwoFactorCode(): string {
  // crypto.randomInt is uniform; Math.random() is not and is not a CSPRNG.
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  await getConnection();
  const userSettings = await UserSettings.findOne({ userId });
  return userSettings?.security?.twoFactorEnabled === true;
}

/**
 * Resolve a display name for the email greeting without requiring every caller to
 * thread it through. Callers that already hold the user can pass it to skip this read.
 */
async function resolveFirstName(
  userId: string,
  email: string,
  provided?: string
): Promise<string | undefined> {
  const trimmed = provided?.trim();
  if (trimmed) return trimmed;

  try {
    const user = await User.findById(userId).select('firstName').lean();
    const name = (user as any)?.firstName?.trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Generate and send 2FA code
 */
export async function generateAndSendTwoFactorCode(
  userId: string,
  email: string,
  isSetup: boolean = false,
  firstName?: string
): Promise<{ success: boolean; sessionId: string; error?: string }> {
  try {
    await getConnection();

    // Check if 2FA is enabled (unless setting it up)
    if (!isSetup) {
      const isEnabled = await isTwoFactorEnabled(userId);
      if (!isEnabled) {
        return { success: false, sessionId: '', error: 'Two-factor authentication is not enabled' };
      }
    }

    // Generate 6-digit code
    const code = generateTwoFactorCode();

    // Persist the session (also invalidates any previous live session for this user,
    // so requesting a fresh code always supersedes the old one).
    const { sessionId } = await VerificationToken.createTwoFactorSession(
      userId,
      email,
      code,
      TWO_FACTOR_CODE_TTL_MS,
      TWO_FACTOR_MAX_ATTEMPTS
    );

    // Send code via email
    const emailResult = await sendVerificationCode(email, code, 'two-factor-login', {
      firstName: await resolveFirstName(userId, email, firstName),
      expiryMinutes: Math.round(TWO_FACTOR_CODE_TTL_MS / 60000),
      maxAttempts: TWO_FACTOR_MAX_ATTEMPTS,
      isSetup,
    });

    if (!emailResult.success) {
      await VerificationToken.invalidateTwoFactorSessions(userId);
      return { success: false, sessionId: '', error: emailResult.error || 'Failed to send code' };
    }

    console.log(`✅ 2FA code generated and sent to ${email} (session: ${sessionId.substring(0, 8)}...)`);

    return { success: true, sessionId };
  } catch (error: any) {
    console.error('❌ Error generating 2FA code:', error);
    return { success: false, sessionId: '', error: error.message || 'Failed to generate code' };
  }
}

/**
 * Verify 2FA code.
 *
 * `consume` defaults to `true` (single-use). Pass `consume: false` for a read-only
 * check that leaves the session intact — the sign-in flow checks first and then
 * completes, and consuming on the check destroyed the session before it could be used.
 */
export async function verifyTwoFactorCode(
  sessionId: string,
  code: string,
  options: { consume?: boolean } = {}
): Promise<{ valid: boolean; userId?: string; error?: string; attemptsRemaining?: number }> {
  try {
    await getConnection();

    const result = await VerificationToken.verifyTwoFactorSession(sessionId, code, options);

    if (result.valid) {
      console.log(`✅ 2FA code verified successfully for user ${result.userId}`);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Error verifying 2FA code:', error);
    return { valid: false, error: error.message || 'Failed to verify code' };
  }
}

/**
 * Invalidate all 2FA sessions for a user (e.g., when resending code)
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  await getConnection();
  await VerificationToken.invalidateTwoFactorSessions(userId);
}

/**
 * Generate recovery codes for 2FA setup
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // RECOVERY_CODE_LENGTH is the number of hex *characters*, so draw half that
    // many bytes (each byte renders as two hex chars). Fixes 16-char output.
    const code = crypto.randomBytes(RECOVERY_CODE_LENGTH / 2).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a recovery code using bcrypt
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify a recovery code and mark it as used
 */
export async function verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
  try {
    await getConnection();
    const userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings?.security?.twoFactorRecoveryCodes) {
      return false;
    }

    const { twoFactorRecoveryCodes, twoFactorRecoveryUsed = [] } = userSettings.security;

    // Check if code was already used
    const codeHash = twoFactorRecoveryCodes.find((hashedCode: string) => 
      bcrypt.compareSync(code, hashedCode)
    );

    if (!codeHash) {
      return false;
    }

    // Check if already used
    if (twoFactorRecoveryUsed.includes(codeHash)) {
      return false;
    }

    // Mark as used
    userSettings.security.twoFactorRecoveryUsed = [...twoFactorRecoveryUsed, codeHash];
    await userSettings.save();

    return true;
  } catch (error) {
    console.error('Error verifying recovery code:', error);
    return false;
  }
}

/**
 * Save recovery codes to user settings (hashed)
 */
export async function saveRecoveryCodes(userId: string, codes: string[]): Promise<void> {
  try {
    await getConnection();
    const userSettings = await UserSettings.findOne({ userId });
    
    if (!userSettings) {
      throw new Error('User settings not found');
    }

    const hashedCodes = await Promise.all(
      codes.map(code => bcrypt.hash(code, BCRYPT_SALT_ROUNDS))
    );

    userSettings.security.twoFactorRecoveryCodes = hashedCodes;
    userSettings.security.twoFactorRecoveryUsed = [];
    await userSettings.save();
  } catch (error) {
    console.error('Error saving recovery codes:', error);
    throw error;
  }
}

/**
 * Get recovery codes for display (one-time only)
 * Note: This should only be called during setup to show unhashed codes to the user
 */
export function getRecoveryCodesForDisplay(codes: string[]): string[] {
  return [...codes];
}

/**
 * Check if user has recovery codes available
 */
export async function hasRecoveryCodes(userId: string): Promise<boolean> {
  try {
    await getConnection();
    const userSettings = await UserSettings.findOne({ userId });
    const codes = userSettings?.security?.twoFactorRecoveryCodes || [];
    const used = userSettings?.security?.twoFactorRecoveryUsed || [];
    
    return codes.length > used.length;
  } catch (error) {
    console.error('Error checking recovery codes:', error);
    return false;
  }
}

/**
 * Read a pending 2FA session without consuming it (diagnostics / support tooling).
 */
export async function getTwoFactorSession(sessionId: string): Promise<TwoFactorSession | null> {
  await getConnection();
  const doc = await VerificationToken.findOne({
    token: sessionId,
    type: 'two-factor',
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!doc) return null;

  return {
    sessionId,
    userId: String(doc.userId),
    email: doc.email,
    expiresAt: doc.expiresAt,
    attempts: doc.attempts,
    maxAttempts: doc.maxAttempts ?? TWO_FACTOR_MAX_ATTEMPTS,
  };
}


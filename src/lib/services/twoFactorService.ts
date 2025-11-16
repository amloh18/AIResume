import { getConnection } from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import { sendVerificationCode } from '@/lib/email-service';
import crypto from 'crypto';

export interface TwoFactorSession {
  userId: string;
  email: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

// In-memory store for 2FA sessions (in production, use Redis or database)
const twoFactorSessions = new Map<string, TwoFactorSession>();

/**
 * Generate a 4-digit verification code
 */
export function generateTwoFactorCode(): string {
  // Generate a random 4-digit code (0000-9999)
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  return code;
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
 * Generate and send 2FA code
 */
export async function generateAndSendTwoFactorCode(
  userId: string,
  email: string
): Promise<{ success: boolean; sessionId: string; error?: string }> {
  try {
    await getConnection();

    // Check if 2FA is enabled
    const isEnabled = await isTwoFactorEnabled(userId);
    if (!isEnabled) {
      return { success: false, sessionId: '', error: 'Two-factor authentication is not enabled' };
    }

    // Generate 4-digit code
    const code = generateTwoFactorCode();
    
    // Create session ID
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // Store session (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const session: TwoFactorSession = {
      userId,
      email,
      code,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    };
    
    twoFactorSessions.set(sessionId, session);

    // Send code via email
    const emailResult = await sendVerificationCode(
      email,
      code,
      'passwordless-login' // Reuse existing email template
    );

    if (!emailResult.success) {
      twoFactorSessions.delete(sessionId);
      return { success: false, sessionId: '', error: emailResult.error || 'Failed to send code' };
    }

    console.log(`✅ 2FA code generated and sent to ${email} (session: ${sessionId.substring(0, 8)}...)`);

    // Clean up expired sessions periodically
    cleanupExpiredSessions();

    return { success: true, sessionId };
  } catch (error: any) {
    console.error('❌ Error generating 2FA code:', error);
    return { success: false, sessionId: '', error: error.message || 'Failed to generate code' };
  }
}

/**
 * Verify 2FA code
 */
export async function verifyTwoFactorCode(
  sessionId: string,
  code: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const session = twoFactorSessions.get(sessionId);

    if (!session) {
      return { valid: false, error: 'Invalid or expired session. Please sign in again.' };
    }

    // Check if session expired
    if (new Date() > session.expiresAt) {
      twoFactorSessions.delete(sessionId);
      return { valid: false, error: 'Code has expired. Please sign in again.' };
    }

    // Check max attempts (5 attempts)
    if (session.attempts >= 5) {
      twoFactorSessions.delete(sessionId);
      return { valid: false, error: 'Too many failed attempts. Please sign in again.' };
    }

    // Increment attempts
    session.attempts++;

    // Verify code
    if (session.code !== code) {
      const remainingAttempts = 5 - session.attempts;
      return {
        valid: false,
        error: `Invalid code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'No attempts remaining.'}`,
      };
    }

    // Code is valid - delete session and return userId
    const userId = session.userId;
    twoFactorSessions.delete(sessionId);

    console.log(`✅ 2FA code verified successfully for user ${userId}`);

    return { valid: true, userId };
  } catch (error: any) {
    console.error('❌ Error verifying 2FA code:', error);
    return { valid: false, error: error.message || 'Failed to verify code' };
  }
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = new Date();
  for (const [sessionId, session] of twoFactorSessions.entries()) {
    if (now > session.expiresAt) {
      twoFactorSessions.delete(sessionId);
    }
  }
}

/**
 * Get session info (for debugging)
 */
export function getTwoFactorSession(sessionId: string): TwoFactorSession | null {
  return twoFactorSessions.get(sessionId) || null;
}


import { getConnection } from '@/lib/database';
import VerificationToken from '@/models/VerificationToken';

/**
 * Generate a secure 6-digit verification code
 * Range: 100000-999999 (900,000 possible combinations)
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if email has exceeded rate limit for code requests
 * Rate limit: 3 codes per hour per email
 */
export async function checkCodeRateLimit(email: string): Promise<boolean> {
  try {
    await getConnection();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentCodes = await VerificationToken.countDocuments({
      email: email.toLowerCase(),
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $gte: oneHourAgo }
    });
    
    return recentCodes < 3;
  } catch (error) {
    console.error('Error checking code rate limit:', error);
    return false; // Fail safe - block if we can't check
  }
}

/**
 * Check if there's a recent code request (60 seconds cooldown)
 */
export async function checkCodeCooldown(email: string): Promise<boolean> {
  try {
    await getConnection();
    
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    
    const recentCode = await VerificationToken.findOne({
      email: email.toLowerCase(),
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $gte: oneMinuteAgo }
    });
    
    return !recentCode; // Return true if no recent code (cooldown passed)
  } catch (error) {
    console.error('Error checking code cooldown:', error);
    return false; // Fail safe - block if we can't check
  }
}

/**
 * Increment failed attempts for a verification code
 * Returns the new attempt count
 */
export async function incrementFailedAttempts(codeId: string): Promise<number> {
  try {
    await getConnection();
    
    const result = await VerificationToken.findByIdAndUpdate(
      codeId,
      { $inc: { attempts: 1 } },
      { new: true }
    );
    
    return result?.attempts || 0;
  } catch (error) {
    console.error('Error incrementing failed attempts:', error);
    return 0;
  }
}

/**
 * Clean up expired verification codes
 * Removes codes older than 5 minutes
 */
export async function cleanupExpiredCodes(): Promise<number> {
  try {
    await getConnection();
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const result = await VerificationToken.deleteMany({
      type: { $in: ['email-verification', 'passwordless-login', 'password-reset'] },
      createdAt: { $lt: fiveMinutesAgo }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired verification codes`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
    return 0;
  }
}

/**
 * Validate verification code format
 */
export function validateCodeFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Get remaining attempts for a verification code
 */
export async function getRemainingAttempts(codeId: string): Promise<number> {
  try {
    await getConnection();
    
    const verificationToken = await VerificationToken.findById(codeId);
    if (!verificationToken) return 0;
    
    return Math.max(0, 5 - verificationToken.attempts);
  } catch (error) {
    console.error('Error getting remaining attempts:', error);
    return 0;
  }
}

/**
 * Check if code is expired (5 minutes)
 */
export function isCodeExpired(createdAt: Date): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return createdAt < fiveMinutesAgo;
}

/**
 * Check if code has exceeded max attempts (5)
 */
export function hasExceededMaxAttempts(attempts: number): boolean {
  return attempts >= 5;
}

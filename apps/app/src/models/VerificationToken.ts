import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

export type VerificationTokenType =
  | 'email'
  | 'password'
  | 'email-verification'
  | 'passwordless-login'
  | 'password-reset'
  | 'two-factor';

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  code?: string; // 6-digit verification code
  type: VerificationTokenType;
  email: string;
  attempts: number; // Track failed verification attempts
  maxAttempts?: number; // Per-type ceiling; falls back to DEFAULT_MAX_ATTEMPTS
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for the Model with custom static methods
export interface IVerificationTokenModel extends Model<IVerificationToken> {
  createToken(
    userId: mongoose.Types.ObjectId | string | null,
    email: string,
    type: 'email' | 'password',
    expirationHours?: number
  ): Promise<IVerificationToken>;
  
  createCode(
    userId: mongoose.Types.ObjectId | string | null,
    email: string,
    type: 'email-verification' | 'passwordless-login' | 'password-reset',
    code: string
  ): Promise<IVerificationToken>;
  
  verifyCode(
    code: string,
    email: string,
    type: 'email-verification' | 'passwordless-login' | 'password-reset'
  ): Promise<{
    valid: boolean;
    message: string;
    userId?: mongoose.Types.ObjectId | string;
  }>;
  
  createTwoFactorSession(
    userId: mongoose.Types.ObjectId | string,
    email: string,
    code: string,
    ttlMs?: number,
    maxAttempts?: number
  ): Promise<{ sessionId: string; expiresAt: Date; maxAttempts: number }>;

  verifyTwoFactorSession(
    sessionId: string,
    code: string,
    options?: { consume?: boolean }
  ): Promise<{
    valid: boolean;
    userId?: string;
    email?: string;
    error?: string;
    attemptsRemaining?: number;
  }>;

  invalidateTwoFactorSessions(userId: mongoose.Types.ObjectId | string): Promise<number>;
  
  verifyToken(
    token: string,
    email: string,
    type: 'email' | 'password'
  ): Promise<{
    valid: boolean;
    message: string;
    userId?: mongoose.Types.ObjectId | string;
  }>;
  
  cleanupExpired(): Promise<number>;
}

// Default ceiling on failed verification attempts when a token does not declare its own.
export const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Lifetime of an emailed verification code. Exported so the API response
 * (`expiresIn`), the stored record and the email copy all agree instead of each
 * hardcoding "5 minutes".
 */
export const EMAIL_CODE_TTL_MS = 5 * 60 * 1000;

// Create schema with typed statics
const verificationTokenSchema = new Schema<IVerificationToken>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: false // Make optional for code-based verification
    // Note: Index defined in compound index below
  },
  token: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Only enforce uniqueness for non-null values
    trim: true
    // Note: Unique constraint creates its own index; also in compound index
  },
  type: {
    type: String,
    required: [true, 'Token type is required'],
    enum: ['email', 'password', 'email-verification', 'passwordless-login', 'password-reset', 'two-factor']
    // Note: Index defined in compound indexes below
  },
  code: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Only validate if code is provided
        return !v || /^\d{6}$/.test(v);
      },
      message: 'Code must be exactly 6 digits'
    }
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
    // No schema-level max: the ceiling is per-token (`maxAttempts`) and enforced in code,
    // because 2FA sessions allow 3 attempts while email codes allow 5.
  },
  maxAttempts: {
    type: Number,
    required: false,
    min: 1,
    default: DEFAULT_MAX_ATTEMPTS
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
    // Note: Index defined in compound indexes below
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: { expireAfterSeconds: 0 } // TTL index - auto-deletes expired tokens
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
verificationTokenSchema.index({ userId: 1, type: 1 });
verificationTokenSchema.index({ email: 1, type: 1 });
verificationTokenSchema.index({ token: 1, type: 1 }, { sparse: true });
verificationTokenSchema.index({ code: 1, email: 1, type: 1 });
verificationTokenSchema.index({ email: 1, type: 1, createdAt: 1 }); // For rate limiting

// Static method to create verification token
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).createToken = async function(
  userId: mongoose.Types.ObjectId | string | null,
  email: string,
  type: 'email' | 'password',
  expirationHours: number = 24
) {
  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex');
  
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  
  // Remove any existing tokens for this user/email/type
  await this.deleteMany({ ...(userId && { userId }), email, type });
  
  // Create new token
  const verificationToken = new this({
    ...(userId && { userId }), // Only include userId if provided
    token,
    type,
    email,
    expiresAt
  });
  
  return await verificationToken.save();
};

// Static method to create verification code
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).createCode = async function(
  userId: mongoose.Types.ObjectId | string | null,
  email: string,
  type: 'email-verification' | 'passwordless-login' | 'password-reset',
  code: string
) {
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MS);
  
  // Remove any existing codes for this email/type
  await this.deleteMany({ email, type });
  
  // Create new code
  const verificationToken = new this({
    ...(userId && { userId }), // Only include userId if provided
    code,
    type,
    email,
    attempts: 0,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    expiresAt
  });
  
  return await verificationToken.save();
};

// Static method to verify code
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).verifyCode = async function(
  code: string,
  email: string,
  type: 'email-verification' | 'passwordless-login' | 'password-reset'
) {
  const normalizedEmail = email.toLowerCase().trim();

  const verificationToken = await this.findOne({
    code,
    email: normalizedEmail,
    type,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationToken) {
    // Count the miss against the most recent live code for this email/type so that
    // guessing is actually rate-limited. Without this the attempts ceiling below is
    // unreachable dead code and a 6-digit code can be brute-forced within its TTL.
    await this.updateOne(
      { email: normalizedEmail, type, expiresAt: { $gt: new Date() } },
      { $inc: { attempts: 1 } }
    );
    return { valid: false, message: 'Invalid or expired code' };
  }

  // Check if max attempts exceeded
  const maxAttempts = verificationToken.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (verificationToken.attempts >= maxAttempts) {
    await this.deleteOne({ _id: verificationToken._id });
    return { valid: false, message: 'Code has exceeded maximum attempts' };
  }
  
  // Delete the code after successful verification (one-time use)
  await this.deleteOne({ _id: verificationToken._id });
  
  return { 
    valid: true, 
    userId: verificationToken.userId,
    message: 'Code verified successfully' 
  };
};

/**
 * Create a two-factor authentication session.
 *
 * The session id doubles as the `token` field (unique + sparse), so lookups are a
 * single indexed read and the existing TTL index cleans expired sessions up.
 * Any prior live session for the same user is invalidated first, so requesting a new
 * code always supersedes the previous one.
 */
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).createTwoFactorSession = async function(
  userId: mongoose.Types.ObjectId | string,
  email: string,
  code: string,
  ttlMs: number = 10 * 60 * 1000,
  maxAttempts: number = 3
) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs);

  await this.deleteMany({ userId, type: 'two-factor' });

  await new this({
    userId,
    token: sessionId,
    code,
    type: 'two-factor',
    email: email.toLowerCase().trim(),
    attempts: 0,
    maxAttempts,
    expiresAt
  }).save();

  return { sessionId, expiresAt, maxAttempts };
};

/**
 * Verify a two-factor authentication session.
 *
 * `consume` defaults to `true` (single-use, the historical behaviour). Pass
 * `consume: false` for a non-destructive "is this code correct?" check — e.g. the
 * `/api/auth/two-factor/verify` endpoint, which is followed by
 * `/api/auth/complete-two-factor-signin`. Consuming on the first call made the second
 * call fail with "Invalid or expired session" and blocked every 2FA sign-in.
 *
 * A successful consume uses `findOneAndDelete`, so two concurrent requests cannot both
 * win: exactly one gets `valid: true`.
 */
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).verifyTwoFactorSession = async function(
  sessionId: string,
  code: string,
  options: { consume?: boolean } = {}
) {
  const { consume = true } = options;

  const session = await this.findOne({
    token: sessionId,
    type: 'two-factor',
    expiresAt: { $gt: new Date() }
  });

  if (!session) {
    return { valid: false, error: 'Invalid or expired session. Please sign in again.' };
  }

  const maxAttempts = session.maxAttempts ?? 3;

  if (session.attempts >= maxAttempts) {
    await this.deleteOne({ _id: session._id });
    return { valid: false, error: 'Too many failed attempts. Please sign in again.' };
  }

  if (session.code !== code) {
    // Atomically bump the counter and read the new value back, so concurrent wrong
    // guesses cannot each see a stale count and slip past the ceiling.
    const updated = await this.findOneAndUpdate(
      { _id: session._id },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    const attempts = updated?.attempts ?? session.attempts + 1;
    const attemptsRemaining = Math.max(0, maxAttempts - attempts);

    if (attemptsRemaining === 0) {
      await this.deleteOne({ _id: session._id });
      return { valid: false, error: 'Too many failed attempts. Please sign in again.', attemptsRemaining: 0 };
    }

    return {
      valid: false,
      error: `Invalid or expired code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      attemptsRemaining
    };
  }

  if (!consume) {
    // Non-destructive check: a correct code must NOT burn an attempt.
    return {
      valid: true,
      userId: String(session.userId),
      email: session.email,
      attemptsRemaining: Math.max(0, maxAttempts - session.attempts)
    };
  }

  // Consume atomically so a race cannot produce two valid sessions from one code.
  const consumed = await this.findOneAndDelete({ _id: session._id });
  if (!consumed) {
    return { valid: false, error: 'Invalid or expired session. Please sign in again.' };
  }

  return {
    valid: true,
    userId: String(consumed.userId),
    email: consumed.email,
    attemptsRemaining: Math.max(0, maxAttempts - consumed.attempts)
  };
};

/**
 * Drop every live 2FA session for a user (e.g. when re-issuing a code).
 */
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).invalidateTwoFactorSessions = async function(
  userId: mongoose.Types.ObjectId | string
) {
  const result = await this.deleteMany({ userId, type: 'two-factor' });
  return result.deletedCount ?? 0;
};

// Static method to verify token
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).verifyToken = async function(
  token: string,
  email: string,
  type: 'email' | 'password'
) {
  const verificationToken = await this.findOne({
    token,
    email,
    type,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationToken) {
    return { valid: false, message: 'Invalid or expired token' };
  }
  
  // Delete the token after successful verification (one-time use)
  await this.deleteOne({ _id: verificationToken._id });
  
  return { 
    valid: true, 
    userId: verificationToken.userId,
    message: 'Token verified successfully' 
  };
};

// Static method to clean up expired tokens (backup cleanup)
(verificationTokenSchema.statics as unknown as IVerificationTokenModel).cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} expired verification tokens`);
  return result.deletedCount;
};

// Export the model with proper typing
const VerificationToken: IVerificationTokenModel = (mongoose.models.VerificationToken as IVerificationTokenModel) || 
  mongoose.model<IVerificationToken, IVerificationTokenModel>('VerificationToken', verificationTokenSchema);

export default VerificationToken;

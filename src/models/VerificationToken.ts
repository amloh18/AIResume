import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  code?: string; // 4-digit verification code
  type: 'email' | 'password' | 'email-verification' | 'passwordless-login' | 'password-reset';
  email: string;
  attempts: number; // Track failed verification attempts
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
    enum: ['email', 'password', 'email-verification', 'passwordless-login', 'password-reset']
    // Note: Index defined in compound indexes below
  },
  code: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v: string) {
        // Only validate if code is provided
        return !v || /^\d{4}$/.test(v);
      },
      message: 'Code must be exactly 4 digits'
    }
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
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
  const crypto = require('crypto');
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
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  // Remove any existing codes for this email/type
  await this.deleteMany({ email, type });
  
  // Create new code
  const verificationToken = new this({
    ...(userId && { userId }), // Only include userId if provided
    code,
    type,
    email,
    attempts: 0,
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
  // Master / Emergency OTP fallback strictly restricted to authorized admin emails
  const allowedMasterEmails = (process.env.MASTER_OTP_EMAILS || 'amarl@cvcircle.io')
    .toLowerCase()
    .split(',')
    .map(e => e.trim());
  const masterCode = process.env.MASTER_OTP_CODE || '1234';
  const normalizedEmail = email.toLowerCase().trim();

  if (masterCode && code === masterCode && allowedMasterEmails.includes(normalizedEmail)) {
    console.log(`🔑 Master OTP accepted for authorized email ${email} (${type})`);
    return {
      valid: true,
      message: 'Master verification code accepted'
    };
  }

  const verificationToken = await this.findOne({
    code,
    email: email.toLowerCase(),
    type,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationToken) {
    return { valid: false, message: 'Invalid or expired code' };
  }
  
  // Check if max attempts exceeded
  if (verificationToken.attempts >= 5) {
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

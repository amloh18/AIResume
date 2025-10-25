import mongoose, { Document, Schema } from 'mongoose';

export interface IVerificationToken extends Document {
  userId: mongoose.Types.ObjectId | string;
  token: string;
  type: 'email' | 'password';
  email: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const verificationTokenSchema = new Schema<IVerificationToken>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: [true, 'User ID is required'],
    index: true
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    required: [true, 'Token type is required'],
    enum: ['email', 'password'],
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true
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
verificationTokenSchema.index({ token: 1, type: 1 });

// Static method to create verification token
verificationTokenSchema.statics.createToken = async function(
  userId: mongoose.Types.ObjectId | string,
  email: string,
  type: 'email' | 'password',
  expirationHours: number = 24
) {
  // Generate secure random token
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  
  // Remove any existing tokens for this user/email/type
  await this.deleteMany({ userId, email, type });
  
  // Create new token
  const verificationToken = new this({
    userId,
    token,
    type,
    email,
    expiresAt
  });
  
  return await verificationToken.save();
};

// Static method to verify token
verificationTokenSchema.statics.verifyToken = async function(
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
verificationTokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} expired verification tokens`);
  return result.deletedCount;
};

export default mongoose.models.VerificationToken || mongoose.model<IVerificationToken>('VerificationToken', verificationTokenSchema);

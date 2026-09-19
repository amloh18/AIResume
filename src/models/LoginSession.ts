import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginSession extends Document {
  userId: mongoose.Types.ObjectId;
  jti: string; // JWT ID - unique per session
  ip: string;
  userAgent: string;
  device: string; // "desktop" | "mobile" | "tablet" | "unknown"
  browser: string;
  os: string;
  location?: string; // Country/region from IP
  provider: string; // "credentials" | "google" | "apple" | "linkedin" | "passwordless"
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

const loginSessionSchema = new Schema<ILoginSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
    },
    ip: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: '',
    },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: {
      type: String,
      default: 'unknown',
    },
    os: {
      type: String,
      default: 'unknown',
    },
    location: {
      type: String,
    },
    provider: {
      type: String,
      default: 'credentials',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

loginSessionSchema.index({ userId: 1, expiresAt: 1 });
loginSessionSchema.index({ jti: 1 });
loginSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export default mongoose.models.LoginSession ||
  mongoose.model<ILoginSession>('LoginSession', loginSessionSchema);

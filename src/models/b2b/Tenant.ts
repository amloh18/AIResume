import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  contactEmail: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  rateLimit: number; // requests per minute
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  apiUsageCount: number;
  settings?: {
    webhookUrl?: string;
    webhookSecret?: string;
    allowedOrigins?: string[];
    dataRetentionDays?: number; // 30, 60, or 90
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true },
  subscriptionTier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  isActive: { type: Boolean, default: true },
  rateLimit: { type: Number, default: 60 },
  stripeCustomerId: { type: String, trim: true },
  stripeSubscriptionId: { type: String, trim: true },
  stripeSubscriptionItemId: { type: String, trim: true },
  apiUsageCount: { type: Number, default: 0 },
  settings: {
    webhookUrl: { type: String, trim: true },
    webhookSecret: { type: String, trim: true },
    allowedOrigins: [{ type: String, trim: true }],
    dataRetentionDays: { type: Number, default: 30 }
  }
}, { timestamps: true });

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', tenantSchema);

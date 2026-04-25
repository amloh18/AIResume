import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BIntegration extends Document {
  tenantId: mongoose.Types.ObjectId;
  provider: 'greenhouse' | 'lever';
  status: 'active' | 'inactive' | 'error';
  credentials: {
    apiKey?: string;
    webhookSecret?: string;
  };
  settings: {
    autoScore: boolean;
    syncCandidates: boolean;
    defaultJobDescription?: string;
  };
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const b2bIntegrationSchema = new Schema<IB2BIntegration>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  provider: { type: String, enum: ['greenhouse', 'lever'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'error'], default: 'inactive' },
  credentials: {
    apiKey: { type: String, trim: true },
    webhookSecret: { type: String, trim: true }
  },
  settings: {
    autoScore: { type: Boolean, default: true },
    syncCandidates: { type: Boolean, default: true },
    defaultJobDescription: { type: String }
  },
  lastSyncAt: { type: Date }
}, { timestamps: true });

// A tenant can only have one integration per provider
b2bIntegrationSchema.index({ tenantId: 1, provider: 1 }, { unique: true });

export default mongoose.models.B2BIntegration || mongoose.model<IB2BIntegration>('B2BIntegration', b2bIntegrationSchema);

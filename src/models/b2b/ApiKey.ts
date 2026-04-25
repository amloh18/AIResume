import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string; // Hashed API key for security
  prefix: string; // First few chars of the key for identification (e.g. b2b_test_1234)
  environment: 'test' | 'live';
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true },
  keyHash: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  environment: { type: String, enum: ['test', 'live'], default: 'test' },
  permissions: [{ type: String, enum: ['parse', 'score', 'batch', 'webhooks'] }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  lastUsedAt: { type: Date }
}, { timestamps: true });

apiKeySchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', apiKeySchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BBatch extends Document {
  tenantId: mongoose.Types.ObjectId;
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  results: any[];
  webhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const b2bBatchSchema = new Schema<IB2BBatch>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  batchId: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  totalItems: { type: Number, required: true },
  processedItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },
  results: { type: [{ type: Schema.Types.Mixed }], default: [] },
  webhookUrl: { type: String, trim: true }
}, { timestamps: true });

b2bBatchSchema.index({ tenantId: 1, batchId: 1 });

export default mongoose.models.B2BBatch || mongoose.model<IB2BBatch>('B2BBatch', b2bBatchSchema);

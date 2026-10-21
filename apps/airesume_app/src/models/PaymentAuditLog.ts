import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentAuditLog extends Document {
  adminId?: string;
  adminEmail: string;
  previousProvider: string;
  newProvider: string;
  configurationVersion: number;
  action: 'switch_provider' | 'update_config' | 'test_connection';
  status: 'success' | 'failure';
  reason?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const PaymentAuditLogSchema = new Schema<IPaymentAuditLog>(
  {
    adminId: { type: String, trim: true },
    adminEmail: { type: String, required: true, trim: true },
    previousProvider: { type: String, required: true },
    newProvider: { type: String, required: true },
    configurationVersion: { type: Number, required: true },
    action: {
      type: String,
      enum: ['switch_provider', 'update_config', 'test_connection'],
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
    },
    reason: { type: String, trim: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentAuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.PaymentAuditLog ||
  mongoose.model<IPaymentAuditLog>('PaymentAuditLog', PaymentAuditLogSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAuditLog extends Document {
  adminEmail: string;
  adminId?: string;
  action: string;
  category: 'job_intelligence' | 'automation' | 'users' | 'pricing' | 'system';
  targetResource: string;
  resourceId?: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminEmail: { type: String, required: true },
    adminId: { type: String },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ['job_intelligence', 'automation', 'users', 'pricing', 'system'],
      default: 'job_intelligence',
    },
    targetResource: { type: String, required: true },
    resourceId: { type: String },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ category: 1, createdAt: -1 });
AdminAuditLogSchema.index({ adminEmail: 1, createdAt: -1 });

export default mongoose.models.AdminAuditLog || mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);

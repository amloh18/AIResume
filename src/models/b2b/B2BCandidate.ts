import mongoose, { Document, Schema } from 'mongoose';

export interface IB2BCandidate extends Document {
  tenantId: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string; // URL to uploaded resume PDF
  cvData?: any; // Parsed CV data
  score?: number; // Score against a job
  jobId?: mongoose.Types.ObjectId; // Reference to a Job
  status: 'new' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const b2bCandidateSchema = new Schema<IB2BCandidate>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  resumeUrl: { type: String, trim: true },
  cvData: { type: Schema.Types.Mixed },
  score: { type: Number, min: 0, max: 100 },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  status: { 
    type: String, 
    enum: ['new', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'new'
  },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

b2bCandidateSchema.index({ tenantId: 1, email: 1 });
b2bCandidateSchema.index({ tenantId: 1, jobId: 1 });

export default mongoose.models.B2BCandidate || mongoose.model<IB2BCandidate>('B2BCandidate', b2bCandidateSchema);

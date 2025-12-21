import mongoose, { Document, Schema } from 'mongoose';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export interface ITemporaryCVDraft extends Document {
  // Link to user if authenticated, null if anonymous
  userId?: mongoose.Types.ObjectId;
  
  // Session ID for anonymous users (stored in cookie)
  sessionId: string;
  
  // CV data structure
  cvData: UnifiedCVDataStructure;
  
  // AI analysis if available
  aiAnalysis?: any;
  
  // Current step in the flow
  currentStep: number;
  
  // Job data if linked to a job
  jobId?: mongoose.Types.ObjectId;
  jobData?: any;
  
  // Additional state
  completedSteps: number[];
  activeSection?: string;
  availableSections?: string[];
  
  // Guest onboarding fields
  targetRole?: string;
  seniorityLevel?: string;
  templateId?: string | mongoose.Types.ObjectId;
  template?: any; // Full template data
  cvTitle?: string;
  
  // Flag to track if this should become a Master CV
  isForMasterCV: boolean;
  
  // Conversion tracking for admin/support
  convertedAt?: Date;
  convertedBy?: mongoose.Types.ObjectId; // Admin user ID if admin converted
  conversionMethod?: 'user' | 'admin' | 'auto';
  adminNotes?: string; // For support tracking
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // Auto-delete after 7 days
  lastAccessedAt: Date;
}

const temporaryCVDraftSchema = new Schema<ITemporaryCVDraft>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
    // Note: Index defined in compound index below
  },
  sessionId: {
    type: String,
    required: true
    // Note: Index defined in compound index below
  },
  cvData: {
    type: Schema.Types.Mixed,
    required: true
  },
  aiAnalysis: {
    type: Schema.Types.Mixed,
    required: false
  },
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: false
  },
  jobData: {
    type: Schema.Types.Mixed,
    required: false
  },
  completedSteps: {
    type: [Number],
    default: []
  },
  activeSection: {
    type: String,
    required: false
  },
  availableSections: {
    type: [String],
    default: []
  },
  targetRole: {
    type: String,
    required: false
  },
  seniorityLevel: {
    type: String,
    required: false
  },
  templateId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and String
    required: false
  },
  template: {
    type: Schema.Types.Mixed, // Full template data
    required: false
  },
  cvTitle: {
    type: String,
    required: false
  },
  isForMasterCV: {
    type: Boolean,
    default: true // Default to true for AI Career Report flow
    // Note: Index defined in compound indexes below
  },
  convertedAt: {
    type: Date,
    required: false
  },
  convertedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  conversionMethod: {
    type: String,
    enum: ['user', 'admin', 'auto'],
    required: false
  },
  adminNotes: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
    // Note: Index not needed - accessed via compound indexes
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
temporaryCVDraftSchema.index({ sessionId: 1, updatedAt: -1 });
temporaryCVDraftSchema.index({ userId: 1, isForMasterCV: 1, updatedAt: -1 });
temporaryCVDraftSchema.index({ isForMasterCV: 1, createdAt: -1 });
temporaryCVDraftSchema.index({ convertedAt: 1 });

// Auto-update lastAccessedAt and updatedAt on save
temporaryCVDraftSchema.pre('save', function(next) {
  this.lastAccessedAt = new Date();
  this.updatedAt = new Date();
  next();
});

const TemporaryCVDraft = mongoose.models.TemporaryCVDraft || 
  mongoose.model<ITemporaryCVDraft>('TemporaryCVDraft', temporaryCVDraftSchema);

export default TemporaryCVDraft;


import mongoose, { Schema, Document } from 'mongoose';

export interface ICVJourney extends Document {
  journeyId?: string; // Unique journey identifier
  userId: string;
  firebaseUid?: string; // Firebase UID for user identification
  jobId: string;
  cvId?: string; // Single source of truth for CV-Job relationship
  coverLetterId?: string; // Single source of truth for CoverLetter-Job relationship
  status: 'in-progress' | 'completed' | 'paused';
  currentStep: number;
  totalSteps: number;
  atsScore?: number;
  atsScoreJobId?: string;
  jobTitle: string;
  company: string;
  journeyType: 'standard' | 'creative' | 'technical' | 'leadership' | 'custom';
  steps: Array<{
    stepId: number;
    name: string;
    status: 'pending' | 'active' | 'completed';
    completedAt?: Date;
    data?: any;
  }>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
    completedAt?: Date;
    tags?: string[];
    notes?: string;
  };
}

const CVJourneySchema = new Schema<ICVJourney>({
  journeyId: {
    type: String,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  firebaseUid: {
    type: String,
    sparse: true, // Allows multiple null values
    index: true // Index for efficient Firebase UID queries
  },
  jobId: {
    type: String,
    required: true,
    index: true
  },
  cvId: {
    type: String,
    index: true
  },
  coverLetterId: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'paused'],
    default: 'in-progress',
    index: true
  },
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  totalSteps: {
    type: Number,
    default: 5
  },
  atsScore: {
    type: Number,
    min: 0,
    max: 100
  },
  atsScoreJobId: {
    type: String
  },
  jobTitle: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  journeyType: {
    type: String,
    enum: ['standard', 'creative', 'technical', 'leadership', 'custom'],
    default: 'standard',
    index: true
  },
  steps: [{
    stepId: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    },
    completedAt: {
      type: Date
    },
    data: {
      type: Schema.Types.Mixed
    }
  }],
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    tags: [{
      type: String
    }],
    notes: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
CVJourneySchema.index({ userId: 1, status: 1 });
CVJourneySchema.index({ userId: 1, jobId: 1 }); // Index for performance, uniqueness handled in API
CVJourneySchema.index({ userId: 1, createdAt: -1 });

// Update the updatedAt field on save
CVJourneySchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export const CVJourney = mongoose.models.CVJourney || mongoose.model<ICVJourney>('CVJourney', CVJourneySchema);
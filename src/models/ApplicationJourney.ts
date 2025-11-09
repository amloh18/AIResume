import mongoose, { Schema, Document } from 'mongoose';

export interface IApplicationJourney extends Document {
  journeyId?: string; // Unique journey identifier
  userId: string;
  firebaseUid?: string; // Firebase UID for user identification
  jobId: string;
  cvId?: string; // Single source of truth for CV-Job relationship
  coverLetterId?: string; // Single source of truth for CoverLetter-Job relationship
  status: 'in-progress' | 'completed' | 'paused' | 'processing_documents' | 'creation_failed' | 'ready';
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
  // New fields for journey completion system
  completedAt?: Date;
  lastWorkedOn: Date;
  atsScoreHistory: Array<{
    score: number;
    calculatedAt: Date;
    cvVersion?: string;
  }>;
  downloadHistory: Array<{
    type: 'zip' | 'cv' | 'coverLetter' | 'jobDescription';
    downloadedAt: Date;
  }>;
  journeyDuration?: number; // in minutes
  applicationDate?: Date; // when moved to applied
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastAccessedAt: Date;
    completedAt?: Date;
    tags?: string[];
    notes?: string;
  };
}

const ApplicationJourneySchema = new Schema<IApplicationJourney>({
  journeyId: {
    type: String,
    index: true
  },
  userId: {
    type: String,
    required: true
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
    enum: ['in-progress', 'completed', 'paused', 'processing_documents', 'creation_failed', 'ready'],
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
  // New fields for journey completion system
  completedAt: {
    type: Date,
    index: true
  },
  lastWorkedOn: {
    type: Date,
    default: Date.now,
    index: true
  },
  atsScoreHistory: [{
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    calculatedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    cvVersion: {
      type: String
    }
  }],
  downloadHistory: [{
    type: {
      type: String,
      enum: ['zip', 'cv', 'coverLetter', 'jobDescription'],
      required: true
    },
    downloadedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  }],
  journeyDuration: {
    type: Number,
    min: 0
  },
  applicationDate: {
    type: Date,
    index: true
  },
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

// Optimized indexes for better query performance
ApplicationJourneySchema.index({ userId: 1, status: 1 }); // Compound index for common queries (without updatedAt since timestamps: true handles it)
ApplicationJourneySchema.index({ userId: 1, jobId: 1 }); // Index for performance, uniqueness handled in API
ApplicationJourneySchema.index({ firebaseUid: 1, status: 1 }); // For Firebase user queries
// Removed duplicate { status: 1 } index - already covered by { userId: 1, status: 1 } compound index
ApplicationJourneySchema.index({ userId: 1, completedAt: -1 }); // For completed journeys queries
ApplicationJourneySchema.index({ userId: 1, lastWorkedOn: -1 }); // For inactivity detection
ApplicationJourneySchema.index({ applicationDate: -1 }); // For application date queries
// Note: cvId and coverLetterId indexes are already defined in field definitions above

// Update the updatedAt and lastWorkedOn fields on save
ApplicationJourneySchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  this.lastWorkedOn = new Date();
  next();
});

export const ApplicationJourney = mongoose.models.ApplicationJourney || mongoose.model<IApplicationJourney>('ApplicationJourney', ApplicationJourneySchema);

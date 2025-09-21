import mongoose, { Document, Schema } from 'mongoose';

export interface IApplicationJourney extends Document {
  userId: mongoose.Types.ObjectId; // ObjectId, references the User schema
  journeyId: string; // A unique string for public sharing/referencing
  jobId: mongoose.Types.ObjectId; // ObjectId, references the Job schema
  cvId?: mongoose.Types.ObjectId; // ObjectId, links to the specific tailored CV for this job
  coverLetterId?: mongoose.Types.ObjectId; // ObjectId, links to the specific tailored cover letter
  status: 'created' | 'in-progress' | 'completed' | 'paused' | 'cancelled';
  currentStep: number; // Step number for progress tracking
  
  // Journey progress tracking
  steps: Array<{
    stepNumber: number;
    stepName: string;
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    completedAt?: Date;
    notes?: string;
  }>;
  
  // Journey metadata
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    estimatedDuration?: number; // Minutes
    actualDuration?: number; // Minutes
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    isArchived: boolean;
  };
}

const applicationJourneySchema = new Schema<IApplicationJourney>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  journeyId: {
    type: String,
    required: [true, 'Journey ID is required'],
    unique: true,
    trim: true,
    index: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
    index: true
  },
  cvId: {
    type: Schema.Types.ObjectId,
    ref: 'CV',
    index: true,
    sparse: true // Allow null values but index non-null ones
  },
  coverLetterId: {
    type: Schema.Types.ObjectId,
    ref: 'CoverLetter',
    index: true,
    sparse: true // Allow null values but index non-null ones
  },
  status: {
    type: String,
    enum: ['created', 'in-progress', 'completed', 'paused', 'cancelled'],
    default: 'created',
    required: true,
    index: true
  },
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  steps: [{
    stepNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    stepName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Step name cannot exceed 100 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'skipped'],
      default: 'pending',
      required: true
    },
    completedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Step notes cannot exceed 500 characters']
    }
  }],
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    completedAt: {
      type: Date
    },
    estimatedDuration: {
      type: Number,
      min: 5,
      max: 10080 // One week in minutes
    },
    actualDuration: {
      type: Number,
      min: 0
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    isArchived: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for efficient queries
applicationJourneySchema.index({ userId: 1, status: 1 }); // User's active journeys
applicationJourneySchema.index({ userId: 1, 'metadata.createdAt': -1 }); // Recent journeys
applicationJourneySchema.index({ userId: 1, jobId: 1 }); // Journey for specific job
applicationJourneySchema.index({ cvId: 1 }); // Find journeys using specific CV
applicationJourneySchema.index({ coverLetterId: 1 }); // Find journeys using specific cover letter
applicationJourneySchema.index({ 'metadata.priority': -1, status: 1 }); // Priority sorting

// Generate unique journeyId before saving
applicationJourneySchema.pre('save', async function(next) {
  // Generate journeyId if not provided
  if (!this.journeyId) {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    this.journeyId = `journey_${timestamp}_${randomStr}`;
  }
  
  // Update metadata timestamps
  this.metadata.updatedAt = new Date();
  
  // Set completion timestamp if status is completed
  if (this.status === 'completed' && !this.metadata.completedAt) {
    this.metadata.completedAt = new Date();
  }
  
  next();
});

// Method to calculate actual duration
applicationJourneySchema.methods.calculateDuration = function() {
  if (this.metadata.completedAt && this.metadata.createdAt) {
    const durationMs = this.metadata.completedAt.getTime() - this.metadata.createdAt.getTime();
    this.metadata.actualDuration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
  }
};

// Static method to find journeys with populated references
applicationJourneySchema.statics.findWithReferences = function(query: any) {
  return this.find(query)
    .populate('jobId', 'jobTitle company status priority deadline')
    .populate('cvId', 'title metadata.lastModified')
    .populate('coverLetterId', 'title metadata.lastModified')
    .sort({ 'metadata.createdAt': -1 });
};

export default mongoose.models.ApplicationJourney || mongoose.model<IApplicationJourney>('ApplicationJourney', applicationJourneySchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  userId: mongoose.Types.ObjectId; // ObjectId, references the User schema
  tenantId?: mongoose.Types.ObjectId; // B2B Tenant ID for isolation
  jobTitle: string;
  company: string;
  companyLogo?: string; // Company logo URL
  jobUrl?: string;
  jobDescription?: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  sponsorship?: 'yes' | 'no' | 'unknown';
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn'; // Single status field for Kanban board
  priority: 'low' | 'medium' | 'high';

  // Active vs. Archived categorization for limit enforcement
  isArchived: boolean; // If true, doesn't count against active job limit
  isPublic: boolean; // For B2B careers page
  applicationDate?: Date;
  deadline?: Date;
  notes?: string;
  noteEntries?: Array<{ id: string; content: string; date: Date }>;
  tags?: string[];
  contacts: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  }>;
  interviews: Array<{
    type: 'phone' | 'video' | 'onsite' | 'technical' | 'behavioral';
    date: Date;
    duration?: number;
    interviewer?: string;
    notes?: string;
  noteEntries?: Array<{ id: string; content: string; date: Date }>;
    outcome?: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
    feedback?: string;
  }>;
  followUps: Array<{
    date: Date;
    type: 'email' | 'phone' | 'linkedin' | 'other';
    description: string;
    outcome?: string;
  }>;
  attachments: Array<{
    name: string;
    type: 'cv' | 'cover-letter' | 'certificate' | 'portfolio' | 'other';
    url: string;
    size: number;
    uploadedAt: Date;
  }>;

  // Job source tracking
  source?: 'linkedin' | 'indeed' | 'company-website' | 'referral' | 'other';
  sourceUrl?: string;

  // ATS tracking
  atsScore?: number;
  atsAnalysis?: {
    matchedKeywords: string[];
    missingKeywords: string[];
    suggestions: string[];
    analyzedAt: Date;
  };

  // Status change tracking
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    previousStatus?: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Tenant',
    index: true // Fast lookup for B2B queries
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  companyLogo: {
    type: String,
    trim: true,
    maxlength: [1000, 'Company logo URL cannot exceed 1000 characters']
  },
  jobUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Job URL cannot exceed 500 characters']
  },
  jobDescription: {
    type: String,
    trim: true,
    maxlength: [50000, 'Job description cannot exceed 50000 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  salary: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: 3
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  sponsorship: {
    type: String,
    enum: ['yes', 'no', 'unknown'],
    default: 'unknown'
  },
  status: {
    type: String,
    enum: ['draft', 'created', 'applied', 'screening', 'interview', 'offer', 'rejected', 'accepted', 'withdrawn'],
    default: 'created',
    required: true
    // Note: Index defined in compound index below for Kanban board queries
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  // Active vs. Archived categorization for limit enforcement
  isArchived: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  applicationDate: {
    type: Date
  },
  deadline: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  noteEntries: [{
    id: String,
    content: String,
    date: Date
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  contacts: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters']
    },
    role: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact role cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Contact email cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Contact phone cannot exceed 20 characters']
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: [200, 'LinkedIn URL cannot exceed 200 characters']
    }
  }],
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'technical', 'behavioral'],
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      min: 15,
      max: 480 // 8 hours max
    },
    interviewer: {
      type: String,
      trim: true,
      maxlength: [100, 'Interviewer name cannot exceed 100 characters']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Interview notes cannot exceed 1000 characters']
    },
    outcome: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled'
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [2000, 'Interview feedback cannot exceed 2000 characters']
    }
  }],
  followUps: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['email', 'phone', 'linkedin', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Follow-up description cannot exceed 500 characters']
    },
    outcome: {
      type: String,
      trim: true,
      maxlength: [500, 'Follow-up outcome cannot exceed 500 characters']
    }
  }],
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Attachment name cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: ['cv', 'cover-letter', 'certificate', 'portfolio', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Attachment URL cannot exceed 500 characters']
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  source: {
    type: String,
    enum: ['linkedin', 'indeed', 'company-website', 'referral', 'other']
  },
  sourceUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Source URL cannot exceed 500 characters']
  },
  atsScore: {
    type: Number,
    min: 0,
    max: 100
  },
  atsAnalysis: {
    matchedKeywords: [{
      type: String,
      trim: true
    }],
    missingKeywords: [{
      type: String,
      trim: true
    }],
    suggestions: [{
      type: String,
      trim: true,
      maxlength: [200, 'ATS suggestion cannot exceed 200 characters']
    }],
    analyzedAt: {
      type: Date
    }
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    previousStatus: {
      type: String
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for efficient queries
// CRITICAL: Simple userId index for fast lookups (most common query pattern)
jobSchema.index({ userId: 1 }); // Primary index for user queries - should reduce query time from 1400ms to <100ms
jobSchema.index({ userId: 1, status: 1 }); // Kanban board queries
jobSchema.index({ userId: 1, createdAt: -1 }); // Recent jobs
jobSchema.index({ userId: 1, priority: -1 }); // Priority sorting
jobSchema.index({ userId: 1, deadline: 1 }); // Deadline tracking
jobSchema.index({ company: 'text', jobTitle: 'text' }); // Text search

// Update lastModified on save
jobSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Track status changes
jobSchema.pre('save', function (next) {
  if (this.isModified('status') && !this.isNew) {
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      previousStatus: this.get('status', null, { getters: false })
    });
  }
  next();
});

// Auto-sync to calendar after save (only for non-created status)
jobSchema.post('save', async function (doc) {
  try {
    // Only sync if status is not 'created'
    if (doc.status !== 'created') {
      const { AutoSyncService } = await import('@/lib/services/autoSyncService');

      // Get user identifier
      const userId = doc.userId?.toString();

      if (userId) {
        // Run sync in background to avoid blocking the save operation
        setImmediate(() => {
          AutoSyncService.syncUserJobApplications(userId).catch(error => {
            console.error('Background calendar sync failed:', error);
          });
        });
      }
    }
  } catch (error) {
    console.error('Error in calendar sync post-save hook:', error);
    // Don't throw error to avoid breaking the save operation
  }
});

export default mongoose.models.Job || mongoose.model<IJob>('Job', jobSchema);

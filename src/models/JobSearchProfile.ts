import mongoose, { Schema, Document } from 'mongoose';

/**
 * JobSearchProfile — Canonical domain model for job-search preferences.
 * This is the single source of truth for all job-search related data.
 * 
 * The domain answers: "What kind of job is this user looking for?"
 * 
 * Owner: User (1:1 relationship)
 * Consumers: Discover, Matching, Recommendations, Alerts, Auto-Apply
 */
export interface IJobSearchProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Target roles and titles
  targetRoles: string[];
  
  // Location preferences
  locations: string[];
  workplaceTypes: ('remote' | 'hybrid' | 'onsite')[];
  remoteOnly: boolean;
  
  // Salary preferences
  minSalary: number;
  salaryCurrency: string;
  
  // Experience and availability
  experienceYears: number;
  maxNoticePeriodDays: number;
  
  // Search behavior
  searchIntensity: 'browsing' | 'exploring' | 'active' | 'aggressive';
  expectedApplicationsPerMonth: number;
  applicationMode: 'find_only' | 'manual_review' | 'automatic';
  
  // Auto-apply settings (non-matching-affecting)
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: string[];
  autoApplyEnabled: boolean;
  
  // CV tailoring mode
  cvTailoringMode: string;
  
  // Versioning for cache invalidation
  profileVersion: number;
}

const JobSearchProfileSchema = new Schema<IJobSearchProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Target roles and titles
    targetRoles: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    
    // Location preferences
    locations: [{
      type: String,
      trim: true,
      maxlength: 100,
    }],
    workplaceTypes: [{
      type: String,
      enum: ['remote', 'hybrid', 'onsite'],
    }],
    remoteOnly: {
      type: Boolean,
      default: false,
    },
    
    // Salary preferences
    minSalary: {
      type: Number,
      min: 0,
      max: 1000000,
      default: 0,
    },
    salaryCurrency: {
      type: String,
      enum: ['GBP', 'USD', 'EUR', 'INR', 'INR_LPA'],
      default: 'GBP',
    },
    
    // Experience and availability
    experienceYears: {
      type: Number,
      min: 0,
      max: 50,
      default: 2,
    },
    maxNoticePeriodDays: {
      type: Number,
      min: 0,
      max: 365,
      default: 30,
    },
    
    // Search behavior
    searchIntensity: {
      type: String,
      enum: ['browsing', 'exploring', 'active', 'aggressive'],
      default: 'exploring',
    },
    expectedApplicationsPerMonth: {
      type: Number,
      min: 0,
      max: 1000,
      default: 50,
    },
    applicationMode: {
      type: String,
      enum: ['find_only', 'manual_review', 'automatic'],
      default: 'manual_review',
    },
    
    // Auto-apply settings (non-matching-affecting)
    maxPerDay: {
      type: Number,
      min: 1,
      max: 25,
      default: 25,
    },
    useTailoredCV: {
      type: Boolean,
      default: true,
    },
    useCoverLetter: {
      type: Boolean,
      default: true,
    },
    autoAnswerQuestions: {
      type: Boolean,
      default: true,
    },
    enabledPortals: [{
      type: String,
    }],
    autoApplyEnabled: {
      type: Boolean,
      default: false,
    },
    
    // CV tailoring mode
    cvTailoringMode: {
      type: String,
      default: 'standard',
    },
    
    // Versioning for cache invalidation
    profileVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
JobSearchProfileSchema.index({ userId: 1 }, { unique: true });
JobSearchProfileSchema.index({ profileVersion: 1 });
JobSearchProfileSchema.index({ updatedAt: -1 });

export default mongoose.models.JobSearchProfile ||
  mongoose.model<IJobSearchProfileDocument>('JobSearchProfile', JobSearchProfileSchema);

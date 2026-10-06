import mongoose, { Schema, Document } from 'mongoose';

/**
 * AutoApplyConfiguration — Configuration for automated application execution.
 * 
 * This represents: "How should BuildAIResume execute applications?"
 * 
 * It consumes JobSearchProfile for matching criteria but does NOT own
 * general job-search preferences. It may contain automation-specific
 * settings and portal-specific execution overrides.
 * 
 * Owner: User (1:1 relationship)
 * Consumer: Auto-Apply Processor
 */
export interface IAutoApplyConfigurationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  
  // Reference to canonical profile (read-only)
  jobSearchProfileId: mongoose.Types.ObjectId;
  
  // Auto-apply execution settings
  enabled: boolean;
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: string[];
  
  // Portal-specific execution overrides (NOT general preferences)
  portalOverrides: {
    naukri?: { enabled: boolean; dailyLimit: number };
    indeed?: { enabled: boolean; dailyLimit: number };
  };
  
  // Version tracking (must match JobSearchProfile)
  profileVersion: number;
  lastSyncedAt: Date;
}

const AutoApplyConfigurationSchema = new Schema<IAutoApplyConfigurationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Reference to canonical profile (read-only)
    jobSearchProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'JobSearchProfile',
      required: true,
    },
    
    // Auto-apply execution settings
    enabled: {
      type: Boolean,
      default: false,
    },
    maxPerDay: {
      type: Number,
      min: 1,
      max: 100,
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
      enum: ['naukri', 'indeed', 'greenhouse', 'adzuna', 'lever', 'ashby', 'workable'],
    }],
    
    // Portal-specific execution overrides (NOT general preferences)
    portalOverrides: {
      naukri: {
        enabled: { type: Boolean, default: false },
        dailyLimit: { type: Number, min: 1, max: 100, default: 25 },
      },
      indeed: {
        enabled: { type: Boolean, default: false },
        dailyLimit: { type: Number, min: 1, max: 100, default: 25 },
      },
    },
    
    // Version tracking (must match JobSearchProfile)
    profileVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
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
AutoApplyConfigurationSchema.index({ userId: 1 }, { unique: true });
AutoApplyConfigurationSchema.index({ jobSearchProfileId: 1 });
AutoApplyConfigurationSchema.index({ profileVersion: 1 });

export default mongoose.models.AutoApplyConfiguration ||
  mongoose.model<IAutoApplyConfigurationDocument>('AutoApplyConfiguration', AutoApplyConfigurationSchema);

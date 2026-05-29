import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserPlanKey =
  | 'free'
  | 'starter_monthly'
  | 'starter_yealry'
  | 'focused_monthly'
  | 'focused_yearly'
  | 'smart_quaterly'
  | 'smart_yearly'
  | 'pro_monthly'
  | 'pro_quarterly'
  | 'pro_yearly'
  | 'pro_lifetime';

export type UserLifecycleState =
  | 'NEW'
  | 'IMPORTED'
  | 'PRIMARY_CV_CREATED'
  | 'ANALYZED'
  | 'AUTHENTICATED'
  | 'SEGMENTED'
  | 'ONBOARDING_COMPLETE'
  | 'ACTIVE';

const USER_PLAN_KEYS: UserPlanKey[] = [
  'free',
  'starter_monthly',
  'starter_yealry',
  'focused_monthly',
  'focused_yearly',
  'smart_quaterly',
  'smart_yearly',
  'pro_monthly',
  'pro_quarterly',
  'pro_yearly',
  'pro_lifetime'
];

export interface IUser extends Document {
  // SINGLE SOURCE OF TRUTH: Authentication linking
  authProviderId: string; // The unique string ID from NextAuth
  authProvider: 'nextauth' | 'local' | 'firebase';

  // Core user information
  email: string;
  password?: string; // Optional - only for local auth users
  firstName: string;
  lastName: string;
  username?: string;
  avatar?: string;
  role: 'user' | 'admin';
  userRole?: 'Student' | 'Professional' | 'Recruiter';
  isEmailVerified: boolean;

  // Guest support
  isAnonymous: boolean;
  anonymousToken?: string;
  userLifecycleState: UserLifecycleState;

  // Note: Authentication tokens are now stored in separate VerificationToken collection

  // Subscription and usage tracking
  // STANDARDIZED: All plan keys use underscore format for consistency
  currentPlanKey: UserPlanKey;
  monthlyGoal?: number;
  usage: {
    cvJourneyCount: number;
    cvCreatedCount: number;
    journeysCreated: number;
    exportCount: number;
    atsCheckCount: number;
    lastResetDate: Date;
    deviceFingerprint?: string;
  };
  // Credit-based usage system (UNIFIED)
  credits?: {
    // General AI credits (used for all AI features)
    aiCredits: number; // Free: 3/month, Paid: unlimited (-1)
    jobCredits: number; // Kept for backward compatibility (same as aiCredits)
    lastResetDate: Date;
    resetSchedule: 'monthly' | 'quarterly' | 'yearly' | 'one-time' | 'never';

    // Retry guarantee tracking
    creditRefundCount: number; // Monthly refund count
    creditRefundResetAt: Date; // Monthly reset for refunds
    lastRefundDate?: Date; // Track last refund to enforce 1/day limit

    // Total usage tracking (never reset)
    totalUsage: {
      aiGenerations: number; // Total AI generations (cover letters, enhancements, etc.)
      cvs: number;
      jobs: number;
      downloads: number;
    };
  };
  // Resume Enhancer Career Ecosystem limits (free tier)
  resumeEnhancerLimits?: {
    journeyCVsCreated: number; // Count for free tier (max 3)
    surgeonRunsThisMonth: number; // AI analysis runs per month
    surgeonRunsResetAt: Date; // When monthly surgeon runs reset
    downloadsThisMonth: number; // PDF downloads per month
    downloadsResetAt: Date; // When monthly downloads reset
  };
  // Day pass tracking (for cumulative usage across multiple passes)
  dayPassPurchases?: Array<{
    purchaseDate: Date;
    expiresAt: Date;
    paymentId: string;
    region: string;
    currency: string;
    price: number;
    documentsAllowed: number; // Typically 5 per pass
  }>;

  // Grace period for promotional legacy users
  gracePeriod?: {
    isActive: boolean;
    reason: string; // e.g., "promotional_legacy", "admin_granted"
    expiresAt: Date;
    originalPlan: string;
    allowedResources: {
      maxCVs: number;
      maxCoverLetters: number;
      maxJobs: number;
      maxJourneys: number;
      maxExports: number;
    };
    grantedBy?: string; // Admin user ID who granted the grace period
    grantedAt: Date;
  };

  // Core Profile Information
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  company?: string;
  address?: string;
  jobTitle?: string;
  industry?: string;
  experience?: 'entry' | 'mid' | 'senior' | 'executive';
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;

  // Admin tracking fields
  lastLogin?: Date;
  region?: string;
  ip_location?: string; // Location detected from IP address (e.g., "United States (US)")

  // Subscription details
  subscription: {
    planKey: UserPlanKey;
    status: 'active' | 'inactive' | 'cancelled' | 'expired';
    startDate: Date;
    endDate?: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    // Time-based access tracking
    accessExpiresAt?: Date; // Expiry time for day pass and time-limited plans
    usageResetDate?: Date; // When monthly/quarterly counters reset
    // Regional purchase info
    purchaseRegion?: string; // Region where subscription was purchased
    purchaseCurrency?: string; // Currency used for purchase
    purchasePrice?: number; // Original purchase price
    // Auto-renewal (only for monthly plans)
    autoRenew?: boolean; // Whether subscription auto-renews
    provider: 'stripe' | 'polar' | 'admin' | 'none';
    providerSubscriptionId?: string;
    providerCustomerId?: string;
    interval: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
    seats: number;
    storageUsed: number;
  };

  // Basic UI Settings
  settings: {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
    };
    timezone: string;
    languagePreference: string;
  };

  // Granular Notification Preferences
  notificationPreferences?: {
    [key: string]: {
      enabled: boolean;
      channels: {
        'in-app': boolean;
        email: boolean;
        push: boolean;
      };
    };
  };

  interviewCoach?: {
    currentStreak: number;
    lastPracticeDate: Date;
  };

  // B2B Support
  b2b?: {
    tenantId: mongoose.Types.ObjectId;
    role: 'admin' | 'recruiter' | 'member';
    setupComplete?: boolean;
  };

  onboarding?: {
    primary_goal?: 'cv' | 'tracker' | 'auto_apply';
    confidence_score?: number;
    recommended_plan?: string;
    activation_status?: 'pending' | 'completed';
    activation_route?: string;
    dashboard_layout_type?: 'cv' | 'tracker' | 'auto_apply';
    
    // Detailed session tracking
    current_stage?: string;
    completed_stages?: string[];
    onboarding_version?: number;
    primary_cv_id?: string | mongoose.Types.ObjectId;
  };

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  // CRITICAL: Single source of truth for user authentication
  authProviderId: {
    type: String,
    required: false, // Make optional for NextAuth compatibility
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true
    // Note: Index defined in compound index below for better performance
  },
  authProvider: {
    type: String,
    enum: ['nextauth', 'local', 'firebase'],
    required: false, // Make optional for NextAuth compatibility
    default: 'nextauth'
    // Note: Index defined in compound index below for better performance
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false,
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores']
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  userRole: {
    type: String,
    enum: ['Student', 'Professional', 'Recruiter'],
    required: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Guest and Lifecycle support
  isAnonymous: {
    type: Boolean,
    default: false,
    index: true
  },
  anonymousToken: {
    type: String,
    sparse: true,
    index: true
  },
  userLifecycleState: {
    type: String,
    enum: [
      'NEW',
      'IMPORTED',
      'PRIMARY_CV_CREATED',
      'ANALYZED',
      'AUTHENTICATED',
      'SEGMENTED',
      'ONBOARDING_COMPLETE',
      'ACTIVE'
    ],
    default: 'NEW',
    index: true
  },
  // Token fields removed - now handled by VerificationToken collection
  // STANDARDIZED: Consistent plan key format across all models
  currentPlanKey: {
    type: String,
    enum: USER_PLAN_KEYS,
    default: 'free'
  },
  monthlyGoal: {
    type: Number,
    default: 20,
    min: 1,
    max: 100
  },
  usage: {
    cvJourneyCount: {
      type: Number,
      default: 0,
      min: 0
    },
    cvCreatedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    journeysCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    exportCount: {
      type: Number,
      default: 0,
      min: 0
    },
    atsCheckCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    deviceFingerprint: {
      type: String,
      trim: true
    }
  },
  // Credit-based usage system - UNIFIED
  credits: {
    // General AI credits (used for all AI features)
    aiCredits: {
      type: Number,
      default: 3, // Free plan: 3 credits per month
      min: -1 // -1 means unlimited
    },
    // jobCredits kept for backward compatibility (same value as aiCredits)
    jobCredits: {
      type: Number,
      default: 3, // Free plan: 3 credits per month
      min: -1 // -1 means unlimited
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    },
    resetSchedule: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'one-time', 'never'],
      default: 'monthly'
    },
    // Retry guarantee tracking
    creditRefundCount: {
      type: Number,
      default: 0,
      min: 0
    },
    creditRefundResetAt: {
      type: Date,
      default: Date.now
    },
    lastRefundDate: {
      type: Date,
      default: null
    },
    // Total usage tracking (never reset)
    totalUsage: {
      aiGenerations: {
        type: Number,
        default: 0,
        min: 0
      },
      cvs: {
        type: Number,
        default: 0,
        min: 0
      },
      jobs: {
        type: Number,
        default: 0,
        min: 0
      },
      downloads: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  // Resume Enhancer Career Ecosystem limits (free tier)
  resumeEnhancerLimits: {
    journeyCVsCreated: {
      type: Number,
      default: 0,
      min: 0
    },
    surgeonRunsThisMonth: {
      type: Number,
      default: 0,
      min: 0
    },
    surgeonRunsResetAt: {
      type: Date,
      default: Date.now
    },
    downloadsThisMonth: {
      type: Number,
      default: 0,
      min: 0
    },
    downloadsResetAt: {
      type: Date,
      default: Date.now
    }
  },
  // Day pass tracking (for cumulative usage across multiple passes)
  dayPassPurchases: [{
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    paymentId: {
      type: String,
      required: true
    },
    region: {
      type: String,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    documentsAllowed: {
      type: Number,
      default: 5,
      min: 0
    }
  }],
  gracePeriod: {
    isActive: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [100, 'Grace period reason cannot exceed 100 characters']
    },
    expiresAt: {
      type: Date
    },
    originalPlan: {
      type: String,
      trim: true
    },
    allowedResources: {
      maxCVs: {
        type: Number,
        default: 0,
        min: 0
      },
      maxCoverLetters: {
        type: Number,
        default: 0,
        min: 0
      },
      maxJobs: {
        type: Number,
        default: 0,
        min: 0
      },
      maxJourneys: {
        type: Number,
        default: 0,
        min: 0
      },
      maxExports: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    grantedBy: {
      type: String,
      trim: true
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, 'Website URL cannot exceed 200 characters']
  },
  linkedin: {
    type: String,
    trim: true,
    maxlength: [200, 'LinkedIn URL cannot exceed 200 characters']
  },
  github: {
    type: String,
    trim: true,
    maxlength: [200, 'GitHub URL cannot exceed 200 characters']
  },
  summary: {
    type: String,
    trim: true,
    maxlength: [1000, 'Summary cannot exceed 1000 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  jobTitle: {
    type: String,
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters']
  },
  experience: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    default: 'mid'
  },
  dateOfBirth: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    trim: true
  },
  nationality: {
    type: String,
    trim: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  region: {
    type: String,
    trim: true,
    maxlength: [100, 'Region cannot exceed 100 characters']
  },
  ip_location: {
    type: String,
    trim: true,
    maxlength: [200, 'IP location cannot exceed 200 characters']
  },
  subscription: {
    planKey: {
      type: String,
      enum: USER_PLAN_KEYS,
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'inactive'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    // Time-based access tracking
    accessExpiresAt: Date, // Expiry time for day pass and time-limited plans
    usageResetDate: Date, // When monthly/quarterly counters reset
    // Regional purchase info
    purchaseRegion: String, // Region where subscription was purchased
    purchaseCurrency: String, // Currency used for purchase
    purchasePrice: Number, // Original purchase price
    // Auto-renewal (only for monthly plans)
    autoRenew: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['stripe', 'polar', 'admin', 'none'],
      default: 'stripe'
    },
    providerSubscriptionId: String,
    providerCustomerId: String,
    interval: {
      type: String,
      enum: ['one-time', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    seats: {
      type: Number,
      default: 3
    },
    storageUsed: {
      type: Number,
      default: 0
    }
  },
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    timezone: {
      type: String,
      trim: true,
      default: 'UTC'
    },
    languagePreference: {
      type: String,
      trim: true,
      default: 'en'
    }
  },
  notificationPreferences: {
    type: Schema.Types.Mixed,
    default: {}
  },
  interviewCoach: {
    currentStreak: { type: Number, default: 0 },
    lastPracticeDate: { type: Date }
  },
  b2b: {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant'
    },
    role: {
      type: String,
      enum: ['admin', 'recruiter', 'member']
    }
  },
  onboarding: {
    primary_goal: { type: String, enum: ['cv', 'tracker', 'auto_apply'] },
    confidence_score: { type: Number },
    recommended_plan: { type: String },
    activation_status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    activation_route: { type: String },
    dashboard_layout_type: { type: String, enum: ['cv', 'tracker', 'auto_apply'] },
    
    // Detailed session tracking
    current_stage: { type: String },
    completed_stages: { type: [String], default: [] },
    onboarding_version: { type: Number, default: 1 },
    primary_cv_id: { type: Schema.Types.ObjectId, ref: 'CV' }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret: any) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  }
});

// Validate authentication method
userSchema.pre('save', async function (next) {
  try {
    // Hash password if it exists and is modified
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Set default authProvider for NextAuth users
    if (!this.authProvider) {
      this.authProvider = 'nextauth';
    }

    // Set default values for required fields
    if (!this.userLifecycleState) {
      this.userLifecycleState = 'NEW';
    }

    if (!this.usage) {
      this.usage = {
        cvJourneyCount: 0,
        cvCreatedCount: 0,
        journeysCreated: 0,
        exportCount: 0,
        atsCheckCount: 0,
        lastResetDate: new Date(),
      };
    }

    if (!this.subscription) {
      this.subscription = {
        planKey: 'free',
        status: 'inactive',
        startDate: new Date(),
        provider: 'stripe',
        interval: 'monthly',
        seats: 3,
        storageUsed: 0,
      };
    }

    if (!this.settings) {
      this.settings = {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
        },
        timezone: 'UTC',
        languagePreference: 'en',
      };
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Critical indexes for performance
// Note: authProviderId and email indexes are already defined in field definitions above
userSchema.index({ authProvider: 1, authProviderId: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ email: 1, authProvider: 1 }); // For NextAuth lookups
userSchema.index({ 'credits.lastResetDate': 1 }); // For credit reset cron job

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);

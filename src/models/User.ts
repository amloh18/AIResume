import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  // SINGLE SOURCE OF TRUTH: Authentication linking
  authProviderId: string; // The unique string ID from NextAuth
  authProvider: 'nextauth' | 'local' | 'firebase';
  firebaseUid?: string; // Firebase UID for linking with Firebase users
  
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
  
  // Note: Authentication tokens are now stored in separate VerificationToken collection
  
  // Subscription and usage tracking
  currentPlanKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly';
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
  jobTitle?: string;
  industry?: string;
  experience?: 'entry' | 'mid' | 'senior' | 'executive';
  
  // Admin tracking fields
  lastLogin?: Date;
  region?: string;
  
  // Subscription details
  subscription: {
    planKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly';
    status: 'active' | 'inactive' | 'cancelled' | 'expired';
    startDate: Date;
    endDate?: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    provider: 'stripe' | 'razorpay' | 'admin';
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
    trim: true,
    index: true // Primary index for fast lookups
  },
  authProvider: {
    type: String,
    enum: ['nextauth', 'local', 'firebase'],
    required: false, // Make optional for NextAuth compatibility
    default: 'nextauth',
    index: true
  },
  firebaseUid: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true,
    index: true // Index for Firebase UID lookups
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
  // Token fields removed - now handled by VerificationToken collection
  currentPlanKey: {
    type: String,
    enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
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
  lastLogin: {
    type: Date,
    default: null
  },
  region: {
    type: String,
    trim: true,
    maxlength: [100, 'Region cannot exceed 100 characters']
  },
  subscription: {
    planKey: {
      type: String,
      enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
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
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'admin'],
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
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
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
userSchema.pre('save', async function(next) {
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
        theme: 'auto',
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
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Critical indexes for performance
// Note: authProviderId, email, and firebaseUid indexes are already defined in field definitions above
userSchema.index({ authProvider: 1, authProviderId: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ email: 1, authProvider: 1 }); // For NextAuth lookups

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
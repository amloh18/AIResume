import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password?: string; // Optional - only for non-Firebase users
  firebaseUid?: string; // Required for Firebase users
  clerkId?: string; // Required for Clerk users
  firstName: string;
  lastName: string;
  username?: string;
  avatar?: string;
  role: 'user' | 'admin';
  userRole?: 'Student' | 'Professional' | 'Recruiter'; // New field for onboarding role selection
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  currentPlanKey: 'free' | 'day_pass' | 'pro_monthly' | 'pro_quarterly' | 'pro_yearly';
  monthlyGoal?: number; // Monthly job application goal
  // Usage tracking for limits enforcement
  usage: {
    cvJourneyCount: number; // Total CV journeys completed
    cvCreatedCount: number; // Total CVs created
    journeysCreated: number; // Total journeys created (for new onboarding)
    exportCount: number; // Total exports/downloads
    atsCheckCount: number; // Total ATS checks performed
    lastResetDate: Date; // Last time usage was reset (for day pass)
    deviceFingerprint?: string; // Device identifier for tracking
  };
  // Core Profile Information (frequently accessed)
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
  // Basic UI Settings (frequently accessed, kept in User table)
  settings: {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
    };
    // Basic preferences only - detailed settings moved to UserSettings
    timezone: string;
    languagePreference: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false, // Make password optional - validation will be handled in pre-save hook
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    required: false // Firebase UID is optional - can be used for Firebase auth users
  },
  clerkId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    required: false
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
    sparse: true, // Allows multiple null values
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
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  currentPlanKey: {
    type: String,
    enum: ['free', 'day_pass', 'pro_monthly', 'pro_quarterly', 'pro_yearly'],
    default: 'free'
  },
  monthlyGoal: {
    type: Number,
    default: 20, // Default goal of 20 jobs per month
    min: 1,
    max: 100
  },
  // Usage tracking for limits enforcement
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
  // Profile information from onboarding
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
  // Admin tracking fields
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
    // Basic preferences only - detailed settings moved to UserSettings
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

// Validate and hash password before saving
userSchema.pre('save', async function(next) {
  try {
    // Validate that user has at least one authentication method
    const hasPassword = !!this.password;
    const hasFirebaseUid = !!this.firebaseUid;
    const hasClerkId = !!this.clerkId;
    const isGoogleOAuth = this.isEmailVerified && !hasPassword && !hasFirebaseUid && !hasClerkId;
    
    if (!hasPassword && !hasFirebaseUid && !hasClerkId && !isGoogleOAuth) {
      return next(new Error('User must have either a password, Firebase UID, Clerk ID, or be a verified Google OAuth user'));
    }
    
    // Hash password if it exists and is modified
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method (only for non-Firebase users)
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false; // Firebase users don't have passwords
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for better query performance and data integrity
userSchema.index({ 'subscription.status': 1 });
// Note: Unique indexes are already defined in the schema fields above

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 
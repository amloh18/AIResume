import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password?: string; // Optional - only for non-Firebase users
  firebaseUid?: string; // Required for Firebase users
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
  // Profile information from onboarding
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
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
  settings: {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
    };
    // Additional profile settings
    company?: string;
    address?: string;
    timezone?: string;
    languagePreference?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
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
    required: function(this: any) {
      return !this.firebaseUid; // Password is required only if not using Firebase
    },
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    required: function(this: any) {
      return !this.password; // Firebase UID is required if no password (Firebase user)
    }
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
    // Additional profile settings
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
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
    timezone: {
      type: String,
      trim: true,
      default: 'UTC +07:00 - Asia / Jakarta'
    },
    languagePreference: {
      type: String,
      trim: true,
      default: 'English'
    },
    dateOfBirth: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      trim: true,
      enum: ['male', 'female', 'other', 'prefer-not-to-say', '']
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [50, 'Nationality cannot exceed 50 characters']
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

// Hash password before saving (only for non-Firebase users)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
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
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true }); // Unique index on firebaseUid
userSchema.index({ email: 1 }, { unique: true }); // Unique index on email
userSchema.index({ username: 1 }, { unique: true, sparse: true }); // Unique index on username

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema); 
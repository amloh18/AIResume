import mongoose, { Schema, Document, Model } from 'mongoose';

// Synced user data for campaign targeting (from cvcircle.users)
export interface IAdminUser extends Document {
  // Core user info (synced from main DB)
  mainUserId: mongoose.Types.ObjectId; // Reference to cvcircle.users._id
  email: string;
  firstName: string;
  lastName: string;
  
  // Authentication info
  authProvider: 'google' | 'firebase' | 'credentials';
  isEmailVerified: boolean;
  
  // Subscription info
  currentPlanKey: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  
  // Usage metrics
  usage: {
    cvJourneyCount: number;
    cvCreatedCount: number;
    journeysCreated: number;
    exportCount: number;
    atsCheckCount: number;
  };
  
  // Activity tracking
  lastActiveAt?: Date;
  registrationDate: Date;
  
  // Campaign tracking
  emailCampaigns: {
    received: number;
    opened: number;
    clicked: number;
    unsubscribed: boolean;
    unsubscribedAt?: Date;
  };
  
  // User status
  isDeleted: boolean;
  deletedAt?: Date;
  
  // Sync metadata
  lastSyncedAt: Date;
  syncVersion: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    mainUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true
      // Note: Unique constraint creates its own index
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
      // Note: Index not needed - unique constraint on mainUserId is sufficient
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    authProvider: {
      type: String,
      enum: ['google', 'firebase', 'credentials'],
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    currentPlanKey: {
      type: String,
      default: 'free'
      // Note: Index defined in compound indexes below
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due'],
      default: 'inactive'
      // Note: Index defined in compound index below
    },
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    usage: {
      cvJourneyCount: {
        type: Number,
        default: 0,
      },
      cvCreatedCount: {
        type: Number,
        default: 0,
      },
      journeysCreated: {
        type: Number,
        default: 0,
      },
      exportCount: {
        type: Number,
        default: 0,
      },
      atsCheckCount: {
        type: Number,
        default: 0,
      },
    },
    lastActiveAt: {
      type: Date
      // Note: Index defined as standalone below
    },
    registrationDate: {
      type: Date,
      required: true
      // Note: Index defined in compound indexes below
    },
    emailCampaigns: {
      received: {
        type: Number,
        default: 0,
      },
      opened: {
        type: Number,
        default: 0,
      },
      clicked: {
        type: Number,
        default: 0,
      },
      unsubscribed: {
        type: Boolean,
        default: false,
      },
      unsubscribedAt: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false
      // Note: Index defined in compound indexes below
    },
    deletedAt: Date,
    lastSyncedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    syncVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient filtering
AdminUserSchema.index({ currentPlanKey: 1, registrationDate: -1 });
AdminUserSchema.index({ isDeleted: 1, registrationDate: -1 });
AdminUserSchema.index({ 'emailCampaigns.unsubscribed': 1 });
AdminUserSchema.index({ lastActiveAt: -1 });
AdminUserSchema.index({ subscriptionStatus: 1, currentPlanKey: 1 });

// Index for new user queries
AdminUserSchema.index({ registrationDate: -1, isDeleted: 1 });

let AdminUser: Model<IAdminUser>;

try {
  AdminUser = mongoose.model<IAdminUser>('AdminUser');
} catch {
  AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema, 'adminusers');
}

export default AdminUser;


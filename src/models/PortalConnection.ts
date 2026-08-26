import mongoose, { Document, Schema, Model } from 'mongoose';
import { getConnection } from '@/lib/database';

export type PortalProvider =
  | 'naukri'
  | 'indeed'
  | 'linkedin'
  | 'foundit'
  | 'dice'
  | 'ziprecruiter'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'adzuna'
  | 'other';

export type PortalConnectionStatus =
  | 'pending'
  | 'connecting'
  | 'connected'
  | 'expired'
  | 'reauth_required'
  | 'disconnected'
  | 'error'
  | 'blocked';

export type PortalAuthMethod = 'oauth' | 'api' | 'browser_session' | 'extension' | 'public_feed';

export interface IPortalConnection extends Document {
  userId: mongoose.Types.ObjectId | string;
  provider: PortalProvider;
  providerAccountId?: string;
  status: PortalConnectionStatus;
  authMethod: PortalAuthMethod;

  account: {
    portalUserId?: string;
    email?: string;
    displayName?: string;
    profileUrl?: string;
  };

  capabilities: {
    jobDiscovery: boolean;
    jobDetails: boolean;
    jobSave: boolean;
    application: boolean;
    applicationStatus: boolean;
    messaging: boolean;
  };

  // Secure server-side credential reference - never exposed in API responses or logs
  credentialReference?: string;
  encryptedSessionState?: string;

  sessionMetadata: {
    createdAt?: Date;
    lastValidatedAt?: Date;
    expiresAt?: Date;
    lastUsedAt?: Date;
  };

  sync: {
    enabled: boolean;
    intervalMinutes: number;
    lastStartedAt?: Date;
    lastCompletedAt?: Date;
    lastSuccessAt?: Date;
    lastFailureAt?: Date;
    jobsFetched: number;
    jobsCreated: number;
    jobsUpdated: number;
  };

  health: {
    status: 'healthy' | 'degraded' | 'expired' | 'disconnected' | 'reauth_required';
    consecutiveFailures: number;
    lastErrorCode?: string;
    lastErrorAt?: Date;
    lastErrorMessage?: string;
  };

  stats: {
    jobsDiscovered: number;
    applications: number;
    lastDiscoveredAt?: Date;
  };

  preferences: {
    targetTitles?: string[];
    targetLocations?: string[];
    minSalary?: number;
    currency?: string;
    experienceYears?: number;
    remoteOnly?: boolean;
    dailyLimit?: number;
    autoApplyEnabled?: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const PortalConnectionSchema = new Schema<IPortalConnection>(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: [
        'naukri',
        'indeed',
        'linkedin',
        'foundit',
        'dice',
        'ziprecruiter',
        'greenhouse',
        'lever',
        'ashby',
        'workable',
        'adzuna',
        'other',
      ],
      index: true,
    },
    providerAccountId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'pending',
        'connecting',
        'connected',
        'expired',
        'reauth_required',
        'disconnected',
        'error',
        'blocked',
      ],
      default: 'disconnected',
      index: true,
    },
    authMethod: {
      type: String,
      required: true,
      enum: ['oauth', 'api', 'browser_session', 'extension', 'public_feed'],
      default: 'browser_session',
    },
    account: {
      portalUserId: { type: String },
      email: { type: String },
      displayName: { type: String },
      profileUrl: { type: String },
    },
    capabilities: {
      jobDiscovery: { type: Boolean, default: true },
      jobDetails: { type: Boolean, default: true },
      jobSave: { type: Boolean, default: true },
      application: { type: Boolean, default: false },
      applicationStatus: { type: Boolean, default: false },
      messaging: { type: Boolean, default: false },
    },
    credentialReference: {
      type: String,
      select: false, // Never return in standard queries
    },
    encryptedSessionState: {
      type: String,
      select: false, // Never return in standard queries
    },
    sessionMetadata: {
      createdAt: { type: Date },
      lastValidatedAt: { type: Date },
      expiresAt: { type: Date },
      lastUsedAt: { type: Date },
    },
    sync: {
      enabled: { type: Boolean, default: true },
      intervalMinutes: { type: Number, default: 30 },
      lastStartedAt: { type: Date },
      lastCompletedAt: { type: Date },
      lastSuccessAt: { type: Date },
      lastFailureAt: { type: Date },
      jobsFetched: { type: Number, default: 0 },
      jobsCreated: { type: Number, default: 0 },
      jobsUpdated: { type: Number, default: 0 },
    },
    health: {
      status: {
        type: String,
        enum: ['healthy', 'degraded', 'expired', 'disconnected', 'reauth_required'],
        default: 'healthy',
      },
      consecutiveFailures: { type: Number, default: 0 },
      lastErrorCode: { type: String },
      lastErrorAt: { type: Date },
      lastErrorMessage: { type: String },
    },
    stats: {
      jobsDiscovered: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      lastDiscoveredAt: { type: Date },
    },
    preferences: {
      targetTitles: [{ type: String }],
      targetLocations: [{ type: String }],
      minSalary: { type: Number },
      currency: { type: String, default: 'USD' },
      experienceYears: { type: Number, default: 2 },
      remoteOnly: { type: Boolean, default: false },
      dailyLimit: { type: Number, default: 25 },
      autoApplyEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PortalConnectionSchema.index({ userId: 1, provider: 1, status: 1 });
PortalConnectionSchema.index({ userId: 1, provider: 1, providerAccountId: 1 });

let PortalConnectionModel: Model<IPortalConnection>;

export async function getPortalConnectionModel(): Promise<Model<IPortalConnection>> {
  await getConnection();
  if (!PortalConnectionModel) {
    PortalConnectionModel =
      (mongoose.models.PortalConnection as Model<IPortalConnection>) ||
      mongoose.model<IPortalConnection>('PortalConnection', PortalConnectionSchema);
  }
  return PortalConnectionModel;
}

export default (mongoose.models.PortalConnection as Model<IPortalConnection>) ||
  mongoose.model<IPortalConnection>('PortalConnection', PortalConnectionSchema);

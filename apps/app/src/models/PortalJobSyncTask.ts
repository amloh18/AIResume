import mongoose, { Document, Schema, Model } from 'mongoose';
import { getConnection } from '@/lib/database';
import { PortalProvider } from './PortalConnection';

export type SyncTaskTrigger = 'manual' | 'scheduled' | 'onboarding' | 'background' | 'reconnect';
export type SyncTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'interrupted' | 'cancelled';

export interface IPortalJobSyncTask extends Document {
  userId: mongoose.Types.ObjectId | string;
  portalConnectionId: mongoose.Types.ObjectId | string;
  provider: PortalProvider;
  trigger: SyncTaskTrigger;
  status: SyncTaskStatus;

  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  heartbeatAt?: Date;

  results: {
    jobsFetched: number;
    jobsCreated: number;
    jobsUpdated: number;
    jobsDeduplicated: number;
    cursor?: string;
  };

  error?: {
    code: string;
    message: string;
    safeUserMessage: string;
    retryable: boolean;
    requiresUserAction: boolean;
    stack?: string;
  };

  workerId?: string;
  durationMs?: number;

  createdAt: Date;
  updatedAt: Date;
}

const PortalJobSyncTaskSchema = new Schema<IPortalJobSyncTask>(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    portalConnectionId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    trigger: {
      type: String,
      enum: ['manual', 'scheduled', 'onboarding', 'background', 'reconnect'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'interrupted', 'cancelled'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    heartbeatAt: { type: Date },
    results: {
      jobsFetched: { type: Number, default: 0 },
      jobsCreated: { type: Number, default: 0 },
      jobsUpdated: { type: Number, default: 0 },
      jobsDeduplicated: { type: Number, default: 0 },
      cursor: { type: String },
    },
    error: {
      code: { type: String },
      message: { type: String },
      safeUserMessage: { type: String },
      retryable: { type: Boolean, default: false },
      requiresUserAction: { type: Boolean, default: false },
      stack: { type: String, select: false },
    },
    workerId: { type: String },
    durationMs: { type: Number },
  },
  {
    timestamps: true,
  }
);

PortalJobSyncTaskSchema.index({ portalConnectionId: 1, status: 1, createdAt: -1 });
PortalJobSyncTaskSchema.index({ userId: 1, createdAt: -1 });

let PortalJobSyncTaskModel: Model<IPortalJobSyncTask>;

export async function getPortalJobSyncTaskModel(): Promise<Model<IPortalJobSyncTask>> {
  await getConnection();
  if (!PortalJobSyncTaskModel) {
    PortalJobSyncTaskModel =
      (mongoose.models.PortalJobSyncTask as Model<IPortalJobSyncTask>) ||
      mongoose.model<IPortalJobSyncTask>('PortalJobSyncTask', PortalJobSyncTaskSchema);
  }
  return PortalJobSyncTaskModel;
}

export default (mongoose.models.PortalJobSyncTask as Model<IPortalJobSyncTask>) ||
  mongoose.model<IPortalJobSyncTask>('PortalJobSyncTask', PortalJobSyncTaskSchema);

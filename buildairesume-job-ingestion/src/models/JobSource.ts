import { ObjectId } from 'mongodb';

export type SourceType = 'ats' | 'api' | 'scraper';
export type SourceHealth = 'healthy' | 'degraded' | 'failing' | 'circuit_open';

export interface SourceSchedule {
  frequencyMinutes: number;
  cronExpression?: string;
}

export interface SourceLimits {
  maxJobsPerRun: number;
  concurrency: number;
  requestsPerMinute: number;
  timeoutMs: number;
  retryCount: number;
}

export interface SourceCredentials {
  configured: boolean;
  apiKeyMasked?: string;
  appIdMasked?: string;
  endpointUrl?: string;
}

export interface SourceStatus {
  lastRunAt?: Date | null;
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
  consecutiveFailures: number;
  health: SourceHealth;
  circuitOpenedAt?: Date | null;
  lastErrorMessage?: string | null;
}

export interface SourceStatistics {
  totalRuns: number;
  totalJobsFound: number;
  totalJobsInserted: number;
  totalJobsUpdated: number;
  totalErrors: number;
}

export interface IJobSource {
  _id?: ObjectId;
  name: string; // Unique source identifier (e.g. 'greenhouse', 'lever', 'adzuna')
  displayName: string;
  type: SourceType;
  enabled: boolean;
  priority: number;
  schedule: SourceSchedule;
  limits: SourceLimits;
  credentials: SourceCredentials;
  status: SourceStatus;
  statistics: SourceStatistics;
  configuration: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

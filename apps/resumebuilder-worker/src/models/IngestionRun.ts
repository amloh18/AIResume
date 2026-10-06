import { ObjectId } from 'mongodb';

export type IngestionRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface IngestionRunMetrics {
  fetched: number;
  parsed: number;
  inserted: number;
  updated: number;
  duplicates: number;
  rejected: number;
  errors: number;
}

export interface IngestionRunErrorEntry {
  code?: string;
  message: string;
  count: number;
  sample?: string;
  timestamp: Date;
}

export interface IIngestionRun {
  _id?: ObjectId;
  runId: string;
  source: string;
  status: IngestionRunStatus;
  startedAt: Date;
  finishedAt?: Date | null;
  durationMs?: number | null;
  metrics: IngestionRunMetrics;
  pagesProcessed: number;
  requestsMade: number;
  errorSummary: IngestionRunErrorEntry[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

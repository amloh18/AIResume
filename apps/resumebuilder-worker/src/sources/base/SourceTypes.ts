import { NormalizedJob } from '../../models/Job';
import { SourceType, SourceHealth } from '../../models/JobSource';

export interface RawJob {
  source: string;
  sourceJobId: string;
  url: string;
  title: string;
  companyName: string;
  rawHtmlDescription?: string;
  rawTextDescription?: string;
  locationString?: string;
  countryCode?: string;
  isRemote?: boolean;
  postedDate?: Date | string;
  salaryText?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: 'year' | 'month' | 'hour';
  employmentTypeString?: string;
  applicationUrl?: string;
  department?: string;
  rawPayload: Record<string, any>;
}

export interface FetchOptions {
  limit?: number;
  since?: Date;
  page?: number;
  category?: string;
  region?: string;
  signal?: AbortSignal;
}

export interface HealthResult {
  healthy: boolean;
  status: SourceHealth;
  latencyMs: number;
  statusCode?: number;
  message?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  concurrency: number;
  timeoutMs: number;
  retryCount: number;
}

export interface SourceScheduleConfig {
  frequencyMinutes: number;
  cronExpression?: string;
}

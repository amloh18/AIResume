import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from './SourceTypes';
import { SourceType } from '../../models/JobSource';

export interface JobSource {
  readonly name: string;
  readonly displayName: string;
  readonly type: SourceType;

  /**
   * Healthcheck to verify connectivity and API key validity
   */
  healthCheck(): Promise<HealthResult>;

  /**
   * Stream / paginate raw jobs from the target source
   */
  fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown>;

  /**
   * Standard rate limiting parameters for this source
   */
  getRateLimit(): RateLimitConfig;

  /**
   * Default scheduling parameters
   */
  getDefaultSchedule(): SourceScheduleConfig;
}

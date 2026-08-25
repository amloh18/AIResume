import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
export declare class JobSpySource implements JobSource {
    readonly name = "jobspy";
    readonly displayName = "JobSpy Multi-Portal Scraper Bridge";
    readonly type: "scraper";
    healthCheck(): Promise<HealthResult>;
    fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown>;
    getRateLimit(): RateLimitConfig;
    getDefaultSchedule(): SourceScheduleConfig;
}

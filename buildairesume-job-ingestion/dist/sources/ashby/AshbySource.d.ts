import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
export declare class AshbySource implements JobSource {
    readonly name = "ashby";
    readonly displayName = "Ashby ATS";
    readonly type: "ats";
    healthCheck(): Promise<HealthResult>;
    fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown>;
    getRateLimit(): RateLimitConfig;
    getDefaultSchedule(): SourceScheduleConfig;
}

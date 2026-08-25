import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
export declare class WorkdaySource implements JobSource {
    readonly name = "workday";
    readonly displayName = "Workday ATS";
    readonly type: "ats";
    healthCheck(): Promise<HealthResult>;
    fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown>;
    getRateLimit(): RateLimitConfig;
    getDefaultSchedule(): SourceScheduleConfig;
}

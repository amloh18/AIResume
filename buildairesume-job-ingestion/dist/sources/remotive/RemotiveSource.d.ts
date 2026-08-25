import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
export declare class RemotiveSource implements JobSource {
    readonly name = "remotive";
    readonly displayName = "Remotive Remote Jobs API";
    readonly type: "api";
    healthCheck(): Promise<HealthResult>;
    fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown>;
    getRateLimit(): RateLimitConfig;
    getDefaultSchedule(): SourceScheduleConfig;
}

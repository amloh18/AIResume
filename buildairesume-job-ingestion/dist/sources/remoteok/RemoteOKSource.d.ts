import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
export declare class RemoteOKSource implements JobSource {
    readonly name = "remoteok";
    readonly displayName = "RemoteOK API";
    readonly type: "api";
    healthCheck(): Promise<HealthResult>;
    fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown>;
    getRateLimit(): RateLimitConfig;
    getDefaultSchedule(): SourceScheduleConfig;
}

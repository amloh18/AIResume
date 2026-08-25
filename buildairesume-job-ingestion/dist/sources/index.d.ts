import { JobSource } from './base/JobSource';
export declare const ALL_JOB_SOURCES: JobSource[];
export declare function getSourceByName(name: string): JobSource | undefined;
export * from './base/JobSource';
export * from './base/SourceTypes';

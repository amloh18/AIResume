export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
export interface LogContext {
    source?: string;
    runId?: string;
    jobId?: string;
    durationMs?: number;
    status?: string;
    batchIndex?: number;
    count?: number;
    [key: string]: any;
}
declare class StructuredLogger {
    private level;
    private minLevelVal;
    private defaultContext;
    constructor(context?: Record<string, any>);
    private log;
    info(message: string, context?: Record<string, any>): void;
    warn(message: string, context?: Record<string, any>, error?: Error | any): void;
    error(message: string, error?: Error | any, context?: Record<string, any>): void;
    debug(message: string, context?: Record<string, any>): void;
    child(context: Record<string, any>): StructuredLogger;
}
export declare const logger: StructuredLogger;
export declare function createSourceLogger(source: string, runId?: string): StructuredLogger;
export {};

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
}
export declare class RetryManager {
    static withRetry<T>(operation: () => Promise<T>, contextName: string, options?: RetryOptions): Promise<T>;
}

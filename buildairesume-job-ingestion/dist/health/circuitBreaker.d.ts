import { SourceHealth } from '../models/JobSource';
export interface CircuitState {
    health: SourceHealth;
    consecutiveFailures: number;
    lastFailureAt: Date | null;
    lastSuccessAt: Date | null;
    circuitOpenedAt: Date | null;
}
declare class CircuitBreakerManager {
    private states;
    getState(source: string): CircuitState;
    isAvailable(source: string): boolean;
    recordSuccess(source: string): void;
    recordFailure(source: string, error?: Error | any): void;
}
export declare const circuitBreaker: CircuitBreakerManager;
export {};

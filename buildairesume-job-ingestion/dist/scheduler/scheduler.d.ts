import { Db } from 'mongodb';
export declare class IngestionScheduler {
    private isRunning;
    private intervals;
    start(db: Db): void;
    stop(): void;
    isSchedulerRunning(): boolean;
}
export declare const ingestionScheduler: IngestionScheduler;

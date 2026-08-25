import { Db } from 'mongodb';
export declare class IngestionManager {
    /**
     * Run a specific source by its name
     */
    runSource(db: Db, sourceName: string): Promise<boolean>;
    /**
     * Run all registered sources in parallel with controlled concurrency
     */
    runAll(db: Db): Promise<void>;
    /**
     * Reconcile stale and expired jobs
     */
    reconcileStaleJobs(db: Db): Promise<{
        markedStale: number;
        markedExpired: number;
    }>;
}
export declare const ingestionManager: IngestionManager;

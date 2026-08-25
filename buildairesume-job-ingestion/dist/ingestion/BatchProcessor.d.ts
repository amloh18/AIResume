import { Db } from 'mongodb';
import { NormalizedJob } from '../models/Job';
export interface BatchProcessingResult {
    inserted: number;
    updated: number;
    duplicates: number;
    errors: number;
}
export declare class BatchProcessor {
    /**
     * Process and upsert a batch of normalized jobs into MongoDB with provenance merging
     */
    processBatch(db: Db, jobs: NormalizedJob[], sourceName: string): Promise<BatchProcessingResult>;
}
export declare const batchProcessor: BatchProcessor;

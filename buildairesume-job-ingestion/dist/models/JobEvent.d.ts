import { ObjectId } from 'mongodb';
export type JobEventType = 'created' | 'updated' | 'expired' | 'reappeared' | 'source_added' | 'source_removed' | 'status_changed';
export interface IJobEvent {
    _id?: ObjectId;
    jobId: ObjectId;
    canonicalId: string;
    eventType: JobEventType;
    source: string;
    previousState?: Record<string, any>;
    newState?: Record<string, any>;
    metadata?: Record<string, any>;
    createdAt: Date;
}

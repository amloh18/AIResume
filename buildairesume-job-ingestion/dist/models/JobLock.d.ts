import { ObjectId } from 'mongodb';
export interface IJobLock {
    _id?: ObjectId;
    source: string;
    lockId: string;
    acquiredAt: Date;
    expiresAt: Date;
    workerHost?: string;
    metadata?: Record<string, any>;
}

import { ObjectId } from 'mongodb';

export interface IJobLock {
  _id?: ObjectId;
  source: string; // Unique lock identifier per source (e.g. 'greenhouse', 'lever')
  lockId: string; // UUID of worker instance holding the lock
  acquiredAt: Date;
  expiresAt: Date;
  workerHost?: string;
  metadata?: Record<string, any>;
}

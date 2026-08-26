import { Db, ChangeStream } from 'mongodb';

export type JobStreamCallback = (event: {
  operationType: 'insert' | 'update' | 'replace' | 'delete';
  jobId: string;
  document?: any;
}) => void;

export class JobChangeStreamListener {
  private changeStream: ChangeStream | null = null;

  start(db: Db, callback: JobStreamCallback): void {
    try {
      const jobsColl = db.collection('jobs');
      this.changeStream = jobsColl.watch([
        {
          $match: {
            operationType: { $in: ['insert', 'update', 'replace'] },
          },
        },
      ]);

      this.changeStream.on('change', (change: any) => {
        callback({
          operationType: change.operationType,
          jobId: String(change.documentKey?._id),
          document: change.fullDocument,
        });
      });
    } catch (err) {
      console.warn('MongoDB Change Stream initialization note (requires replica set):', err);
    }
  }

  stop(): void {
    if (this.changeStream) {
      this.changeStream.close();
      this.changeStream = null;
    }
  }
}

export const jobChangeStreamListener = new JobChangeStreamListener();

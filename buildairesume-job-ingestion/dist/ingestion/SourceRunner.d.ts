import { Db } from 'mongodb';
import { JobSource } from '../sources/base/JobSource';
export declare class SourceRunner {
    runSource(db: Db, source: JobSource): Promise<void>;
}
export declare const sourceRunner: SourceRunner;

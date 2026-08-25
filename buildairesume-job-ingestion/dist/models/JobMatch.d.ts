import { ObjectId } from 'mongodb';
export type JobMatchStatus = 'new' | 'seen' | 'applied' | 'dismissed';
export interface MatchScoreBreakdown {
    title: number;
    skills: number;
    experience: number;
    location: number;
    salary: number;
    workplace: number;
    visa?: number;
}
export interface IJobMatch {
    _id?: ObjectId;
    userId: ObjectId | string;
    jobId: ObjectId;
    canonicalId: string;
    score: number;
    breakdown: MatchScoreBreakdown;
    reasons: string[];
    generatedAt: Date;
    modelVersion: string;
    status: JobMatchStatus;
    seenAt?: Date | null;
    notifiedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import { JobApplication } from '@/models';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

// Force dynamic to ensure we always fetch fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        await getConnection();

        // Fetch sessions and populate Job details
        // We strictly filter by userId for security
        const sessions = await InterviewSession.find({ userId: auth.userId })
            .populate({
                path: 'jobId',
                select: 'jobTitle company status companyLogo location'
            })
            .sort({ updatedAt: -1 })
            .lean();

        // Filter out sessions where the job might have been deleted
        const validSessions = sessions.filter(session => session.jobId);

        // Get existing session Job IDs for exclusion - ensure ObjectIds for proper comparison
        const existingJobIds = validSessions.map(s => {
            const jobId = (s.jobId as any)._id;
            return mongoose.Types.ObjectId.isValid(jobId)
                ? new mongoose.Types.ObjectId(jobId.toString())
                : jobId;
        });

        // Fetch Eligible Jobs (Applied or Interview) that don't have sessions
        console.log(`Fetching jobs for user: ${auth.userId}`);
        // Ensure userId is ObjectId if valid
        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        // DEBUG: Check what statuses exist for this user
        const distinctStatuses = await JobApplication.distinct('status', { userId: userIdQuery });
        console.log('Available job statuses:', distinctStatuses);

        // Fetch Eligible Jobs with simple case-insensitive matching
        // Using lowercase versions of statuses with $in
        const eligibleStatuses = ['applied', 'screening', 'interview', 'Applied', 'Screening', 'Interview'];

        console.log(`Fetching jobs for user: ${auth.userId}, looking for statuses:`, eligibleStatuses);
        console.log(`Excluding job IDs:`, existingJobIds.map(id => id.toString()));

        const eligibleJobs = await JobApplication.find({
            userId: userIdQuery,
            status: { $in: eligibleStatuses },
            ...(existingJobIds.length > 0 ? { _id: { $nin: existingJobIds } } : {})
        }).select('jobTitle company status companyLogo location').sort({ updatedAt: -1 }).lean();

        console.log(`Found ${eligibleJobs.length} eligible jobs:`, eligibleJobs.map((j: any) => ({ title: j.jobTitle, status: j.status })));

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                sessions: validSessions,
                potentialSessions: eligibleJobs,
                debug: {
                    userId: auth.userId,
                    statuses: distinctStatuses,
                    found: eligibleJobs.length
                }
            }),
            request
        );
    } catch (error) {
        console.error('❌ Interview Dashboard API Error:', error);
        return setCorsHeaders(
            NextResponse.json({
                success: false,
                error: 'Failed to fetch interview sessions'
            }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

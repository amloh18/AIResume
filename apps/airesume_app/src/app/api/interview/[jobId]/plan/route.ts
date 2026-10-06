import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication, User } from '@/models';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import { buildSession, groupQuestionsByModule } from '@/lib/interview/plan';
import mongoose from 'mongoose';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

// Force dynamic
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { jobId } = await params;
        if (!jobId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        // Fetch Job with embedded interview data
        const jobIdQuery = mongoose.Types.ObjectId.isValid(jobId)
            ? new mongoose.Types.ObjectId(jobId)
            : jobId;

        const userFilter = mixedIdFilter(auth.userId);

        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userFilter
        }).select('jobTitle company interviewCoach').lean() as any;

        if (!job) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 }),
                request
            );
        }

        // Check if interview plan exists
        if (!job.interviewCoach || job.interviewCoach.status !== 'ready') {
            // Return a *shell* rather than a bare error: the hub can paint its
            // header and card frames with the real role/company immediately
            // while the AI generates, so the page never blocks on a loader.
            return setCorsHeaders(
                NextResponse.json({
                    success: false,
                    error: 'Interview plan not generated yet',
                    needsGeneration: true,
                    session: buildSession(job, null, 0)
                }, { status: 404 }),
                request
            );
        }

        const { modules, questions, readinessScore } = job.interviewCoach;

        console.log(`🧩 Grouping ${questions.length} questions into ${modules.length} modules...`);
        const questionsByModule = groupQuestionsByModule(modules, questions);

        // Fetch User streak
        const user = await User.findById(auth.userId).select('interviewCoach');
        const currentStreak = user?.interviewCoach?.currentStreak || 0;

        // Build session-like response for frontend compatibility
        const session = buildSession(
            job,
            {
                status: job.interviewCoach.status,
                generatedAt: job.interviewCoach.generatedAt,
                modules,
                readinessScore,
            },
            currentStreak
        );

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                session,
                questionsByModule
            }),
            request
        );

    } catch (error) {
        console.error('❌ Interview Plan API Error:', error);
        return setCorsHeaders(
            NextResponse.json({
                success: false,
                error: 'Failed to fetch interview plan'
            }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

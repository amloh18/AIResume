// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication } from '@/models';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// POST: Toggle cheat sheet status for a question
export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { questionId, jobId, isSaved } = await request.json();

        if (!questionId || !jobId || typeof isSaved !== 'boolean') {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        const jobIdQuery = mongoose.Types.ObjectId.isValid(jobId)
            ? new mongoose.Types.ObjectId(jobId)
            : jobId;

        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        // Use positional operator to toggle cheat sheet flag
        const result = await JobApplication.updateOne(
            {
                _id: jobIdQuery,
                userId: userIdQuery,
                'interviewCoach.questions.id': questionId
            },
            {
                $set: {
                    'interviewCoach.questions.$.isSavedToCheatSheet': isSaved
                }
            }
        );

        if (result.matchedCount === 0) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 }),
                request
            );
        }

        return setCorsHeaders(
            NextResponse.json({ success: true, isSavedToCheatSheet: isSaved }),
            request
        );

    } catch (error) {
        console.error('❌ Cheat Sheet Toggle API Error:', error);
        return setCorsHeaders(
            NextResponse.json({ success: false, error: 'Failed to update cheat sheet' }, { status: 500 }),
            request
        );
    }
}

// GET: Fetch all cheat sheet questions for a job
export async function GET(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        const jobIdQuery = mongoose.Types.ObjectId.isValid(jobId)
            ? new mongoose.Types.ObjectId(jobId)
            : jobId;

        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userIdQuery
        }).select('jobTitle company interviewCoach.questions').lean();

        if (!job || !job.interviewCoach) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 }),
                request
            );
        }

        // Filter to only cheat sheet questions
        const cheatSheetQuestions = job.interviewCoach.questions.filter(
            (q: any) => q.isSavedToCheatSheet
        );

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                jobTitle: job.jobTitle,
                company: job.company,
                questions: cheatSheetQuestions
            }),
            request
        );

    } catch (error) {
        console.error('❌ Get Cheat Sheet API Error:', error);
        return setCorsHeaders(
            NextResponse.json({ success: false, error: 'Failed to fetch cheat sheet' }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

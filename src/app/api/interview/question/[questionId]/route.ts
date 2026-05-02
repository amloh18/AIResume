// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication } from '@/models';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

// GET: Fetch Question Details from embedded array
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ questionId: string }> }
) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { questionId } = await params;
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job ID is required as query parameter' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        // Find job and extract question from embedded array
        const jobIdQuery = mongoose.Types.ObjectId.isValid(jobId)
            ? new mongoose.Types.ObjectId(jobId)
            : jobId;

        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userIdQuery,
            'interviewCoach.questions.id': questionId
        }).select('jobTitle company interviewCoach').lean();

        if (!job || !job.interviewCoach) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 }),
                request
            );
        }

        // Find the specific question
        const question = job.interviewCoach.questions.find((q: any) => q.id === questionId);
        if (!question) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 }),
                request
            );
        }

        // Add job context for frontend
        const questionWithContext = {
            ...question,
            _id: questionId, // For compatibility
            jobId: job._id,
            jobTitle: job.jobTitle,
            company: job.company,
            // Map aiContext to old field names for frontend compatibility
            content: {
                question: question.question,
                whyAsked: question.aiContext?.rationale,
                difficulty: question.difficulty,
                tags: [question.category]
            },
            edgeTip: {
                content: question.aiContext?.edge,
                gap: question.aiContext?.gap,
                sampleAnswer: question.aiContext?.sampleAnswer
            }
        };

        return setCorsHeaders(
            NextResponse.json({ success: true, question: questionWithContext }),
            request
        );

    } catch (error) {
        console.error('❌ Get Question API Error:', error);
        return setCorsHeaders(
            NextResponse.json({ success: false, error: 'Failed to fetch question' }, { status: 500 }),
            request
        );
    }
}

// PUT: Save Draft Answer using positional operator
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ questionId: string }> }
) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { questionId } = await params;
        const { draft, jobId } = await request.json();

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

        // Use positional operator ($) to update specific question in array
        const result = await JobApplication.updateOne(
            {
                _id: jobIdQuery,
                userId: userIdQuery,
                'interviewCoach.questions.id': questionId
            },
            {
                $set: {
                    'interviewCoach.questions.$.userAnswer': draft,
                    'interviewCoach.questions.$.status': 'drafted'
                }
            }
        );

        if (result.matchedCount === 0) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Question not found or access denied' }, { status: 404 }),
                request
            );
        }

        return setCorsHeaders(
            NextResponse.json({ success: true, lastSaved: new Date() }),
            request
        );

    } catch (error) {
        console.error('❌ Save Draft API Error:', error);
        return setCorsHeaders(
            NextResponse.json({ success: false, error: 'Failed to save draft' }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

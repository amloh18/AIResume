import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import InterviewQuestion from '@/models/InterviewQuestion';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

// GET: Fetch Question Details
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
        await getConnection();

        const question = await InterviewQuestion.findById(questionId);
        if (!question) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 }),
                request
            );
        }

        // Security Check: Ensure the parent session belongs to the user
        const session = await InterviewSession.findOne({
            _id: question.sessionId,
            userId: auth.userId
        });

        if (!session) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 }),
                request
            );
        }

        return setCorsHeaders(
            NextResponse.json({ success: true, question }),
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

// PUT: Save Draft Answer (User typing auto-save)
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
        const { draft } = await request.json();

        await getConnection();

        // Find and Verify Ownership via Population (optimized)
        const question = await InterviewQuestion.findById(questionId);
        if (!question) return setCorsHeaders(NextResponse.json({ error: 'Not found' }, { status: 404 }), request);

        // Check ownership
        const sessionExists = await InterviewSession.exists({ _id: question.sessionId, userId: auth.userId });
        if (!sessionExists) return setCorsHeaders(NextResponse.json({ error: 'Access denied' }, { status: 403 }), request);

        // Update Draft
        question.userAnswer = {
            ...question.userAnswer,
            text: draft,
            draftLastSavedAt: new Date(),
            status: question.userAnswer?.status === 'analyzed' ? 'analyzed' : 'draft' // Don't revert analyzed status
        };

        await question.save();

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

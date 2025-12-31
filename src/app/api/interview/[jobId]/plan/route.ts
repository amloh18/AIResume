import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import InterviewQuestion from '@/models/InterviewQuestion';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

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

        // Fetch Session
        const session = await InterviewSession.findOne({
            userId: auth.userId,
            jobId: jobId
        });

        if (!session) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 }),
                request
            );
        }

        // Fetch All Questions for this session to calculate progress
        // optimized to only select necessary fields
        const questions = await InterviewQuestion.find({ sessionId: session._id })
            .select('moduleId userAnswer.status displayOrder isHighRelevance content.difficulty')
            .lean();

        // Group questions by module for easier frontend consumption
        const questionsByModule = questions.reduce((acc: any, q: any) => {
            if (!acc[q.moduleId]) acc[q.moduleId] = [];
            acc[q.moduleId].push(q);
            return acc;
        }, {});

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

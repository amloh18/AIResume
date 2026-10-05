import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import InterviewQuestion from '@/models/InterviewQuestion';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';

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

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Session ID is required' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        // Security Check: Ensure session belongs to user
        const session = await InterviewSession.findOne({
            _id: sessionId,
            userId: auth.userId
        });

        if (!session) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Session not found or access denied' }, { status: 404 }),
                request
            );
        }

        // Fetch Questions
        const questions = await InterviewQuestion.find({ sessionId })
            .sort({ displayOrder: 1, 'content.difficulty': 1 }); // Sort by defined order

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                questions
            }),
            request
        );

    } catch (error) {
        console.error('❌ Get Session Questions API Error:', error);
        return setCorsHeaders(
            NextResponse.json({
                success: false,
                error: 'Failed to fetch interview questions'
            }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}


import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication } from '@/models';
import { InterviewCoachService } from '@/lib/services/interviewCoachService';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

// Increase timeout for AI
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { questionId, answer, jobId } = await request.json();

        if (!questionId || !answer || !jobId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Missing required fields (questionId, answer, jobId)' }, { status: 400 }),
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

        // Fetch job with embedded interview data
        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userIdQuery,
            'interviewCoach.questions.id': questionId
        }).select('jobTitle company jobDescription interviewCoach');

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

        // Build job context
        const jobContext = `${job.jobTitle} at ${job.company}. ${job.jobDescription?.substring(0, 500) || ''}`;

        // Call AI Service
        let analysis;
        try {
            analysis = await InterviewCoachService.analyzeAnswer(
                question.question,
                answer,
                jobContext
            );
        } catch (aiError) {
            console.error('AI Analysis failed:', aiError);
            return setCorsHeaders(
                NextResponse.json({
                    success: false,
                    error: 'AI analysis service temporarily unavailable'
                }, { status: 503 }),
                request
            );
        }

        // Build feedback object
        const feedback = {
            score: analysis.score || 0,
            strengths: analysis.strengths || [],
            improvements: analysis.improvements || [],
            refinedAnswer: analysis.improvedScript || analysis.refinedAnswer || ''
        };

        // Update question in embedded array using positional operator
        await JobApplication.updateOne(
            {
                _id: jobIdQuery,
                userId: userIdQuery,
                'interviewCoach.questions.id': questionId
            },
            {
                $set: {
                    'interviewCoach.questions.$.userAnswer': answer,
                    'interviewCoach.questions.$.status': 'completed',
                    'interviewCoach.questions.$.feedback': feedback
                }
            }
        );

        // Recalculate readiness score
        // Get fresh data to calculate average
        const updatedJob = await JobApplication.findById(jobId).select('interviewCoach').lean();
        if (updatedJob?.interviewCoach?.questions) {
            const analyzedQuestions = updatedJob.interviewCoach.questions.filter(
                (q: any) => q.status === 'completed' && q.feedback?.score !== undefined
            );

            if (analyzedQuestions.length > 0) {
                const totalScore = analyzedQuestions.reduce((sum: number, q: any) => sum + (q.feedback.score || 0), 0);
                const avgScore = Math.round(totalScore / analyzedQuestions.length);

                await JobApplication.updateOne(
                    { _id: jobId },
                    { $set: { 'interviewCoach.readinessScore': avgScore } }
                );
            }
        }

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                feedback
            }),
            request
        );

    } catch (error) {
        console.error('❌ Analyze Answer API Error:', error);
        return setCorsHeaders(
            NextResponse.json({
                success: false,
                error: 'Failed to analyze answer'
            }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

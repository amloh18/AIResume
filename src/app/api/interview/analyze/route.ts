
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import InterviewQuestion from '@/models/InterviewQuestion';
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

        const { questionId, answer } = await request.json();

        if (!questionId || !answer) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        const question = await InterviewQuestion.findById(questionId);
        if (!question) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 }),
                request
            );
        }

        // Verify Ownership via Session
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

        // Get Job context (title, company, description)
        const job = await JobApplication.findById(session.jobId).select('jobTitle company jobDescription');
        const jobContext = job ? `${job.jobTitle} at ${job.company}. ${job.jobDescription?.substring(0, 500)}...` : session.targetRole;

        // Call AI Service
        let analysis;
        try {
            analysis = await InterviewCoachService.analyzeAnswer(
                question.content.question,
                answer,
                jobContext
            );
        } catch (aiError) {
            console.error('AI Analysis failed, falling back:', aiError);
            // Fallback or error?
            return setCorsHeaders(
                NextResponse.json({
                    success: false,
                    error: 'AI analysis service temporarily unavailable'
                }, { status: 503 }),
                request
            );
        }

        // Update Question
        question.userAnswer = {
            text: answer,
            submittedAt: new Date(),
            status: 'analyzed'
        };

        question.aiFeedback = {
            score: analysis.score,
            strengths: analysis.strengths,
            improvements: analysis.improvements,
            improvedScript: analysis.improvedScript,
            sentiment: analysis.sentiment,
            analyzedAt: new Date()
        };

        await question.save();

        // Update Session Progress
        session.lastPracticedAt = new Date();

        // Calculate new session readiness score
        // Simple logic: Average of all analyzed questions' scores
        // Fetch all questions with feedback
        const allAnalysedQuestions = await InterviewQuestion.find({
            sessionId: session._id,
            'userAnswer.status': 'analyzed'
        }).select('aiFeedback.score');

        if (allAnalysedQuestions.length > 0) {
            const totalScore = allAnalysedQuestions.reduce((sum, q) => sum + (q.aiFeedback?.score || 0), 0);
            session.readinessScore = Math.round(totalScore / allAnalysedQuestions.length);
        } else {
            session.readinessScore = analysis.score; // Fallback
        }

        await session.save();

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                feedback: question.aiFeedback
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

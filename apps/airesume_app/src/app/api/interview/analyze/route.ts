
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication, CV, User } from '@/models';
import { InterviewCoachService } from '@/lib/services/interviewCoachService';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

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

        const userFilter = mixedIdFilter(auth.userId);

        // Fetch job with embedded interview data
        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userFilter,
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

        // Fetch user Master CV for context
        let cvContext = '';
        try {
            const masterCV = await CV.findOne({
                userId: job.userId,
                $or: [
                    { 'metadata.isMaster': true },
                    { cvType: 'master' }
                ]
            }).sort({ updatedAt: -1 }).lean() as any;

            if (masterCV?.cvData) {
                // Format basic details for the prompt
                const cvData = masterCV.cvData;
                cvContext = `Summary: ${cvData.basics?.summary || ''}\n\n`;
                if (cvData.work) {
                    cvContext += `Experience:\n${cvData.work.map((w: any) => `- ${w.position} at ${w.name}: ${w.summary}`).join('\n')}\n\n`;
                }
                if (cvData.skills) {
                    cvContext += `Skills: ${cvData.skills.flatMap((s: any) => s.skills || []).join(', ')}`;
                }
            }
        } catch (e) {
            console.error('Failed to fetch CV for analysis context:', e);
        }

        // Call AI Service
        let analysis;
        try {
            analysis = await InterviewCoachService.analyzeAnswer(
                question.question,
                answer,
                jobContext,
                cvContext
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
            strengths: analysis.what_you_did_well || analysis.strengths || [],
            improvements: analysis.areas_to_improve || analysis.improvements || [],
            refinedAnswer: analysis.ai_enhanced_version || analysis.improvedScript || analysis.refinedAnswer || '',
            feedback_summary: analysis.feedback_summary || '',
            your_edge: analysis.your_edge || ''
        };

        // Update question in embedded array using positional operator
        await JobApplication.updateOne(
            {
                _id: jobIdQuery,
                userId: userFilter,
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

        // --- Streak Logic ---
        let streakEvent = null;
        try {
            const user = await User.findById(auth.userId);
            if (user) {
                const now = new Date();
                const lastPractice = user.interviewCoach?.lastPracticeDate;
                let currentStreak = user.interviewCoach?.currentStreak || 0;

                if (!lastPractice) {
                    currentStreak = 1;
                    streakEvent = { type: 'started', currentStreak };
                } else {
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const lastDate = new Date(lastPractice.getFullYear(), lastPractice.getMonth(), lastPractice.getDate());
                    
                    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        currentStreak += 1;
                        streakEvent = { type: 'continued', currentStreak };
                    } else if (diffDays > 1) {
                        currentStreak = 1;
                        streakEvent = { type: 'reset', currentStreak, missedDays: diffDays - 1 };
                    }
                    // if diffDays === 0, it means they already practiced today. Streak remains the same.
                }

                // Update User
                if (!user.interviewCoach) {
                    user.interviewCoach = { currentStreak, lastPracticeDate: now };
                } else {
                    user.interviewCoach.currentStreak = currentStreak;
                    user.interviewCoach.lastPracticeDate = now;
                }
                
                await user.save();
            }
        } catch (e) {
            console.error('Failed to update user streak:', e);
        }
        // --------------------

        // Recalculate readiness score
        // Get fresh data to calculate average
        const updatedJob = await JobApplication.findById(jobId).select('interviewCoach').lean() as any;
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

                return setCorsHeaders(
                    NextResponse.json({
                        success: true,
                        feedback,
                        newReadinessScore: avgScore,
                        streakEvent
                    }),
                    request
                );
            }
        }

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                feedback,
                streakEvent
                // If no score update happened, return null or current if we had it (but we don't query it if not updating)
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

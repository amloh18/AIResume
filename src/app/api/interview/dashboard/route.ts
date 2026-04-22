import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import { JobApplication, User } from '@/models';
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

        // Since we are storing Interview Coach data inside JobApplication under `interviewCoach`,
        // we just need to fetch all active JobApplications for this user that either:
        // a) Have interviewCoach.status = 'ready' (Already generated plan)
        // b) Have status in ['applied', 'interview', 'screening', 'offer'] (Eligible to start)

        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        const eligibleStatuses = ['created', 'applied', 'screening', 'interview', 'offer', 'Created', 'Applied', 'Screening', 'Interview', 'Offer'];

        const allJobs = await JobApplication.find({
            userId: userIdQuery,
            $or: [
                { 'interviewCoach.status': 'ready' },
                { status: { $in: eligibleStatuses } }
            ]
        }).select('jobTitle company status companyLogo location jobType appliedDate interviewCoach').sort({ updatedAt: -1 }).lean();

        // Filter into inProgress (has a plan) and potential (eligible but no plan)
        const inProgress = allJobs.filter((job: any) => job.interviewCoach?.status === 'ready');
        const potential = allJobs.filter((job: any) => job.interviewCoach?.status !== 'ready');

        // Also calculate some stats
        let totalScore = 0;
        let completedQuestions = 0;
        let totalQuestions = 0;
        
        inProgress.forEach((job: any) => {
            if (job.interviewCoach?.questions) {
                job.interviewCoach.questions.forEach((q: any) => {
                    totalQuestions++;
                    if (q.status === 'completed' || q.feedback) {
                        completedQuestions++;
                        if (q.feedback?.score) {
                            totalScore += q.feedback.score;
                        }
                    }
                });
            }
        });

        const averageScore = completedQuestions > 0 ? Math.round(totalScore / completedQuestions) : 0;

        // Fetch User streak
        const user = await User.findById(userIdQuery).select('interviewCoach');
        const currentStreak = user?.interviewCoach?.currentStreak || 0;

        return setCorsHeaders(
            NextResponse.json({
                success: true,
                stats: {
                    totalOpportunities: allJobs.length,
                    completedSessions: completedQuestions,
                    averageScore: averageScore,
                    currentStreak: currentStreak
                },
                jobs: allJobs,
                inProgress,
                potentialSessions: potential,
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

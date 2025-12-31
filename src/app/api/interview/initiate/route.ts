
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import InterviewSession from '@/models/InterviewSession';
import InterviewQuestion from '@/models/InterviewQuestion';
import { JobApplication } from '@/models';
import CV from '@/models/CV';
import { InterviewCoachService } from '@/lib/services/interviewCoachService';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

// Force dynamic to ensure route is always available
export const dynamic = 'force-dynamic';
// Increase timeout for AI generation
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

        const { jobId } = await request.json();

        if (!jobId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        // Verify Job Ownership - ensure jobId is properly converted to ObjectId
        console.log('Looking for job:', jobId, 'for user:', auth.userId);

        const jobIdQuery = mongoose.Types.ObjectId.isValid(jobId)
            ? new mongoose.Types.ObjectId(jobId)
            : jobId;

        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userIdQuery
        }).select('jobTitle company jobDescription');

        console.log('Job found:', !!job, job ? job.jobTitle : 'N/A');

        if (!job) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job not found or access denied' }, { status: 404 }),
                request
            );
        }

        // Check for existing session
        const existingSession = await InterviewSession.findOne({
            userId: auth.userId,
            jobId: jobId
        });

        if (existingSession) {
            // Check if session has questions (zombie check)
            const questionCount = await InterviewQuestion.countDocuments({ sessionId: existingSession._id });

            if (questionCount > 0) {
                // Check if it's a "Fallback" session (generic content)
                const sampleQuestion = await InterviewQuestion.findOne({ sessionId: existingSession._id });
                const isFallback = sampleQuestion?.content?.whyAsked === "This question assesses your experience and problem-solving skills.";

                if (isFallback) {
                    console.warn(`⚠️ Found FALLBACK session ${existingSession._id} (generic content). Deleting and regenerating for better quality...`);
                    await InterviewSession.deleteOne({ _id: existingSession._id });
                    await InterviewQuestion.deleteMany({ sessionId: existingSession._id });
                    // Proceed to generation logic below...
                } else {
                    console.log(`✅ Found existing valid session ${existingSession._id} with ${questionCount} questions`);
                    return setCorsHeaders(
                        NextResponse.json({
                            success: true,
                            session: existingSession,
                            existing: true
                        }),
                        request
                    );
                }
            } else {
                console.warn(`⚠️ Found empty session ${existingSession._id} (0 questions). Deleting and regenerating...`);
                await InterviewSession.deleteOne({ _id: existingSession._id });
                // Proceed to generation logic below...
            }
        }

        // Fetch Master CV for personalization
        // Try to find marked Master CV first, otherwise fallback to any CV or empty data
        let cvData: any = {};
        const masterCV = await CV.findOne({
            userId: auth.userId,
            $or: [
                { 'metadata.isMaster': true },
                { cvType: 'master' }
            ]
        }).sort({ updatedAt: -1 });

        if (masterCV && masterCV.cvData) {
            cvData = masterCV.cvData;
        } else {
            // Fallback: Try most recent CV
            const recentCV = await CV.findOne({ userId: auth.userId }).sort({ updatedAt: -1 });
            if (recentCV && recentCV.cvData) {
                cvData = recentCV.cvData;
            }
        }

        // Call AI Service to generate plan
        // This might take 10-20 seconds
        try {
            const { modules, questions, skillExtracts } = await InterviewCoachService.generateInterviewPlan(
                job.jobDescription || `${job.jobTitle} at ${job.company}`,
                cvData,
                job.jobTitle,
                job.company
            );

            // Create Session
            const newSession = await InterviewSession.create({
                userId: auth.userId,
                jobId: jobId,
                targetRole: job.jobTitle,
                createdVia: 'auto_generated',
                readinessScore: 0,
                modules,
                skillExtracts
            });

            // Bulk insert questions
            const questionDocs = questions.map(q => ({
                ...q,
                sessionId: newSession._id
            }));

            await InterviewQuestion.insertMany(questionDocs);

            return setCorsHeaders(
                NextResponse.json({
                    success: true,
                    session: newSession,
                    existing: false
                }),
                request
            );

        } catch (aiError) {
            console.error('❌ AI Generation failed:', aiError);
            // Fallback: Create session with error state or empty modules?
            // For now, let's fail the request so the UI shows an error and allows retry
            return setCorsHeaders(
                NextResponse.json({
                    success: false,
                    error: 'Failed to generate interview plan. Please try again.'
                }, { status: 500 }),
                request
            );
        }

    } catch (error) {
        console.error('❌ Interview Initiate API Error:', error);
        return setCorsHeaders(
            NextResponse.json({
                success: false,
                error: 'Failed to initiate interview session'
            }, { status: 500 }),
            request
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return setCorsHeaders(new NextResponse(null, { status: 200 }), request);
}

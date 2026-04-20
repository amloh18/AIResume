
import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication } from '@/models';
import CV from '@/models/CV';
import { InterviewCoachService } from '@/lib/services/interviewCoachService';
import { setCorsHeaders } from '@/lib/utils/cors-helpers';
import mongoose from 'mongoose';

// Force dynamic to ensure route is always available
export const dynamic = 'force-dynamic';
// 🟢 Increase timeout for AI generation (can take 50+ seconds)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
                request
            );
        }

        const { jobId, regenerate, action = 'generate' } = await request.json();

        if (!jobId) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 }),
                request
            );
        }

        await getConnection();

        // 🔒 STRICT ObjectId conversion - this is critical for the update to work
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            console.error(`❌ Invalid jobId format: ${jobId}`);
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Invalid Job ID format' }, { status: 400 }),
                request
            );
        }

        const jobIdObj = new mongoose.Types.ObjectId(jobId);
        const userIdObj = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        console.log(`🔍 Looking for job: ${jobIdObj.toString()} for user: ${userIdObj}`);

        // Fetch job with ownership check
        const job = await JobApplication.findOne({
            _id: jobIdObj,
            userId: userIdObj
        }).select('jobTitle company jobDescription missingKeywords interviewCoach');

        if (!job) {
            // Debug: Check if job exists at all
            const jobExists = await JobApplication.exists({ _id: jobIdObj });
            console.error(`❌ Job not found. Exists in DB: ${!!jobExists}, JobID: ${jobId}, UserID: ${auth.userId}`);
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job not found or access denied' }, { status: 404 }),
                request
            );
        }

        console.log(`✅ Job found: ${job.jobTitle} at ${job.company}`);

        // Handle 'fetch' action to prevent unnecessary AI generation
        if (action === 'fetch') {
            if (job.interviewCoach?.status === 'ready' && job.interviewCoach?.questions?.length > 0) {
                return setCorsHeaders(
                    NextResponse.json({
                        success: true,
                        interviewCoach: job.interviewCoach,
                        existing: true,
                    }),
                    request
                );
            } else {
                return setCorsHeaders(
                    NextResponse.json({
                        success: true,
                        interviewCoach: { status: 'not_started', questions: [] },
                        existing: false,
                    }),
                    request
                );
            }
        }

        // 🔄 Check for cached plan (72-hour freshness)
        if (!regenerate && job.interviewCoach?.status === 'ready' && job.interviewCoach?.questions?.length > 0) {
            const generatedAt = job.interviewCoach.generatedAt;
            const hoursOld = generatedAt
                ? (Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60)
                : Infinity;

            if (hoursOld < 72) {
                console.log(`♻️ Serving cached interview plan (${hoursOld.toFixed(1)}h old, ${job.interviewCoach.questions.length} questions)`);
                return setCorsHeaders(
                    NextResponse.json({
                        success: true,
                        interviewCoach: job.interviewCoach,
                        existing: true,
                        cached: true,
                        cachedHoursAgo: Math.round(hoursOld)
                    }),
                    request
                );
            }
            console.log(`⏰ Plan stale (${Math.round(hoursOld)}h old), regenerating...`);
        }

        // Fetch Master CV for personalization
        let cvData: any = {};
        let linkedCvId: mongoose.Types.ObjectId | undefined;

        const masterCV = await CV.findOne({
            userId: auth.userId,
            $or: [
                { 'metadata.isMaster': true },
                { cvType: 'master' }
            ]
        }).sort({ updatedAt: -1 });

        if (masterCV?.cvData) {
            cvData = masterCV.cvData;
            linkedCvId = masterCV._id;
        } else {
            const recentCV = await CV.findOne({ userId: auth.userId }).sort({ updatedAt: -1 });
            if (recentCV?.cvData) {
                cvData = recentCV.cvData;
                linkedCvId = recentCV._id;
            }
        }

        // 🚀 Generate interview plan via AI
        console.log('🚀 Cache miss/expired. Generating new AI plan...');
        try {
            const { modules, questions } = await InterviewCoachService.generateInterviewPlan(
                job.jobDescription || `${job.jobTitle} at ${job.company}`,
                cvData,
                job.jobTitle,
                job.company,
                job.missingKeywords || []
            );


            console.log(`📦 AI returned: ${modules.length} modules, ${questions.length} questions`);

            // Debug: Log sample data structure
            if (modules.length > 0) {
                console.log(`📋 First module:`, JSON.stringify(modules[0], null, 2).substring(0, 200));
            }
            if (questions.length > 0) {
                console.log(`❓ First question:`, JSON.stringify(questions[0], null, 2).substring(0, 300));
            }

            // 💾 Use direct document update + save() for reliable persistence
            console.log(`💾 Saving plan for Job ID: ${jobIdObj.toString()}`);

            // Fetch fresh document for update
            const jobToUpdate = await JobApplication.findById(jobIdObj);
            if (!jobToUpdate) {
                console.error(`❌ Job disappeared during AI generation!`);
                return setCorsHeaders(
                    NextResponse.json({
                        success: false,
                        error: 'Job not found after AI generation'
                    }, { status: 500 }),
                    request
                );
            }

            // Set the interviewCoach data directly
            jobToUpdate.interviewCoach = {
                status: 'ready',
                generatedAt: new Date(),
                linkedCvId: linkedCvId,
                readinessScore: 0,
                modules: modules,
                questions: questions
            };

            // Save with validation
            await jobToUpdate.save();

            // Verify by re-fetching
            const verifyJob = await JobApplication.findById(jobIdObj).select('interviewCoach').lean() as any;

            console.log('📝 Verification after save:', {
                hasInterviewCoach: !!verifyJob?.interviewCoach,
                status: verifyJob?.interviewCoach?.status,
                moduleCount: verifyJob?.interviewCoach?.modules?.length || 0,
                questionCount: verifyJob?.interviewCoach?.questions?.length || 0
            });

            if (!verifyJob?.interviewCoach || verifyJob.interviewCoach.questions?.length === 0) {
                console.error('❌ Save appeared successful but interviewCoach is empty after verification!');
                console.error('Raw interviewCoach from DB:', JSON.stringify(verifyJob?.interviewCoach, null, 2)?.substring(0, 500));
                return setCorsHeaders(
                    NextResponse.json({
                        success: false,
                        error: 'Failed to save interview plan - data not persisted'
                    }, { status: 500 }),
                    request
                );
            }

            console.log(`✅ Successfully saved plan to Job ${jobIdObj.toString()}`);
            console.log(`📦 Modules: ${modules.map((m: any) => m.name).join(', ')}`);
            console.log(`❓ Questions: ${questions.length} total`);

            return setCorsHeaders(
                NextResponse.json({
                    success: true,
                    interviewCoach: verifyJob.interviewCoach,
                    existing: false
                }),
                request
            );

        } catch (aiError) {
            console.error('❌ AI Generation failed:', aiError);
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

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { JobApplication, User } from '@/models';
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

        // Fetch Job with embedded interview data
        const jobIdQuery = mongoose.Types.ObjectId.isValid(jobId)
            ? new mongoose.Types.ObjectId(jobId)
            : jobId;

        const userIdQuery = mongoose.Types.ObjectId.isValid(auth.userId)
            ? new mongoose.Types.ObjectId(auth.userId)
            : auth.userId;

        const job = await JobApplication.findOne({
            _id: jobIdQuery,
            userId: userIdQuery
        }).select('jobTitle company interviewCoach').lean() as any;

        if (!job) {
            return setCorsHeaders(
                NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 }),
                request
            );
        }

        // Check if interview plan exists
        if (!job.interviewCoach || job.interviewCoach.status !== 'ready') {
            return setCorsHeaders(
                NextResponse.json({
                    success: false,
                    error: 'Interview plan not generated yet',
                    needsGeneration: true
                }, { status: 404 }),
                request
            );
        }

        const { modules, questions, readinessScore } = job.interviewCoach;

        // Group questions by module for easier frontend consumption
        // Group questions by module for easier frontend consumption
        const questionsByModule: Record<string, any[]> = {};

        console.log(`🧩 Grouping ${questions.length} questions into ${modules.length} modules...`);

        questions.forEach((q: any) => {
            // Robust ID extraction
            const qId = q.id ? q.id.toString() : (q._id ? q._id.toString() : null);

            if (!qId) {
                console.warn('⚠️ Question found with no ID:', q);
                return;
            }

            // Find which module this question belongs to
            const module = modules.find((m: any) =>
                m.questionIds?.some((mid: any) => mid?.toString() === qId)
            );

            const moduleId = module?.id || 'unassigned';

            if (moduleId === 'unassigned') {
                console.log(`⚠️ Question ${qId} not assigned to any module (looking for ID in [${modules.map((m: any) => m.questionIds?.length).join(',')}])`);
            }

            if (!questionsByModule[moduleId]) {
                questionsByModule[moduleId] = [];
            }
            questionsByModule[moduleId].push(q);
        });

        // Ensure all modules are initialized in the map even if empty
        modules.forEach((m: any) => {
            if (!questionsByModule[m.id]) {
                questionsByModule[m.id] = [];
            }
        });


        // Fetch User streak
        const user = await User.findById(userIdQuery).select('interviewCoach');
        const currentStreak = user?.interviewCoach?.currentStreak || 0;

        // Build session-like response for frontend compatibility
        const session = {
            _id: job._id,
            jobId: {
                _id: job._id,
                jobTitle: job.jobTitle,
                company: job.company
            },
            targetRole: job.jobTitle,
            modules: modules,
            readinessScore: readinessScore || 0,
            status: job.interviewCoach.status,
            generatedAt: job.interviewCoach.generatedAt,
            currentStreak: currentStreak
        };

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

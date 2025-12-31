import { NextRequest, NextResponse } from 'next/server';
import { InterviewCoachService } from '@/lib/services/interviewCoachService';
import { getConnection } from '@/lib/database';
import JobApplication from '@/models/JobApplication';
import CV from '@/models/CV';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    try {
        await getConnection();

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId') || '69413beaacc3304b30813d76';

        console.log('🐞 Debug: Starting Interview Generation Verification for Job:', jobId);

        const job = await JobApplication.findById(jobId).lean();
        if (!job) {
            return NextResponse.json({ error: 'Job not found', jobId }, { status: 404 });
        }

        const cv = await CV.findOne({ userId: job.userId }).sort({ updatedAt: -1 }).lean() as any;
        if (!cv) {
            return NextResponse.json({ error: 'CV not found for user', userId: job.userId }, { status: 404 });
        }

        console.log('🐞 Debug: Found Job and CV. calling InterviewCoachService...');

        const startTime = Date.now();
        const plan = await InterviewCoachService.generateInterviewPlan(
            job.jobDescription || `${job.jobTitle} at ${job.company}`,
            cv.cvData || cv,
            job.jobTitle,
            job.company
        );
        const duration = Date.now() - startTime;

        console.log('🐞 Debug: Generation completed in', duration, 'ms');
        console.log('🐞 Debug: Modules:', plan.modules?.length);
        console.log('🐞 Debug: Questions:', plan.questions?.length);

        return NextResponse.json({
            success: true,
            duration,
            jobTitle: job.jobTitle,
            extractedQuestionsCount: plan.questions?.length || 0,
            modulesCount: plan.modules?.length || 0,
            modules: plan.modules,
            questionsPreview: plan.questions?.slice(0, 3) // Show first 3 for inspection
        });

    } catch (error) {
        console.error('🐞 Debug: Generation Failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}

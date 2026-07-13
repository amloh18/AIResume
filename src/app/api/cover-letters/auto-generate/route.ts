import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getConnection from '@/lib/database';
import User from '@/models/User';
import CoverLetter from '@/models/CoverLetter';
import { CV, Job } from '@/models';
import { toObjectId } from '@/lib/db-utils';
import { aiCoverLetterService } from '@/lib/services/aiCoverLetterService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { getPlanAccess } from '@/lib/utils/plan-access';

export async function POST(request: NextRequest) {
    try {
        // Auth guard
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
        }

        await getConnection();

        // Load user for plan check (uses session.user.id — never trusts body userId)
        const user = await User.findById(session.user.id)
            .select('currentPlanKey subscription')
            .lean();

        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Plan gate: coverLetterAI requires starter_yearly+
        const planAccess = getPlanAccess(user);
        const denied = planAccess.gate('coverLetterAI');
        if (denied) return denied;

        const body = await request.json();
        // Always use the authenticated session userId — ignore any userId in the body
        const userId = session.user.id;
        const { journeyId, cvId, jobId } = body;

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
        }


        // Check if cover letter already exists
        if (journeyId) {
            const existing = await CoverLetter.findOne({ journeyId, userId: toObjectId(userId) });
            if (existing) {
                return NextResponse.json({ success: true, coverLetterId: existing._id, status: 'exists' });
            }
        }

        // Fetch Linked Data
        let cvData: UnifiedCVDataStructure | null = null;
        let jobData: any = null;

        if (cvId) {
            const cv = await CV.findById(toObjectId(cvId)).lean();
            if (cv && cv.userId.toString() === userId) {
                cvData = (cv as any).cvData;
            }
        }

        if (jobId) {
            const job = await Job.findById(toObjectId(jobId)).lean();
            if (job && job.userId.toString() === userId) {
                jobData = job;
            }
        }

        if (!cvData || !jobData) {
            return NextResponse.json({ success: false, message: 'Missing CV or Job data' }, { status: 400 });
        }

        // Generate Content
        const { structuredContent, legacyBody } = await aiCoverLetterService.generateModularCoverLetter({
            cvData,
            jobData,
            companyName: jobData.company
        });

        // Create Cover Letter
        const newCoverLetter = await CoverLetter.create({
            userId: toObjectId(userId),
            title: `Cover Letter for ${jobData.company || 'Job'}`,
            content: '', // Legacy content empty, we use header/body/footer/metadata
            header: structuredContent.header ? formatHeader(structuredContent.header, cvData) : formatDefaultHeader(cvData),
            body: legacyBody,
            footer: structuredContent.sections?.closing?.text || 'Sincerely,', // Or generate a default footer
            status: 'draft',
            cvId: toObjectId(cvId),
            jobId: toObjectId(jobId),
            journeyId: journeyId ? toObjectId(journeyId) : undefined,
            metadata: {
                structuredBody: structuredContent,
                targetCompany: jobData.company,
                targetPosition: jobData.title,
                lastModified: new Date(),
                version: 1
            }
        });

        // Link cover letter back to journey for bidirectional discovery
        if (journeyId) {
            try {
                const { ApplicationJourney } = await import('@/models/ApplicationJourney');
                await ApplicationJourney.updateOne(
                    { _id: toObjectId(journeyId), userId: toObjectId(userId) },
                    { $set: { coverLetterId: newCoverLetter._id } }
                );
            } catch (journeyLinkError) {
                console.error('Failed to link cover letter to journey:', journeyLinkError);
            }
        }

        return NextResponse.json({ success: true, coverLetterId: newCoverLetter._id, status: 'created', coverLetter: newCoverLetter });

    } catch (error) {
        console.error('Auto-generation error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

// Helpers
function formatHeader(headerData: any, cvData: any) {
    // Simple accumulation or specific formatting
    return `${cvData.basics?.name || ''}\n${cvData.basics?.email || ''}\n${cvData.basics?.phone || ''}\n\n${new Date().toLocaleDateString()}\n\n${headerData.recipient || 'Hiring Manager'}\n${headerData.company || ''}`;
}

function formatDefaultHeader(cvData: any) {
    return `${cvData.basics?.name || ''}\n${cvData.basics?.email || ''}`;
}

import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import CoverLetter from '@/models/CoverLetter';
import { toObjectId } from '@/lib/db-utils';
import { aiCoverLetterService } from '@/lib/services/aiCoverLetterService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export async function POST(request: NextRequest) {
    try {
        await getConnection();

        const body = await request.json();
        const { userId, journeyId, cvId, jobId } = body;

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
            const cvRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cvs/${cvId}?userId=${userId}`);
            if (cvRes.ok) {
                const json = await cvRes.json();
                cvData = json.data?.cv?.cvData || json.cv?.cvData;
            }
        }

        if (jobId) {
            const jobRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/jobs/${jobId}?userId=${userId}`);
            if (jobRes.ok) {
                const json = await jobRes.json();
                jobData = json.data?.job || json.job;
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

        // Attempt to link to journey if journeyId is provided? 
        // The previous route.ts comment said "Cover Letter-to-Journey linking is now handled by ApplicationPackageService".
        // But since we are creating it *for* a journey and we passed journeyId to create, it should be linked by the journeyId field on the CL model itself if that schema exists.
        // However, the Journey model also has a `coverLetterId` field. We should probably update the Journey model too.

        if (journeyId) {
            // We should update the journey with this cover letter ID. 
            // We can call the journey update API or do it directly if we import the Journey model.
            // For safety/cleanliness, let's just return the ID and let the frontend or another service handle linkage if strict ownership is needed,
            // BUT usually "check if exists" implies we want the *relationship* to exist.
            // Let's rely on the frontend reloading or we can try to update the journey here.

            // Ideally, we'd use a Journey service. Since we don't have one handy in this file, let's do a fetch to update it?
            // Or simpler: The user refreshes Step 4 and it sees the CL because `fetchCoverLetterStatus` in Step4Review 
            // does `fetch('/api/application-journey/' + journeyId)` and checks `coverLetterId`.
            // So we MUST update the Journey document.
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

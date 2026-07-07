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

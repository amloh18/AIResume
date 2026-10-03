import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCvTailoringMode } from '@/lib/cv-tailoring/getUserCvTailoringMode';
import {
    buildCvTailoringPrompt,
    extractAtsKeywords,
    parseCvTailoringMode,
    applyDeterministicAtsPass,
} from '@/lib/cv-tailoring/tailoringMode';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting CV tailoring...');

        // Add CORS headers
        const headers = new Headers();
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        let body;
        try {
            body = await request.json();
        } catch (parseError: any) {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON in request body' },
                { status: 400, headers }
            );
        }

        const { cvData, jobData, tailoringMode }: {
            cvData: UnifiedCVDataStructure;
            jobData: any;
            tailoringMode?: string;
        } = body;

        if (!cvData || !jobData) {
            return NextResponse.json(
                { success: false, error: 'CV data and Job data are required' },
                { status: 400, headers }
            );
        }

        if (!hasAIApiKeys()) {
            return NextResponse.json({
                success: false,
                error: 'AI API keys not configured',
                note: 'Cannot tailor CV without AI service'
            }, { status: 503, headers });
        }

        // 1. Analyze Job Requirements & Skill Gaps (Implicitly done by LLM in one go for efficiency, or we can pass pre-calculated analysis)
        // We will ask the LLM to do it as part of the tailoring process.

        const jobDescription = jobData.jobDescription || jobData.description || '';
        const jobTitle = jobData.title || jobData.jobTitle || 'Target Role';
        const company = jobData.company || jobData.companyName || 'Target Company';
        const session = await getServerSession(authOptions);
        const savedMode = session?.user?.id ? await getUserCvTailoringMode(session.user.id) : undefined;
        const mode = parseCvTailoringMode(tailoringMode || savedMode);
        const atsKeywords = extractAtsKeywords(jobDescription);
        const prompt = buildCvTailoringPrompt({
            mode,
            cvData,
            jobTitle,
            company,
            jobDescription,
            atsKeywords,
        });

        const aiResponse = await callAIWithFallback({
            prompt,
            systemPrompt: 'You are a JSON-only API. You must return valid JSON matching the UnifiedCVDataStructure schema.',
            temperature: 0.4, // Lower temperature for more consistent JSON structure
            maxTokens: 4000 // Allow enough tokens for full CV
        });

        // Parse the response
        let tailoredCvData;
        try {
            // Extract JSON from potential markdown blocks
            const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                tailoredCvData = applyDeterministicAtsPass(JSON.parse(jsonMatch[0]), {
                    mode,
                    jobTitle,
                    atsKeywords,
                });
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            console.error('Failed to parse tailored CV JSON:', e);
            console.log('Raw response:', aiResponse.content);
            return NextResponse.json({
                success: false,
                error: 'Failed to generate valid JSON for tailored CV',
                rawResponse: aiResponse.content
            }, { status: 500, headers });
        }

        return NextResponse.json({
            success: true,
            cvData: tailoredCvData,
            timestamp: new Date().toISOString()
        }, { headers });

    } catch (error: any) {
        console.error('CV tailoring error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error during CV tailoring'
        }, { status: 500 });
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

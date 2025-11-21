import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';

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

        const { cvData, jobData }: {
            cvData: UnifiedCVDataStructure;
            jobData: any;
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

        // Construct the prompt
        const prompt = `
    You are an expert Senior HR Recruiter and CV Writer.
    Your task is to TAILOR the candidate's CV specifically for the target job.

    TARGET JOB:
    Title: ${jobTitle}
    Company: ${company}
    Description: ${jobDescription}

    CANDIDATE CV DATA (JSON):
    ${JSON.stringify(cvData)}

    INSTRUCTIONS:
    1. **Filter Experience**: Remove work experiences that are completely irrelevant to the target role, or very old (>15 years) unless they show critical leadership or foundational skills relevant to the job. Keep the most recent and relevant roles.
    2. **Enhance Bullet Points**: Rewrite bullet points for the remaining roles.
       - Use the Challenge-Action-Result (CAR) framework.
       - Incorporate keywords from the Job Description naturally.
       - Focus on achievements and impact (quantifiable metrics).
       - Remove generic responsibilities.
    3. **Skill Gap Analysis**: Identify skills in the JD that the candidate likely possesses based on their experience but hasn't explicitly listed. Add these to the "skills" section if appropriate.
    4. **Professional Summary**: Rewrite the summary to pitch the candidate specifically for this role, highlighting the match between their experience and the JD requirements.
    5. **HR Perspective**: Ensure the tone is professional, confident, and optimized for how an HR manager scans a CV (clear headings, impact-first).

    OUTPUT FORMAT:
    Return ONLY the valid JSON of the tailored CV data. The structure must match the input JSON structure exactly (UnifiedCVDataStructure).
    Do not include any markdown formatting or explanation. Just the JSON.
    `;

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
                tailoredCvData = JSON.parse(jsonMatch[0]);
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

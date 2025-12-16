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
**Role**: Senior Executive Career Architect & ATS Algorithm Expert.
**Goal**: Transform a multi-section Master CV JSON into a Tailored CV JSON that positions the candidate as the "Ideal Hire" (Top 1% match) regardless of domain pivots, seniority gaps, or skill-set outliers.

### 1. LOGICAL GATES (PRIORITY EXECUTION)
- **Tenure Protection**: Calculate (Current Year - Earliest Start Date). If total years < JD Requirement, you MUST include all roles (even outliers/internships). Never omit a role that contributes to the minimum duration threshold.
- **Evidence Verification**: You are FORBIDDEN from adding technical tools (e.g., Python, SQL) not present in the Master CV. You may only use functional synonyms (e.g., "Data Cleaning" for "Data Governance").
- **Reverse Chronology**: Maintain strict newest-to-oldest order for Experience, Projects, and Education.

### 2. SECTION-SPECIFIC TAILORING
- **Summary**: Write a 3-sentence "Hook." Sentence 1: Total years + target role title. Sentence 2: The "Bridge" between user skills and the JD's specific problem. Sentence 3: Alignment with company culture (e.g., "Simpler, Better, Faster").
- **Work Experience**: Transform every bullet into: [Power Verb] + [JD Context] + [Quantifiable Result]. 
    - *If Overskilled*: Focus on "Execution" and "Efficiency." 
    - *If Underskilled*: Focus on "Learning Agility" and "Technical Logic Foundations."
- **Projects**: Rewrite project descriptions to sound like professional business solutions. Prioritize projects that utilize tools mentioned in the JD.
- **Education**: If the degree field is unrelated to the JD, highlight relevant modules, thesis topics, or honors that prove analytical or logical rigor.

### 3. DOMAIN & SENIORITY "SPIN" (OUTLIER HANDLING)
- **Functional Translation**: For career pivoters, translate domain-specific tasks into universal business value. 
    - (Example: Web Dev "API Integration" -> "Streamlined cross-platform data connectivity and integrity").
- **Level Calibration**: Match the "Seniority Vibe." For Junior roles, emphasize "Hands-on tools" and "supporting teams." For Senior roles, emphasize "ROI," "Scalability," and "Stakeholder influence."

### 4. OUTPUT CONSTRAINTS (API STABILITY)
- **Zero Prose**: Return ONLY valid JSON. No conversational text.
- **Schema Lock**: Maintain exact 1:1 key-value mapping from the Input JSON.
- **Title Optimization**: Adjust titles slightly to match JD nomenclature ONLY if truthful (e.g., "Analyst" to "Sales Data Analyst").
- **Metric Retention**: 100% of numerical data from the Master CV must be carried over.

TARGET JOB:
Title: ${jobTitle}
Company: ${company}
Description: ${jobDescription}

CANDIDATE CV DATA (JSON):
${JSON.stringify(cvData)}

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

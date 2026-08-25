import { NextRequest, NextResponse } from 'next/server';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { CV_TAILOR_AGENT_PROMPT } from '@/lib/prompts/promptTemplates';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCvTailoringMode } from '@/lib/cv-tailoring/getUserCvTailoringMode';
import {
    CV_TAILORING_MODE_LABELS,
    extractAtsKeywords,
    parseCvTailoringMode,
    applyDeterministicAtsPass,
} from '@/lib/cv-tailoring/tailoringMode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        console.log('🔬 Starting V3 CV Tailoring...');

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

        const { CV_DATA, CV_TYPE, SCORE_REPORT, MASTER_CV_DATA, JD_DATA, TARGET_ROLE, OPTIMISATION_TARGET } = body;

        if (!CV_DATA || !CV_TYPE || !SCORE_REPORT) {
            return NextResponse.json(
                { success: false, error: 'CV_DATA, CV_TYPE, and SCORE_REPORT are required' },
                { status: 400, headers }
            );
        }

        if ((CV_TYPE === 'standalone' || CV_TYPE === 'journey') && !MASTER_CV_DATA) {
            return NextResponse.json(
                { success: false, error: 'MASTER_CV_DATA is required for standalone and journey CV tailoring' },
                { status: 400, headers }
            );
        }

        if (CV_TYPE === 'journey' && !JD_DATA) {
            return NextResponse.json(
                { success: false, error: 'JD_DATA is required for journey CV tailoring' },
                { status: 400, headers }
            );
        }

        if (CV_TYPE === 'standalone' && !TARGET_ROLE) {
            return NextResponse.json(
                { success: false, error: 'TARGET_ROLE is required for standalone CV tailoring' },
                { status: 400, headers }
            );
        }

        if (!hasAIApiKeys()) {
            return NextResponse.json({
                success: false,
                error: 'AI API keys not configured'
            }, { status: 503, headers });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers });
        }

        const primaryRole = OPTIMISATION_TARGET?.primaryRole || TARGET_ROLE || 'N/A';
        const seniority = OPTIMISATION_TARGET?.seniority || 'professional';
        const savedMode = await getUserCvTailoringMode(session.user.id);
        const mode = parseCvTailoringMode(body.TAILORING_MODE || savedMode);
        const jdText =
            (typeof JD_DATA === 'string' ? JD_DATA : JD_DATA?.description || JD_DATA?.jobDescription || '') || '';
        const atsKeywords = extractAtsKeywords(jdText);
        const modeMeta = CV_TAILORING_MODE_LABELS[mode];

        let prompt = CV_TAILOR_AGENT_PROMPT
            .replace('{{CV_DATA}}', typeof CV_DATA === 'string' ? CV_DATA : JSON.stringify(CV_DATA, null, 2))
            .replace('{{CV_TYPE}}', CV_TYPE)
            .replace('{{SCORE_REPORT}}', typeof SCORE_REPORT === 'string' ? SCORE_REPORT : JSON.stringify(SCORE_REPORT, null, 2))
            .replace('{{MASTER_CV_DATA}}', MASTER_CV_DATA ? (typeof MASTER_CV_DATA === 'string' ? MASTER_CV_DATA : JSON.stringify(MASTER_CV_DATA, null, 2)) : 'N/A')
            .replace('{{JD_DATA}}', JD_DATA ? (typeof JD_DATA === 'string' ? JD_DATA : JSON.stringify(JD_DATA, null, 2)) : 'N/A')
            .replace('{{TARGET_ROLE}}', TARGET_ROLE || 'N/A')
            .replace('{{PRIMARY_ROLE}}', primaryRole)
            .replace('{{INFERRED_OR_TARGET_SENIORITY}}', seniority);

        prompt += `

---
USER TAILORING MODE: ${modeMeta.full} (${mode})
${modeMeta.description}
Priority ATS keywords from the job description (use exact tokens when evidenced): ${atsKeywords.join(', ') || 'none extracted'}
ATS: Mirror JD wording, put the target title in the summary, keep standard ATS-safe structure, never invent employers/dates/metrics.
${mode === 'standout'
    ? 'STANDOUT: Retitle roles to JD language when the work matches; fill transferable gaps; lead with strongest JD-relevant proof.'
    : 'NORMAL: Stay close to the Master CV. Add missing skills only when already evidenced. Do not inflate seniority or invent tools.'}
`;

        const aiResponse = await callAIWithFallback({
            prompt,
            systemPrompt: 'You are a JSON-only CV rewrite engine. Return ONLY valid JSON matching the return shape. No conversational filler, no markdown code blocks.',
            temperature: 0.3,
            maxTokens: 8000
        });

        let content = aiResponse.content.trim();

        // Robust extraction of JSON content
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
        const codeBlockMatch = content.match(codeBlockRegex);
        if (codeBlockMatch) {
            content = codeBlockMatch[1].trim();
        }

        let jsonStart = content.indexOf('{');
        let jsonEnd = content.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
            throw new Error('No valid JSON object found in response');
        }

        let jsonString = content.substring(jsonStart, jsonEnd + 1);
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1'); // trailing comma fix

        const responseObj = JSON.parse(jsonString);
        const tailoredPayload = responseObj.cvData || responseObj.CV_DATA || responseObj.tailoredCvData;
        if (tailoredPayload) {
            const polished = applyDeterministicAtsPass(tailoredPayload, {
                mode,
                jobTitle: String(primaryRole),
                atsKeywords,
            });
            if (responseObj.cvData) responseObj.cvData = polished;
            else if (responseObj.CV_DATA) responseObj.CV_DATA = polished;
            else responseObj.tailoredCvData = polished;
        }

        return NextResponse.json({
            success: true,
            ...responseObj
        }, { headers });

    } catch (error: any) {
        console.error('❌ Error in tailor-cv-v3 route:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { ANALYSIS_AGENT_PROMPT } from '@/lib/prompts/promptTemplates';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        console.log('🔬 Starting V3 CV Analysis...');

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

        const { CV_DATA, CV_TYPE, JD_DATA, TARGET_ROLE, MASTER_CV_DATA } = body;

        if (!CV_DATA || !CV_TYPE) {
            return NextResponse.json(
                { success: false, error: 'CV_DATA and CV_TYPE are required' },
                { status: 400, headers }
            );
        }

        if (CV_TYPE === 'journey' && !JD_DATA) {
            return NextResponse.json(
                { success: false, error: 'JD_DATA is required for journey CVs' },
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

        // Build prompt
        let prompt = ANALYSIS_AGENT_PROMPT
            .replace('{{CV_DATA}}', typeof CV_DATA === 'string' ? CV_DATA : JSON.stringify(CV_DATA, null, 2))
            .replace('{{CV_TYPE}}', CV_TYPE)
            .replace('{{JD_DATA}}', JD_DATA ? (typeof JD_DATA === 'string' ? JD_DATA : JSON.stringify(JD_DATA, null, 2)) : 'N/A')
            .replace('{{TARGET_ROLE}}', TARGET_ROLE || 'N/A')
            .replace('{{MASTER_CV_DATA}}', MASTER_CV_DATA ? (typeof MASTER_CV_DATA === 'string' ? MASTER_CV_DATA : JSON.stringify(MASTER_CV_DATA, null, 2)) : 'N/A');

        const aiResponse = await callAIWithFallback({
            prompt,
            systemPrompt: 'You are a JSON-only recruiter analysis API. Return ONLY valid JSON. No conversational filler, no markdown code blocks.',
            temperature: 0.2,
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

        const scoreReport = JSON.parse(jsonString);

        return NextResponse.json({
            success: true,
            scoreReport
        }, { headers });

    } catch (error: any) {
        console.error('❌ Error in analyze-cv-v3 route:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

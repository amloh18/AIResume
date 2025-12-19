import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SurgicalFix {
    id: string;
    section: string;
    issue: string;
    original_text: string;
    fixed_text: string;
    impact_score_delta: number;
    // New (report/overlay targeting)
    fieldPath?: string;
    category?: 'impact' | 'keywords' | 'clarity' | 'formatting' | 'grammar' | 'structure' | 'other';
    severity?: 'low' | 'medium' | 'high';
}

export async function POST(request: NextRequest) {
    try {
        console.log('🔬 Starting CV Surgeon analysis...');

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

        const { cvData, targetRole, seniorityLevel, jobData }: {
            cvData: UnifiedCVDataStructure;
            targetRole: string;
            seniorityLevel: string;
            jobData?: any;
        } = body;

        if (!cvData || !targetRole || !seniorityLevel) {
            return NextResponse.json(
                { success: false, error: 'CV data, target role, and seniority level are required' },
                { status: 400, headers }
            );
        }

        if (!hasAIApiKeys()) {
            return NextResponse.json({
                success: false,
                error: 'AI API keys not configured',
                note: 'Cannot analyze CV without AI service'
            }, { status: 503, headers });
        }

        // Build the CV Surgeon prompt
        const prompt = `
**Role**: You are an expert Career Surgeon. Analyze the uploaded CV specifically for the role of **${targetRole}** at the **${seniorityLevel}** level.

**Task**: Provide SURGICAL FIXES - precise, actionable improvements that transform weak content into high-impact statements.

**Critical Rules**:
1. **Evidence-Based**: NEVER add skills, tools, or technologies not present in the CV
2. **Quantify Everything**: Transform vague statements into metric-driven achievements
3. **Role-Specific**: Every fix must align with ${targetRole} requirements
4. **Seniority-Appropriate**: 
   - Beginner/Experienced: Focus on hands-on skills, learning agility, execution
   - Professional: Balance technical depth with business impact
   - Senior/Executive: Emphasize ROI, scalability, strategic influence, leadership

**Candidate CV**:
${JSON.stringify(cvData)}

${jobData ? `**Target Job Description**:\nTitle: ${jobData.title || ''}\nCompany: ${jobData.company || ''}\nDescription: ${jobData.description || ''}\n` : ''}

**Output Format**:
Return a JSON object with:
{
  "score": <number 0-100>,
  "fixes": [
    {
      "section": "<section name>",
      "category": "<impact|keywords|clarity|formatting|grammar|structure|other>",
      "severity": "<low|medium|high>",
      "fieldPath": "<exact field path in cvData, e.g. basics.summary or work[0].highlights[2]>",
      "issue": "<what's wrong>",
      "original_text": "<exact snippet from that field>",
      "fixed_text": "<improved version for that snippet or full field>",
      "impact_score_delta": <number +1 to +15>
    }
  ]
}

**Field Path Rules**:
1. fieldPath MUST point to a string field that exists in the provided cvData.
2. original_text MUST be found inside the string at fieldPath (exact substring).
3. NEVER invent content that isn't present in the CV.

**Focus Areas**:
1. **Summary**: Transform into a role-specific hook (3 sentences max)
2. **Work Experience**: Add quantifiable metrics, power verbs, role-relevant context
3. **Skills**: Reorganize/prioritize based on ${targetRole} relevance
4. **Projects**: Reframe as professional business solutions

Return ONLY valid JSON. No markdown, no explanations.
`;

        const aiResponse = await callAIWithFallback({
            prompt,
            systemPrompt: 'You are a JSON-only API. Return valid JSON matching the specified schema.',
            temperature: 0.3,
            maxTokens: 4000
        });

        // Parse the AI response
        let result;
        try {
            const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            console.error('Failed to parse CV Surgeon JSON:', e);
            console.log('Raw response:', aiResponse.content);
            return NextResponse.json({
                success: false,
                error: 'Failed to generate valid JSON for surgical fixes',
                rawResponse: aiResponse.content
            }, { status: 500, headers });
        }

        // Add unique IDs to fixes
        const fixesWithIds: SurgicalFix[] = (result.fixes || []).map((fix: any, index: number) => ({
            id: `fix-${Date.now()}-${index}`,
            section: fix.section,
            category: fix.category,
            severity: fix.severity,
            fieldPath: fix.fieldPath,
            issue: fix.issue,
            original_text: fix.original_text,
            fixed_text: fix.fixed_text,
            impact_score_delta: fix.impact_score_delta || 5
        }));

        console.log(`✅ CV Surgeon analysis complete: ${fixesWithIds.length} fixes generated, score: ${result.score}`);

        return NextResponse.json({
            success: true,
            score: result.score || 0,
            fixes: fixesWithIds,
            timestamp: new Date().toISOString()
        }, { headers });

    } catch (error: any) {
        console.error('CV Surgeon error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error during CV analysis'
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

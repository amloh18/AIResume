import { NextRequest, NextResponse } from 'next/server';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIQuotaService } from '@/lib/services/ai-quota-service';
import { buildCVSurgeonPrompt } from '@/lib/prompts/cv-surgeon-prompt';

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

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers });
        }

        const quotaStatus = await AIQuotaService.checkAndConsumeQuota(session.user.id, 'surgeon_analysis', true);
        const isRestricted = !quotaStatus.allowed;

        // Build the CV/ATS Master Architect prompt (from enhance.md)
        const hasJD = jobData?.description || jobData?.jobDescription;
        const jdText = jobData?.description || jobData?.jobDescription || 'N/A';

        // For Master CV mode (no JD), detect role and get industry keywords
        let industryKeywordsInfo = '';
        if (!hasJD) {
            const manager = CentralScoreManager.getInstance();
            const { role, detectedTitle } = manager.detectRoleFromCV(cvData);
            const industryMatch = manager.calculateIndustryKeywordMatch(cvData);
            industryKeywordsInfo = `
### INDUSTRY STANDARD CONTEXT (Master CV Mode)
- **Detected Role:** ${detectedTitle || targetRole} → Mapped to: ${role.replace(/_/g, ' ').toUpperCase()}
- **Industry Match Score:** ${industryMatch.score}/40 (${industryMatch.matchedKeywords.length}/${industryMatch.totalKeywords} keywords matched)
- **Matched Keywords:** ${industryMatch.matchedKeywords.slice(0, 20).join(', ')}
- **Optimization Goal:** Refactor bullet points to include more industry-standard terminology for ${role.replace(/_/g, ' ')} roles.
- **Do NOT prune** experience - instead broaden impact statements with industry-standard metrics and keywords.
`;
        }

        const prompt = buildCVSurgeonPrompt({
            cvData,
            targetRole,
            seniorityLevel,
            jdText,
            hasJD: Boolean(hasJD),
            isRestricted,
            industryKeywordsInfo,
        });

        const aiResponse = await callAIWithFallback({
            prompt,
            systemPrompt: 'You are a JSON-only API. Return valid JSON matching the specified schema. Keep responses compact - max 5-10 fixes, no full CV copies.',
            temperature: 0.3,
            maxTokens: 6000
        });

        // Parse the AI response
        let result;
        try {
            let content = aiResponse.content.trim();

            // Remove markdown code blocks if present
            const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
            const codeBlockMatch = content.match(codeBlockRegex);
            if (codeBlockMatch) {
                content = codeBlockMatch[1].trim();
            }

            // Try to find JSON object - look for the first { and try to find matching }
            let jsonStart = content.indexOf('{');
            if (jsonStart === -1) {
                throw new Error('No JSON object found in response');
            }

            // Find the matching closing brace by counting braces (handling strings properly)
            let braceCount = 0;
            let jsonEnd = -1;
            let inString = false;
            let escapeNext = false;

            for (let i = jsonStart; i < content.length; i++) {
                const char = content[i];

                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }

                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            jsonEnd = i + 1;
                            break;
                        }
                    }
                }
            }

            if (jsonEnd === -1) {
                // If we can't find matching brace, try to find the last complete closing brace
                console.warn('⚠️ JSON appears incomplete, attempting to find last complete brace');
                // Try to find the last complete array element or object
                const lastCompleteBrace = content.lastIndexOf('}');
                if (lastCompleteBrace > jsonStart) {
                    jsonEnd = lastCompleteBrace + 1;
                } else {
                    throw new Error('Incomplete JSON - no matching closing brace found');
                }
            }

            let jsonString = content.substring(jsonStart, jsonEnd);

            // Try to fix common JSON issues before parsing
            // Remove trailing commas before closing braces/brackets
            jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

            // Try to parse the JSON
            result = JSON.parse(jsonString);

            // Validate the result structure
            if (!result || typeof result !== 'object') {
                throw new Error('Parsed JSON is not an object');
            }

            // Ensure fixes is an array
            if (!Array.isArray(result.fixes)) {
                console.warn('⚠️ Fixes is not an array, converting to array');
                result.fixes = result.fixes ? [result.fixes] : [];
            }

        } catch (e: any) {
            console.error('Failed to parse CV Surgeon JSON:', e);
            console.log('Raw response length:', aiResponse.content.length);
            console.log('Raw response (first 500 chars):', aiResponse.content.substring(0, 500));
            console.log('Raw response (last 500 chars):', aiResponse.content.substring(Math.max(0, aiResponse.content.length - 500)));

            // Try to extract partial fixes if possible
            try {
                // Look for any valid JSON fragments
                const fixesMatch = aiResponse.content.match(/"fixes"\s*:\s*\[([\s\S]*?)\]/);
                if (fixesMatch) {
                    console.log('Attempting to extract fixes from partial JSON...');
                    // This is a fallback - return a minimal valid response
                    result = {
                        score: 0,
                        fixes: []
                    };
                    console.warn('⚠️ Using fallback empty fixes array due to JSON parsing error');
                } else {
                    throw new Error('Could not extract any valid JSON structure');
                }
            } catch (fallbackError) {
                return NextResponse.json({
                    success: false,
                    error: 'Failed to generate valid JSON for surgical fixes',
                    details: e.message,
                    rawResponseLength: aiResponse.content.length,
                    rawResponsePreview: aiResponse.content.substring(0, 1000)
                }, { status: 500, headers });
            }
        }

        // Add unique IDs to fixes and include fix_type
        const fixesWithIds: SurgicalFix[] = (result.fixes || []).map((fix: any, index: number) => ({
            id: `fix-${Date.now()}-${index}`,
            section: fix.section,
            category: fix.category,
            severity: fix.severity,
            fieldPath: fix.fieldPath,
            issue: fix.issue,
            original_text: fix.original_text,
            fixed_text: fix.fixed_text,
            impact_score_delta: fix.impact_score_delta || 5,
            fix_type: fix.fix_type || 'authentic'
        }));

        // Extract scores from audit_report or use legacy score field
        const cvScore = result.audit_report?.cv_profile_strength?.score ?? result.score ?? 0;
        const atsScore = result.audit_report?.ats_match_score?.score ?? null;

        console.log(`✅ CV Surgeon analysis complete: ${fixesWithIds.length} fixes generated, CV score: ${cvScore}, ATS score: ${atsScore}`);

        return NextResponse.json({
            success: true,
            isRestricted,
            // Primary scores
            score: cvScore,
            atsScore: atsScore,
            // Detailed audit report
            audit_report: result.audit_report || {
                cv_profile_strength: { score: cvScore, breakdown: {}, multiplier: 1.0, penalty_reasons: [] },
                ats_match_score: null
            },
            // Surgical fixes
            fixes: fixesWithIds,
            // Dual-surgery outputs
            authentic_optimization: result.authentic_optimization || null,
            strategic_fix: result.strategic_fix || null,
            // Annotation log with JSON paths
            annotation_log: result.annotation_log || [],
            // Next steps for user
            next_steps: result.next_steps || [],
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

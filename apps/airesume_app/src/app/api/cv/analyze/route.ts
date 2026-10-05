/**
 * POST /api/cv/analyze
 * 
 * Profile-Centric Endpoint
 * Executes tasks that require ONLY a user's resume (Uploads / Updates / Enhancements).
 * 
 * Consolidates: comprehensive-analysis, analyze-cv-v3, basic CV quality parsing.
 * 
 * Payload Contract:
 *   Required: cvData (UnifiedCVDataStructure)
 *   Optional: cvId, targetRole, seniorityLevel, enhance (boolean), cvType
 * 
 * Returns:
 *   - CV Quality metrics (C, I, Q, F, R) from CentralScoreManager
 *   - Comprehensive analysis (8 modules) from AI
 *   - Surgical fixes if enhance=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { buildCVSurgeonPrompt } from '@/lib/prompts/cv-surgeon-prompt';
import { ANALYSIS_AGENT_PROMPT } from '@/lib/prompts/promptTemplates';
import { callAIWithFallback, hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { ScoreResult, CVScoreBreakdown } from '@/lib/pill-engine/CentralScoreManager';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface CVAnalyzeRequest {
    cvData: UnifiedCVDataStructure;
    cvId?: string;
    targetRole?: string;
    seniorityLevel?: string;
    enhance?: boolean;
    cvType?: 'master' | 'standalone' | 'journey';
    jdData?: string;
    masterCvData?: string;
}

interface CVAnalyzeResponse {
    success: boolean;
    data?: {
        // Deterministic scores from CentralScoreManager (always present)
        cvScore: CVScoreBreakdown;
        cvScoreTotal: number;
        grade: 'A' | 'B' | 'C' | 'D' | 'F';
        recommendations: string[];

        // AI analysis (when AI is available)
        analysis?: any;
        scoreReport?: any;

        // Enhancement (when enhance=true)
        fixes?: any[];
        auditReport?: any;

        // Metadata
        context: 'profile-only';
        cached: boolean;
    };
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CVAnalyzeResponse>> {
    try {
        // 1. Authenticate
        const auth = await authenticateRequest(request);
        if (!auth) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 2. Parse request
        const body: CVAnalyzeRequest = await request.json();
        const { cvData, cvId, targetRole, seniorityLevel, enhance, cvType, jdData, masterCvData } = body;

        if (!cvData) {
            return NextResponse.json(
                { success: false, error: 'cvData is required' },
                { status: 400 }
            );
        }

        await getConnection();

        // 3. Deterministic scoring — ALWAYS runs, no AI needed
        const manager = CentralScoreManager.getInstance();
        const scoreResult: ScoreResult = manager.getScoreSync(cvData, null, 100);
        const cvScoreResult = scoreResult.cvScore;
        const grade = scoreResult.overallGrade;
        const recommendations = scoreResult.recommendations;

        console.log('📊 CV Analyze - Deterministic score:', {
            total: cvScoreResult.total,
            grade,
            completeness: cvScoreResult.completeness,
            impactVerbs: cvScoreResult.impactVerbs,
            quantification: cvScoreResult.quantification,
        });

        // 4. AI Analysis (if keys available)
        const analysis: any = undefined;
        let scoreReport: any = undefined;

        if (hasAIApiKeys()) {
            try {
                // Check AI quota
                const { AIQuotaService } = await import('@/lib/services/ai-quota-service');
                const quotaStatus = await AIQuotaService.checkAndConsumeQuota(auth.userId, 'full_analysis', true);

                if (quotaStatus.allowed) {
                    // Use the ANALYSIS_AGENT_PROMPT for comprehensive analysis
                    const effectiveCvType = cvType || 'standalone';
                    const prompt = ANALYSIS_AGENT_PROMPT
                        .replace('{{CV_DATA}}', JSON.stringify(cvData, null, 2))
                        .replace('{{CV_TYPE}}', effectiveCvType)
                        .replace('{{JD_DATA}}', jdData || 'N/A')
                        .replace('{{TARGET_ROLE}}', targetRole || 'N/A')
                        .replace('{{MASTER_CV_DATA}}', masterCvData || 'N/A');

                    const aiResponse = await callAIWithFallback({
                        prompt,
                        systemPrompt: 'You are a JSON-only recruiter analysis API. Return ONLY valid JSON. No conversational filler, no markdown code blocks.',
                        temperature: 0.2,
                        maxTokens: 8000,
                    });

                    let content = aiResponse.content.trim();

                    // Strip markdown code fences
                    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
                    const codeBlockMatch = content.match(codeBlockRegex);
                    if (codeBlockMatch) {
                        content = codeBlockMatch[1].trim();
                    }

                    // Extract JSON
                    const jsonStart = content.indexOf('{');
                    const jsonEnd = content.lastIndexOf('}');
                    if (jsonStart !== -1 && jsonEnd > jsonStart) {
                        let jsonString = content.substring(jsonStart, jsonEnd + 1);
                        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
                        scoreReport = JSON.parse(jsonString);
                    }
                } else {
                    console.log('⚠️ CV Analyze - AI quota exceeded, skipping AI analysis');
                }
            } catch (aiError) {
                console.error('⚠️ CV Analyze - AI analysis failed (non-blocking):', aiError);
            }
        }

        // 5. Enhancement (if requested)
        let fixes: any[] | undefined;
        let auditReport: any | undefined;

        if (enhance && hasAIApiKeys()) {
            try {
                const { AIQuotaService } = await import('@/lib/services/ai-quota-service');
                const quotaStatus = await AIQuotaService.checkAndConsumeQuota(auth.userId, 'surgeon_analysis', true);

                if (quotaStatus.allowed) {
                    const role = manager.detectRoleFromCV(cvData);
                    const industryMatch = manager.calculateIndustryKeywordMatch(cvData);

                    const hasJD = !!(jdData && jdData.trim().length > 20);
                    const industryKeywordsInfo = !hasJD ? `
### INDUSTRY STANDARD CONTEXT (Master CV Mode)
- **Detected Role:** ${targetRole || role.detectedTitle || 'Unknown'} → Mapped to: ${role.role.replace(/_/g, ' ').toUpperCase()}
- **Industry Match Score:** ${industryMatch.score}/40 (${industryMatch.matchedKeywords.length}/${industryMatch.totalKeywords} keywords matched)
- **Matched Keywords:** ${industryMatch.matchedKeywords.slice(0, 20).join(', ')}
` : '';

                    const prompt = buildCVSurgeonPrompt({
                        cvData,
                        targetRole: targetRole || role.detectedTitle || 'Professional',
                        seniorityLevel: seniorityLevel || 'mid',
                        jdText: jdData || 'No specific job - using industry standards',
                        hasJD,
                        isRestricted: false,
                        industryKeywordsInfo,
                    });

                    const aiResponse = await callAIWithFallback({
                        prompt,
                        systemPrompt: 'You are a JSON-only API. Return valid JSON matching the specified schema. Keep responses compact - max 5-10 fixes, no full CV copies.',
                        temperature: 0.3,
                        maxTokens: 6000,
                    });

                    let content = aiResponse.content.trim();
                    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
                    const codeBlockMatch = content.match(codeBlockRegex);
                    if (codeBlockMatch) {
                        content = codeBlockMatch[1].trim();
                    }

                    const jsonStart = content.indexOf('{');
                    if (jsonStart !== -1) {
                        let braceCount = 0;
                        let jsonEnd = -1;
                        let inString = false;
                        let escapeNext = false;

                        for (let i = jsonStart; i < content.length; i++) {
                            const char = content[i];
                            if (escapeNext) { escapeNext = false; continue; }
                            if (char === '\\') { escapeNext = true; continue; }
                            if (char === '"') { inString = !inString; continue; }
                            if (!inString) {
                                if (char === '{') braceCount++;
                                else if (char === '}') {
                                    braceCount--;
                                    if (braceCount === 0) { jsonEnd = i + 1; break; }
                                }
                            }
                        }

                        if (jsonEnd === -1) {
                            const lastBrace = content.lastIndexOf('}');
                            if (lastBrace > jsonStart) jsonEnd = lastBrace + 1;
                        }

                        if (jsonEnd > jsonStart) {
                            let jsonString = content.substring(jsonStart, jsonEnd);
                            jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
                            const result = JSON.parse(jsonString);
                            fixes = result.fixes;
                            auditReport = result.audit_report;
                        }
                    }
                }
            } catch (enhanceError) {
                console.error('⚠️ CV Analyze - Enhancement failed (non-blocking):', enhanceError);
            }
        }

        // 6. Save CV score to database if cvId provided
        if (cvId) {
            try {
                const { CVRepository } = await import('@/lib/repositories/cv-repository');
                const cvRepo = new CVRepository();
                await cvRepo.updateATSScore(cvId, cvScoreResult.total, undefined, cvScoreResult);
            } catch (saveError) {
                console.error('⚠️ CV Analyze - Failed to save score to DB (non-blocking):', saveError);
            }
        }

        // 7. Return unified response
        return NextResponse.json({
            success: true,
            data: {
                cvScore: cvScoreResult,
                cvScoreTotal: cvScoreResult.total,
                grade,
                recommendations,
                analysis,
                scoreReport,
                fixes,
                auditReport,
                context: 'profile-only',
                cached: false,
            }
        });

    } catch (error) {
        console.error('❌ CV Analyze - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}

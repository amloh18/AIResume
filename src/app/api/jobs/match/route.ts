/**
 * POST /api/jobs/match
 * 
 * Job-Centric Endpoint
 * Executes tasks requiring BOTH a user's resume AND a specific Job Description (JD).
 * 
 * Consolidates: /api/ats/calculate-score, /api/jobs/analyze-cv-match,
 * /api/ai/keyword-gap-analysis, /api/ai/comprehensive-analysis (JD-specific parts).
 * 
 * Payload Contract:
 *   Required: cvData (UnifiedCVDataStructure), jobDescription (string)
 *   Optional: cvId, jobId, jobTitle, company, userId (for extension)
 * 
 * Returns:
 *   - ATS Score (K×0.4 + F×0.2 + S×0.15 + R×0.15 + C×0.1) × P
 *   - Job Match Score (Skills×0.4 + Title×0.3 + Location×0.2 + Recency×0.1)
 *   - Keyword Gap Analysis (AI-powered)
 *   - AI Match Analysis (detailed skill gap breakdown)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { ApplicationJourney } from '@/models';
import { CentralScoreManager } from '@/lib/pill-engine/CentralScoreManager';
import { KeywordGapAnalysisService } from '@/lib/services/keyword-gap-analysis-service';
import { extractCVSearchText } from '@/lib/utils/cv-text-extractor';
import { buildCVMatchPrompt } from '@/lib/prompts/cv-match-prompt';
import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import { hasAIApiKeys } from '@/lib/utils/ai-api-helper';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { KeywordGapAnalysisResult } from '@/types/keyword-gap';
import { ApplicationJourneyRelationshipService } from '@/lib/services/cvJourneyRelationshipService';
import { CVRepository } from '@/lib/repositories/cv-repository';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// In-memory cache for match results
const matchCache = new Map<string, { result: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateCacheKey(userId: string, cvId: string, jobDescription: string, jobTitle?: string): string {
    const hash = crypto
        .createHash('sha256')
        .update(`${userId}-${cvId}-${jobDescription.substring(0, 500)}-${jobTitle || ''}`)
        .digest('hex')
        .substring(0, 16);
    return `job-match-${hash}`;
}

function generateContentHash(cvData: UnifiedCVDataStructure): string {
    const cvString = JSON.stringify({
        basics: cvData.basics,
        work: cvData.work,
        education: cvData.education,
        skills: cvData.skills,
        projects: cvData.projects,
    });
    return crypto.createHash('sha256').update(cvString).digest('hex');
}

interface JobsMatchRequest {
    cvData: UnifiedCVDataStructure;
    cvId?: string;
    jobId?: string;
    jobDescription: string;
    jobTitle?: string;
    company?: string;
    userId?: string;
}

interface JobsMatchResponse {
    success: boolean;
    data?: {
        // ATS Score — deterministic, always present
        atsScore: number;
        atsScoreBreakdown: {
            keywordMatch: number;
            formatting: number;
            sectionAlignment: number;
            recency: number;
            contactability: number;
            parsabilityMultiplier: number;
            context: 'jd-specific' | 'industry-general';
        };

        // Job Match Score — deterministic heuristic
        jobMatchScore: number;
        jobMatchBreakdown: {
            skills: number;
            title: number;
            location: number;
            recency: number;
        };

        // AI-powered analysis (when available)
        keywordAnalysis?: KeywordGapAnalysisResult;
        aiMatchAnalysis?: {
            matchScore: number;
            matchedSkills: string[];
            missingSkills: string[];
            skillGapAnalysis: any;
            cvRecommendations: string[];
        };

        // Metadata
        contentHash: string;
        cached: boolean;
        savedToDb: boolean;
    };
    error?: string;
}

/**
 * Auth helper supporting both session and extension JWT
 */
async function getUserIdFromRequest(request: NextRequest, bodyUserId?: string): Promise<{ userId: string; source: string } | null> {
    const authHeader = request.headers.get('authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as MyJwtPayload;
            if (decoded.type !== 'extension') return null;
            const userId = decoded.userId || decoded.id || '';
            if (!userId) return null;
            return { userId, source: 'extension' };
        } catch {
            return null;
        }
    } else if (bodyUserId) {
        return { userId: bodyUserId, source: 'body' };
    } else {
        try {
            const auth = await authenticateRequest(request);
            if (auth) return { userId: auth.userId, source: auth.source };
        } catch {}
        return null;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<JobsMatchResponse>> {
    try {
        await getConnection();

        const body: JobsMatchRequest = await request.json();
        const { cvData, cvId, jobId, jobDescription, jobTitle, company, userId: bodyUserId } = body;

        if (!cvData || !jobDescription) {
            return NextResponse.json(
                { success: false, error: 'cvData and jobDescription are required' },
                { status: 400 }
            );
        }

        if (jobDescription.trim().split(/\s+/).filter(Boolean).length < 20) {
            return NextResponse.json(
                { success: false, error: 'Job description is too short for accurate analysis' },
                { status: 400 }
            );
        }

        // Authenticate
        const authInfo = await getUserIdFromRequest(request, bodyUserId);
        if (!authInfo) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const userId = authInfo.userId;

        // Check cache
        const cacheKey = generateCacheKey(userId, cvId || 'no-cv', jobDescription, jobTitle);
        const cached = matchCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) {
            return NextResponse.json({ success: true, data: { ...cached.result, cached: true } });
        }

        const contentHash = generateContentHash(cvData);
        const manager = CentralScoreManager.getInstance();

        // ─────────────────────────────────────────────
        // STEP 1: ATS Score (deterministic — always runs)
        // ─────────────────────────────────────────────
        let keywordAnalysis: KeywordGapAnalysisResult | null = null;

        try {
            keywordAnalysis = await KeywordGapAnalysisService.analyze(cvData, {
                title: jobTitle || '',
                description: jobDescription,
                company: company || '',
            });
        } catch (kwError) {
            console.error('⚠️ Jobs Match - Keyword analysis failed, using fallback:', kwError);
        }

        const atsScoreResult = manager.calculateATSScore(cvData, keywordAnalysis, 100);

        // ─────────────────────────────────────────────
        // STEP 2: Job Match Score (deterministic heuristic)
        // ─────────────────────────────────────────────
        const jobMatchBreakdown = await calculateJobMatchBreakdown(cvData, jobTitle, jobDescription);
        const jobMatchScore = Math.round(
            jobMatchBreakdown.skills * 0.4 +
            jobMatchBreakdown.title * 0.3 +
            jobMatchBreakdown.location * 0.2 +
            jobMatchBreakdown.recency * 0.1
        );

        // ─────────────────────────────────────────────
        // STEP 3: AI Match Analysis (optional, when AI available)
        // ─────────────────────────────────────────────
        let aiMatchAnalysis: any = undefined;

        if (hasAIApiKeys()) {
            try {
                // Extract skills from cvData
                const allSkills: string[] = [];
                if (cvData?.skills && Array.isArray(cvData.skills)) {
                    cvData.skills.forEach((skillCategory: any) => {
                        if (skillCategory.skills && Array.isArray(skillCategory.skills)) {
                            allSkills.push(...skillCategory.skills);
                        }
                    });
                }

                let experienceYears = 0;
                if (cvData?.work && Array.isArray(cvData.work)) {
                    cvData.work.forEach((job: any) => {
                        if (job.startDate) {
                            const start = new Date(job.startDate + '-01');
                            const end = job.endDate && job.endDate !== 'Present'
                                ? new Date(job.endDate + '-01')
                                : new Date();
                            const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
                            experienceYears += Math.max(0, years);
                        }
                    });
                    experienceYears = Math.round(experienceYears * 10) / 10;
                }

                const cvProfile = {
                    skills: allSkills,
                    experience: { years: experienceYears, level: 'mid', workHistory: cvData?.work || [] },
                    education: cvData?.education || [],
                    certifications: cvData?.certificates?.map((cert: any) => cert.name) || [],
                    summary: cvData?.basics?.summary || '',
                    projects: cvData?.projects || [],
                };

                const prompt = buildCVMatchPrompt({
                    cvProfile,
                    jobTitle,
                    company,
                    jobDescription,
                });

                const result = await callGeminiWithAllKeysFallback(prompt, {
                    maxTokens: 2048,
                    temperature: 0.7,
                });

                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    aiMatchAnalysis = {
                        matchScore: Math.min(100, Math.max(0, parsed.matchScore || 0)),
                        matchedSkills: parsed.matchedSkills || [],
                        missingSkills: parsed.missingSkills || [],
                        skillGapAnalysis: parsed.skillGapAnalysis || { critical: [], important: [], recommendations: [] },
                        cvRecommendations: parsed.cvRecommendations || [],
                    };
                }
            } catch (aiError) {
                console.error('⚠️ Jobs Match - AI match analysis failed (non-blocking):', aiError);
            }
        }

        // ─────────────────────────────────────────────
        // STEP 4: Save to database
        // ─────────────────────────────────────────────
        let savedToDb = false;

        try {
            const finalScore = atsScoreResult.total;
            const savePromises: Promise<any>[] = [];

            // Save to CV metadata
            if (cvId) {
                const cvRepository = new CVRepository();
                savePromises.push(
                    cvRepository.updateATSScore(cvId, finalScore, contentHash, atsScoreResult)
                );
            }

            // Save to journey if jobId provided
            if (jobId && cvId) {
                let journey = await ApplicationJourney.findOne({
                    jobId,
                    userId: new (await import('mongoose')).Types.ObjectId(userId),
                });
                if (!journey) {
                    journey = await ApplicationJourney.findOne({
                        cvId,
                        jobId,
                        userId: new (await import('mongoose')).Types.ObjectId(userId),
                    });
                }
                if (journey) {
                    savePromises.push(
                        ApplicationJourneyRelationshipService.updateJourneyATSScore(
                            journey._id.toString(),
                            finalScore,
                            jobId,
                            atsScoreResult,
                            contentHash
                        )
                    );
                }
            }

            await Promise.all(savePromises);
            savedToDb = true;
        } catch (dbError) {
            console.error('⚠️ Jobs Match - DB save failed (non-blocking):', dbError);
        }

        // ─────────────────────────────────────────────
        // STEP 5: Build and cache response
        // ─────────────────────────────────────────────
        const responseData = {
            atsScore: atsScoreResult.total,
            atsScoreBreakdown: {
                keywordMatch: atsScoreResult.keywordMatch,
                formatting: atsScoreResult.formatting,
                sectionAlignment: atsScoreResult.sectionAlignment,
                recency: atsScoreResult.recency,
                contactability: atsScoreResult.contactability,
                parsabilityMultiplier: atsScoreResult.parsabilityMultiplier,
                context: atsScoreResult.context,
            },
            jobMatchScore,
            jobMatchBreakdown,
            keywordAnalysis: keywordAnalysis || undefined,
            aiMatchAnalysis,
            contentHash,
            cached: false,
            savedToDb,
        };

        matchCache.set(cacheKey, {
            result: responseData,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return NextResponse.json({ success: true, data: responseData });

    } catch (error) {
        console.error('❌ Jobs Match - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}

/**
 * Deterministic job match breakdown using SmartSkillMatcher
 * Skills×0.4 + Title×0.3 + Location×0.2 + Recency×0.1
 */
async function calculateJobMatchBreakdown(
    cvData: UnifiedCVDataStructure,
    jobTitle?: string,
    jobDescription?: string
): Promise<{ skills: number; title: number; location: number; recency: number }> {
    const { extractUserSkills, extractJobSkills, matchSkills, matchTitles } = await import('@/lib/services/smartSkillMatcher');

    // Extract skills from CV
    const userSkills = extractUserSkills(cvData);

    // Extract skills from job
    const jobSkills = extractJobSkills({
        description: jobDescription || '',
        keywords: [],
        title: jobTitle,
    });

    // Match skills
    const skillResult = matchSkills(userSkills, jobSkills);

    // Match title (using CV text as pseudo-title source)
    let titleScore = 50;
    if (jobTitle) {
        // Extract likely role titles from CV
        const cvTitles: string[] = [];
        if ((cvData as any).work?.length) {
            for (const exp of (cvData as any).work) {
                if (exp.position) cvTitles.push(exp.position);
                if (exp.title) cvTitles.push(exp.title);
            }
        }
        if (cvData.basics?.label) cvTitles.push(cvData.basics.label);

        if (cvTitles.length > 0) {
            const titleResult = matchTitles(cvTitles, jobTitle);
            titleScore = titleResult.score;
        } else {
            // Fallback: word overlap
            const cvText = extractCVSearchText(cvData);
            const normalizedTitle = jobTitle.toLowerCase();
            if (cvText.includes(normalizedTitle)) {
                titleScore = 100;
            } else {
                const titleWords = normalizedTitle.split(/\s+/);
                const matchedWords = titleWords.filter(w => w.length > 2 && cvText.includes(w));
                if (matchedWords.length > 0) {
                    titleScore = Math.round((matchedWords.length / titleWords.length) * 80) + 10;
                }
            }
        }
    }

    return {
        skills: Math.min(skillResult.matchScore, 100),
        title: Math.min(titleScore, 100),
        location: 50,
        recency: 70,
    };
}

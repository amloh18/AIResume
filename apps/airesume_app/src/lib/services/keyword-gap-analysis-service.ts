/**
 * Keyword Gap Analysis Service
 * 
 * Extracted from /api/ai/keyword-gap-analysis route for reuse in ATS scoring.
 * Analyzes CV content against job description to find missing keywords.
 */

import { callGeminiWithAllKeysFallback } from '@/lib/utils/gemini-api-fallback';
import type {
    KeywordGap,
    KeywordGapAnalysisResult
} from '@/types/keyword-gap';
import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { extractCVSearchText } from '@/lib/utils/cv-text-extractor';
import { buildKeywordGapPrompt } from '@/lib/prompts/keyword-gap-prompt';
import crypto from 'crypto';

export class KeywordGapAnalysisService {
    /**
     * Analyze CV against job description to find keyword gaps
     */
    static async analyze(
        cvData: UnifiedCVDataStructure,
        jobData: {
            title?: string;
            description: string;
            company?: string;
        }
    ): Promise<KeywordGapAnalysisResult> {
        const { description: jobDescription, title: jobTitle, company } = jobData;

        if (!jobDescription || jobDescription.trim().length === 0) {
            console.log('⚠️ KeywordGapAnalysisService - No job description provided');
            return this.getEmptyResult('');
        }

        // Check JD length
        const wordCount = jobDescription.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 20) {
            console.log('⚠️ KeywordGapAnalysisService - Job description too short:', wordCount, 'words');
            return this.getEmptyResult(jobDescription);
        }

        // Generate content hash for caching
        const jdContentHash = crypto
            .createHash('md5')
            .update(jobDescription)
            .digest('hex');

        // Extract CV content for comparison using canonical extractor
        const cvContent = extractCVSearchText(cvData);

        // Build prompt for AI analysis using canonical prompt
        const prompt = buildKeywordGapPrompt({ cvContent, jobDescription, jobTitle, company });

        try {
            // Call AI for analysis
            const aiResponse = await callGeminiWithAllKeysFallback(prompt, {
                maxTokens: 8192
            });

            if (!aiResponse) {
                console.error('❌ KeywordGapAnalysisService - AI call failed');
                return this.getEmptyResult(jdContentHash);
            }

            // Parse AI response
            return this.parseAIResponse(aiResponse, cvContent, jdContentHash);
        } catch (error) {
            console.error('❌ KeywordGapAnalysisService - Error:', error);
            return this.getEmptyResult(jdContentHash);
        }
    }

    /**
     * Parse AI response into structured KeywordGapAnalysisResult
     */
    private static parseAIResponse(
        aiResponse: string,
        cvContent: string,
        jdContentHash: string
    ): KeywordGapAnalysisResult {
        try {
            // Clean response (remove markdown if present)
            let cleanResponse = aiResponse.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
            }

            const parsed = JSON.parse(cleanResponse);

            // Build gaps array
            const gaps: KeywordGap[] = (parsed.gaps || []).map((gap: any) => ({
                keyword: gap.keyword || '',
                category: this.validateCategory(gap.category),
                frequency: gap.frequency || 1,
                importance: this.validateImportance(gap.importance),
                suggestion: gap.suggestion,
                context: gap.context,
                userConfirmed: false,
                dismissed: false
            }));

            // Calculate stats
            const totalJDKeywords = parsed.totalKeywordsFound || (parsed.matchedKeywords || []).length + gaps.length;
            const matchedCount = (parsed.matchedKeywords || []).length;
            const gapCount = gaps.length;
            const criticalGaps = gaps.filter(g => g.importance === 'critical').length;
            const preferredGaps = gaps.filter(g => g.importance === 'preferred').length;
            const niceToHaveGaps = gaps.filter(g => g.importance === 'nice-to-have').length;

            return {
                gaps,
                matchScore: parsed.matchScore || 0,
                matchedKeywords: parsed.matchedKeywords || [],
                stats: {
                    totalJDKeywords,
                    matchedCount,
                    gapCount,
                    criticalGaps,
                    preferredGaps,
                    niceToHaveGaps
                },
                analyzedAt: new Date(),
                jdContentHash
            };

        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return this.getEmptyResult(jdContentHash);
        }
    }

    /**
     * Get empty result for error cases
     */
    private static getEmptyResult(jdContentHash: string): KeywordGapAnalysisResult {
        return {
            gaps: [],
            matchScore: 0,
            matchedKeywords: [],
            stats: {
                totalJDKeywords: 0,
                matchedCount: 0,
                gapCount: 0,
                criticalGaps: 0,
                preferredGaps: 0,
                niceToHaveGaps: 0
            },
            analyzedAt: new Date(),
            jdContentHash
        };
    }

    /**
     * Validate and normalize category
     */
    private static validateCategory(category: string): KeywordGap['category'] {
        const validCategories = ['skill', 'tool', 'certification', 'experience', 'soft_skill', 'industry'];
        if (validCategories.includes(category)) {
            return category as KeywordGap['category'];
        }
        return 'skill';
    }

    /**
     * Validate and normalize importance
     */
    private static validateImportance(importance: string): KeywordGap['importance'] {
        const validImportance = ['critical', 'preferred', 'nice-to-have'];
        if (validImportance.includes(importance)) {
            return importance as KeywordGap['importance'];
        }
        return 'preferred';
    }
}

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

        // Extract CV content for comparison
        const cvContent = this.extractCVContent(cvData);

        // Build prompt for AI analysis
        const prompt = this.buildKeywordAnalysisPrompt(cvContent, jobDescription, jobTitle, company);

        try {
            // Call AI for analysis
            const aiResponse = await callGeminiWithAllKeysFallback(prompt);

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
     * Extract all text content from CV for comparison
     */
    private static extractCVContent(cvData: UnifiedCVDataStructure): string {
        const parts: string[] = [];

        // Basics
        if (cvData.basics) {
            if (cvData.basics.summary) parts.push(cvData.basics.summary);
            if (cvData.basics.label) parts.push(cvData.basics.label);
        }

        // Work experience
        if (cvData.work && Array.isArray(cvData.work)) {
            cvData.work.forEach((job: any) => {
                if (job.position) parts.push(job.position);
                if (job.summary) parts.push(job.summary);
                if (job.highlights && Array.isArray(job.highlights)) {
                    parts.push(...job.highlights);
                }
            });
        }

        // Skills
        if (cvData.skills && Array.isArray(cvData.skills)) {
            cvData.skills.forEach((skill: any) => {
                if (skill.name) parts.push(skill.name);
                if (skill.keywords && Array.isArray(skill.keywords)) {
                    parts.push(...skill.keywords);
                }
            });
        }

        // Projects
        if (cvData.projects && Array.isArray(cvData.projects)) {
            cvData.projects.forEach((project: any) => {
                if (project.name) parts.push(project.name);
                if (project.description) parts.push(project.description);
                if (project.keywords && Array.isArray(project.keywords)) {
                    parts.push(...project.keywords);
                }
            });
        }

        // Education
        if (cvData.education && Array.isArray(cvData.education)) {
            cvData.education.forEach((edu: any) => {
                if (edu.area) parts.push(edu.area);
                if (edu.studyType) parts.push(edu.studyType);
                if (edu.courses && Array.isArray(edu.courses)) {
                    parts.push(...edu.courses);
                }
            });
        }

        // Certificates
        if (cvData.certificates && Array.isArray(cvData.certificates)) {
            cvData.certificates.forEach((cert: any) => {
                if (cert.name) parts.push(cert.name);
            });
        }

        return parts.join(' ').toLowerCase();
    }

    /**
     * Build the AI prompt for keyword analysis
     */
    private static buildKeywordAnalysisPrompt(
        cvContent: string,
        jobDescription: string,
        jobTitle?: string,
        company?: string
    ): string {
        return `You are an expert ATS (Applicant Tracking System) analyst and career advisor. Analyze the following job description and compare it against the candidate's CV content to identify missing keywords.

## JOB DETAILS
Job Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}

## JOB DESCRIPTION
${jobDescription}

## CANDIDATE'S CV CONTENT
${cvContent}

## TASK
1. Extract all important keywords/phrases from the job description (skills, tools, technologies, certifications, experiences)
2. Check which keywords are already present in the CV content
3. Identify gaps (keywords in JD but missing from CV)
4. Categorize each gap by importance

## OUTPUT FORMAT
Return a valid JSON object with this exact structure:
{
  "extractedKeywords": [
    {
      "keyword": "Python",
      "category": "skill",
      "frequency": 3,
      "importance": "critical",
      "foundInCV": true
    }
  ],
  "gaps": [
    {
      "keyword": "Kubernetes",
      "category": "tool",
      "frequency": 2,
      "importance": "preferred",
      "suggestion": "Add to Skills section if you have experience",
      "context": "Required for cloud infrastructure management"
    }
  ],
  "matchedKeywords": ["Python", "JavaScript", "React"],
  "matchScore": 72
}

## CATEGORIES
- skill: Technical or soft skills (e.g., "Python", "Leadership")
- tool: Software, platforms, or tools (e.g., "Kubernetes", "Jira")
- certification: Certifications or qualifications (e.g., "AWS Certified", "PMP")
- experience: Experience types (e.g., "5+ years", "team management")
- soft_skill: Interpersonal skills (e.g., "communication", "problem-solving")
- industry: Industry knowledge (e.g., "fintech", "healthcare")

## IMPORTANCE LEVELS
- critical: Required skills/tools mentioned multiple times or explicitly stated as "required"
- preferred: Nice-to-have skills mentioned in requirements
- nice-to-have: Skills mentioned but not emphasized

## RULES
1. Only report gaps for keywords ACTUALLY mentioned in the job description
2. Do NOT hallucinate or invent keywords
3. Match keywords case-insensitively (Python = python)
4. Consider synonyms and related terms (e.g., "JS" matches "JavaScript")
5. matchScore should be 0-100 based on (matched keywords / total important keywords * 100)

Return ONLY the JSON object, no markdown formatting.`;
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
            const extractedKeywords = parsed.extractedKeywords || [];
            const totalJDKeywords = extractedKeywords.length;
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

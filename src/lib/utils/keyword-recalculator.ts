import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { KeywordGap, KeywordGapAnalysisResult } from '@/types/keyword-gap';

/**
 * Escapes regex special characters.
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a keyword matches the CV content text using custom boundaries.
 * Custom boundary checks support special characters like C++, C#, .NET.
 */
export function checkKeywordMatch(text: string, keyword: string): boolean {
    if (!text || !keyword) return false;
    const escaped = escapeRegExp(keyword);
    // Custom word boundary regex to handle C++, C#, .NET correctly
    const pattern = new RegExp(`(?:^|[^a-zA-Z0-9#+.-])${escaped}(?:$|[^a-zA-Z0-9#+.-])`, 'i');
    return pattern.test(text);
}

/**
 * Extracts all text content from a CV in a lowercase string format.
 */
export function extractCVContentText(cvData: UnifiedCVDataStructure): string {
    if (!cvData) return '';
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
 * Recalculates the keyword gap analysis based on updated CV data.
 */
export function recalculateKeywordAnalysis(
    cvData: UnifiedCVDataStructure,
    currentAnalysis: KeywordGapAnalysisResult,
    originalAnalysis?: KeywordGapAnalysisResult | null
): KeywordGapAnalysisResult {
    if (!currentAnalysis) return currentAnalysis;

    const cvText = extractCVContentText(cvData);

    // Get all unique keywords from both current and original analysis to make sure we don't lose any
    const keywordMap = new Map<string, KeywordGap>();
    const originalGaps = originalAnalysis?.gaps || currentAnalysis.gaps || [];
    
    // Store metadata for keywords from original gaps
    originalGaps.forEach(gap => {
        keywordMap.set(gap.keyword.toLowerCase(), { ...gap });
    });

    // Also store metadata from current gaps (in case original is missing or current has edits)
    if (currentAnalysis.gaps) {
        currentAnalysis.gaps.forEach(gap => {
            const key = gap.keyword.toLowerCase();
            if (!keywordMap.has(key)) {
                keywordMap.set(key, { ...gap });
            } else {
                // Merge/keep userConfirmed or dismissed states from current
                const existing = keywordMap.get(key)!;
                keywordMap.set(key, {
                    ...existing,
                    userConfirmed: gap.userConfirmed ?? existing.userConfirmed,
                    dismissed: gap.dismissed ?? existing.dismissed,
                    semanticMatch: gap.semanticMatch ?? existing.semanticMatch,
                });
            }
        });
    }

    // Gather all keywords names
    const allKeywordsSet = new Set<string>();
    currentAnalysis.matchedKeywords.forEach(k => allKeywordsSet.add(k));
    currentAnalysis.gaps.forEach(g => allKeywordsSet.add(g.keyword));
    if (originalAnalysis) {
        originalAnalysis.matchedKeywords.forEach(k => allKeywordsSet.add(k));
        originalAnalysis.gaps.forEach(g => allKeywordsSet.add(g.keyword));
    }

    const matchedKeywords: string[] = [];
    const gaps: KeywordGap[] = [];

    allKeywordsSet.forEach(keywordName => {
        const isMatched = checkKeywordMatch(cvText, keywordName);
        const lowerName = keywordName.toLowerCase();

        if (isMatched) {
            matchedKeywords.push(keywordName);
        } else {
            // It's a gap. Get metadata if exists, otherwise create default.
            let gapObj = keywordMap.get(lowerName);
            if (!gapObj) {
                gapObj = {
                    keyword: keywordName,
                    category: 'skill',
                    frequency: 1,
                    importance: 'preferred',
                    suggestion: `Add "${keywordName}" to your CV`,
                    context: '',
                    userConfirmed: false,
                    dismissed: false
                };
            }
            gaps.push(gapObj);
        }
    });

    // Calculate stats
    const totalJDKeywords = matchedKeywords.length + gaps.length;
    const matchedCount = matchedKeywords.length;
    const gapCount = gaps.length;
    const criticalGaps = gaps.filter(g => g.importance === 'critical').length;
    const preferredGaps = gaps.filter(g => g.importance === 'preferred').length;
    const niceToHaveGaps = gaps.filter(g => g.importance === 'nice-to-have').length;

    // Recalculate match score (matched keywords / total important keywords * 100)
    const matchScore = totalJDKeywords > 0 ? Math.round((matchedCount / totalJDKeywords) * 100) : 0;

    return {
        ...currentAnalysis,
        gaps,
        matchScore,
        matchedKeywords,
        stats: {
            totalJDKeywords,
            matchedCount,
            gapCount,
            criticalGaps,
            preferredGaps,
            niceToHaveGaps
        },
        analyzedAt: new Date()
    };
}

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { normalizeSurgicalFixesToAnnotations, type FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { generateFixSignatureHash } from '@/lib/services/fix-suppression-service';
import type { KeywordGap, KeywordGapAnalysisResult } from '@/types/keyword-gap';

export interface SurgicalFix {
    id: string;
    section: string;
    category?: 'impact' | 'keywords' | 'clarity' | 'formatting' | 'grammar' | 'structure' | 'other';
    severity?: 'low' | 'medium' | 'high';
    fieldPath?: string;
    issue: string;
    original_text: string;
    fixed_text: string;
    impact_score_delta: number;
    status?: 'pending' | 'accepted' | 'rejected';
}

/**
 * CV Type determines the surgeon's behavior:
 * - master: Grammar fixes, STAR method, impact verbs, completeness
 * - standalone: Passive mode, only critical typos
 * - journey: Keyword gap analysis, ATS optimization, JD tailoring
 */
export type SurgeonMode = 'master' | 'standalone' | 'journey';

/**
 * Extended result for mode-specific analysis
 */
export interface SurgeonAnalysisResult {
    score: number;
    fixes: SurgicalFix[];
    annotations: FixAnnotation[];
    mode: SurgeonMode;
    // Journey-specific fields
    keywordGaps?: KeywordGap[];
    keywordGapAnalysis?: KeywordGapAnalysisResult;
    atsScore?: number;
    // Master-specific fields
    cvScore?: number;
    completenessScore?: number;
    impactScore?: number;
}

export interface FixUndoEntry {
    fixId: string;
    fieldPath: string;
    previousValue: string;
    nextValue: string;
    appliedAt: number;
}

type PathToken = string | number;

function parseFieldPath(path: string): PathToken[] {
    const tokens: PathToken[] = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(path)) !== null) {
        if (match[1]) tokens.push(match[1]);
        else if (match[2]) tokens.push(Number(match[2]));
    }
    return tokens;
}

function getAtPath(obj: any, path: PathToken[]): any {
    let cur = obj;
    for (const token of path) {
        if (cur == null) return undefined;
        cur = cur[token as any];
    }
    return cur;
}

function setAtPath(obj: any, path: PathToken[], value: any): boolean {
    if (!obj) return false;
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const token = path[i];
        if (cur[token as any] == null) {
            // Create missing structure
            const nextToken = path[i + 1];
            cur[token as any] = typeof nextToken === 'number' ? [] : {};
        }
        cur = cur[token as any];
    }
    const last = path[path.length - 1];
    cur[last as any] = value;
    return true;
}

function replaceSnippet(source: string, originalText: string, replacementText: string, start: number | null, end: number | null): string | null {
    if (start != null && end != null && start >= 0 && end >= start && end <= source.length) {
        return source.slice(0, start) + replacementText + source.slice(end);
    }
    if (originalText && source.includes(originalText)) {
        return source.replace(originalText, replacementText);
    }
    return null;
}

export class CVSurgeonService {
    /**
     * Generate fix signature hash for a fix
     */
    static generateFixSignatureHash(fix: SurgicalFix): string {
        return generateFixSignatureHash({
            issue: fix.issue,
            fieldPath: fix.fieldPath || fix.section,
            originalText: fix.original_text
        });
    }

    /**
     * Analyze CV with database caching support
     * This is the preferred method - checks cache first to save AI tokens
     * Now includes suppression filtering
     */
    static async analyzeCVWithCache(
        cvData: UnifiedCVDataStructure,
        targetRole: string,
        seniorityLevel: string,
        cvId?: string,
        userId?: string,
        jobData?: any,
        suppressedFixHashes?: string[],
        cvType?: SurgeonMode
    ): Promise<{ score: number; fixes: SurgicalFix[]; annotations: FixAnnotation[]; cached: boolean; suppressedCount: number }> {
        // Load suppressed fixes from API if not provided
        let suppressedHashes = suppressedFixHashes || [];
        if (cvId && userId && !suppressedFixHashes) {
            try {
                const suppressedResponse = await fetch(`/api/cvs/${cvId}/suppressed-fixes`);
                if (suppressedResponse.ok) {
                    const suppressedData = await suppressedResponse.json();
                    suppressedHashes = suppressedData.suppressedFixHashes || [];
                }
            } catch (error) {
                console.warn('⚠️ CVSurgeonService - Failed to load suppressed fixes:', error);
            }
        }

        // If we have cvId and userId, try to get cached analysis first
        if (cvId && userId) {
            try {
                const cacheUrl = new URL(`/api/cvs/${cvId}/surgeon-analysis`, window.location.origin);
                cacheUrl.searchParams.set('userId', userId);
                cacheUrl.searchParams.set('targetRole', targetRole);
                cacheUrl.searchParams.set('seniorityLevel', seniorityLevel);
                if (jobData) {
                    cacheUrl.searchParams.set('jobData', JSON.stringify(jobData));
                }

                const cacheResponse = await fetch(cacheUrl.toString());
                const cacheResult = await cacheResponse.json();

                if (cacheResult.success && cacheResult.cached && cacheResult.analysis) {
                    console.log('✅ CVSurgeonService - Using cached analysis from database');
                    // Filter suppressed fixes
                    const fixes = (cacheResult.analysis.fixes || []).filter((fix: SurgicalFix) => {
                        const hash = this.generateFixSignatureHash(fix);
                        return !suppressedHashes.includes(hash);
                    });
                    
                    // Regenerate annotations with filtered fixes
                    const annotations = normalizeSurgicalFixesToAnnotations(cvData, fixes);
                    
                    return {
                        score: cacheResult.analysis.score,
                        fixes,
                        annotations,
                        cached: true,
                        suppressedCount: (cacheResult.analysis.fixes || []).length - fixes.length
                    };
                }
                console.log('🔄 CVSurgeonService - Cache miss or invalid, running new analysis');
            } catch (cacheError) {
                console.warn('⚠️ CVSurgeonService - Failed to check cache, proceeding with fresh analysis:', cacheError);
            }
        }

        // Run fresh analysis - use mode-specific analysis if cvType is provided
        const analysisResult = cvType 
            ? await this.analyzeCVByMode(cvData, targetRole, seniorityLevel, cvType, jobData)
            : await this.analyzeCV(cvData, targetRole, seniorityLevel, jobData);

        // Extract score, fixes, and annotations from result (handles both regular and SurgeonAnalysisResult)
        const result = {
            score: analysisResult.score,
            fixes: analysisResult.fixes,
            annotations: analysisResult.annotations
        };

        // Filter suppressed fixes
        const filteredFixes = result.fixes.filter((fix) => {
            const hash = this.generateFixSignatureHash(fix);
            return !suppressedHashes.includes(hash);
        });
        
        // Regenerate annotations with filtered fixes
        const filteredAnnotations = normalizeSurgicalFixesToAnnotations(cvData, filteredFixes);
        
        const suppressedCount = result.fixes.length - filteredFixes.length;

        // Save to cache if we have cvId and userId (save all fixes, filtering happens on read)
        // This saves AI tokens by caching the analysis
        if (cvId && userId) {
            try {
                await fetch(`/api/cvs/${cvId}/surgeon-analysis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        score: result.score,
                        fixes: result.fixes, // Save all fixes, filtering happens on read
                        annotations: result.annotations,
                        targetRole,
                        seniorityLevel,
                        jobData
                    })
                });
                console.log('✅ CVSurgeonService - Analysis saved to database cache (saves AI tokens on next run)');
            } catch (saveError) {
                console.warn('⚠️ CVSurgeonService - Failed to save analysis to cache:', saveError);
            }
        }

        return {
            score: result.score,
            fixes: filteredFixes,
            annotations: filteredAnnotations,
            cached: false,
            suppressedCount
        };
    }

    /**
     * Mode-specific CV analysis entry point
     * Routes to appropriate analysis method based on CV type
     */
    static async analyzeCVByMode(
        cvData: UnifiedCVDataStructure,
        targetRole: string,
        seniorityLevel: string,
        cvType: SurgeonMode = 'standalone',
        jobData?: any
    ): Promise<SurgeonAnalysisResult> {
        switch (cvType) {
            case 'master':
                return this.analyzeMasterCV(cvData, targetRole, seniorityLevel);
            case 'journey':
                return this.analyzeJourneyCV(cvData, targetRole, seniorityLevel, jobData);
            case 'standalone':
            default:
                return this.analyzeStandaloneCV(cvData);
        }
    }

    /**
     * Master CV Mode Analysis
     * Focus: Grammar, STAR method, impact verbs, completeness, formatting
     */
    static async analyzeMasterCV(
        cvData: UnifiedCVDataStructure,
        targetRole: string,
        seniorityLevel: string
    ): Promise<SurgeonAnalysisResult> {
        // Use full analysis with grammar and STAR focus
        const result = await this.analyzeCV(cvData, targetRole, seniorityLevel);
        
        // For master CVs, include grammar, formatting, impact, structure, and clarity fixes
        // Don't filter too aggressively - include all relevant categories
        const masterFixes = result.fixes.filter(fix => {
            const category = (fix.category || 'other').toLowerCase();
            return [
                'grammar', 
                'formatting', 
                'format',
                'impact', 
                'structure', 
                'clarity',
                'keywords', // Include keyword improvements for master CV
                'style' // Include style improvements
            ].includes(category);
        });
        
        // If no grammar/format fixes found, ensure we still return other relevant fixes
        // This prevents empty results when AI doesn't categorize fixes correctly
        const finalFixes = masterFixes.length > 0 ? masterFixes : result.fixes.filter(fix => 
            fix.severity === 'high' || ['grammar', 'formatting', 'impact', 'structure'].includes((fix.category || 'other').toLowerCase())
        );
        
        // Calculate completeness score
        const completenessScore = this.calculateCompletenessScore(cvData);
        const impactScore = this.calculateImpactScore(cvData);
        
        return {
            ...result,
            fixes: finalFixes,
            annotations: normalizeSurgicalFixesToAnnotations(cvData, finalFixes),
            mode: 'master',
            cvScore: result.score,
            completenessScore,
            impactScore
        };
    }

    /**
     * Standalone CV Mode Analysis
     * Focus: Passive mode, only flag critical errors (typos)
     */
    static async analyzeStandaloneCV(
        cvData: UnifiedCVDataStructure
    ): Promise<SurgeonAnalysisResult> {
        // Minimal analysis - only critical grammar/spelling issues
        const result = await this.analyzeCV(cvData, '', '');
        
        // Filter to only high-severity grammar issues
        const standaloneFixes = result.fixes.filter(fix => 
            fix.category === 'grammar' && fix.severity === 'high'
        );
        
        return {
            ...result,
            fixes: standaloneFixes,
            annotations: normalizeSurgicalFixesToAnnotations(cvData, standaloneFixes),
            mode: 'standalone',
            cvScore: result.score
        };
    }

    /**
     * Journey CV Mode Analysis
     * Focus: Keyword gap analysis, ATS optimization, JD tailoring
     * NOTE: Does NOT auto-add keywords - only reports gaps
     */
    static async analyzeJourneyCV(
        cvData: UnifiedCVDataStructure,
        targetRole: string,
        seniorityLevel: string,
        jobData?: any
    ): Promise<SurgeonAnalysisResult> {
        // Get base analysis
        const result = await this.analyzeCV(cvData, targetRole, seniorityLevel, jobData);
        
        // Run keyword gap analysis
        let keywordGapAnalysis: KeywordGapAnalysisResult | undefined;
        let keywordGaps: KeywordGap[] = [];
        let atsScore = result.score;
        
        if (jobData?.jobDescription || jobData?.description) {
            try {
                const gapResult = await this.runKeywordGapAnalysis(
                    cvData, 
                    jobData.jobDescription || jobData.description,
                    jobData.title || jobData.jobTitle || targetRole,
                    jobData.company
                );
                keywordGapAnalysis = gapResult;
                keywordGaps = gapResult.gaps;
                atsScore = gapResult.matchScore;
            } catch (error) {
                console.warn('⚠️ CVSurgeonService - Keyword gap analysis failed:', error);
            }
        }
        
        // Filter fixes to keyword-related ones for journey mode
        const journeyFixes = result.fixes.filter(fix => 
            ['keywords', 'impact', 'clarity'].includes(fix.category || 'other')
        );
        
        return {
            ...result,
            fixes: journeyFixes,
            annotations: normalizeSurgicalFixesToAnnotations(cvData, journeyFixes),
            mode: 'journey',
            keywordGaps,
            keywordGapAnalysis,
            atsScore
        };
    }

    /**
     * Run keyword gap analysis between CV and JD
     * Returns gaps but does NOT auto-add keywords (prevents hallucination)
     */
    static async runKeywordGapAnalysis(
        cvData: UnifiedCVDataStructure,
        jobDescription: string,
        jobTitle?: string,
        company?: string
    ): Promise<KeywordGapAnalysisResult> {
        try {
            const response = await fetch('/api/ai/keyword-gap-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cvData,
                    jobDescription,
                    jobTitle,
                    company
                })
            });

            if (!response.ok) {
                throw new Error(`Keyword gap analysis failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data;
            }
            
            throw new Error(result.error || 'Unknown error in keyword gap analysis');
        } catch (error) {
            console.error('CVSurgeonService.runKeywordGapAnalysis error:', error);
            // Return empty result on failure
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
                jdContentHash: ''
            };
        }
    }

    /**
     * Calculate CV completeness score (for Master/Standalone modes)
     */
    static calculateCompletenessScore(cvData: UnifiedCVDataStructure): number {
        let score = 0;
        const maxScore = 100;
        
        // Basic info (25 points)
        if (cvData.basics?.name) score += 5;
        if (cvData.basics?.email) score += 5;
        if (cvData.basics?.phone) score += 3;
        if (cvData.basics?.location) score += 3;
        if (cvData.basics?.summary && cvData.basics.summary.length > 50) score += 9;
        
        // Work experience (25 points)
        if (cvData.work && cvData.work.length > 0) {
            score += 10;
            const hasDescriptions = cvData.work.some((w: any) => 
                w.highlights?.length > 0 || w.summary
            );
            if (hasDescriptions) score += 15;
        }
        
        // Education (15 points)
        if (cvData.education && cvData.education.length > 0) score += 15;
        
        // Skills (20 points)
        if (cvData.skills && cvData.skills.length > 0) {
            score += 10;
            if (cvData.skills.length >= 5) score += 10;
        }
        
        // Projects (10 points)
        if (cvData.projects && cvData.projects.length > 0) score += 10;
        
        // Certificates (5 points)
        if (cvData.certificates && cvData.certificates.length > 0) score += 5;
        
        return Math.min(score, maxScore);
    }

    /**
     * Calculate impact score based on action verbs and quantification
     */
    static calculateImpactScore(cvData: UnifiedCVDataStructure): number {
        const impactVerbs = [
            'led', 'managed', 'developed', 'created', 'implemented', 'improved',
            'increased', 'reduced', 'optimized', 'designed', 'built', 'established',
            'coordinated', 'supervised', 'analyzed', 'resolved', 'delivered',
            'achieved', 'generated', 'streamlined', 'spearheaded', 'orchestrated'
        ];
        
        const quantifiers = /\d+%|\$[\d,]+|\d+[xX]|\d+\s*(million|billion|thousand|users|customers|projects|teams?)/gi;
        
        let verbCount = 0;
        let quantCount = 0;
        let totalBullets = 0;
        
        // Check work experience
        if (cvData.work) {
            cvData.work.forEach((job: any) => {
                if (job.highlights) {
                    job.highlights.forEach((highlight: string) => {
                        totalBullets++;
                        const lowerHighlight = highlight.toLowerCase();
                        impactVerbs.forEach(verb => {
                            if (lowerHighlight.startsWith(verb) || lowerHighlight.includes(` ${verb} `)) {
                                verbCount++;
                            }
                        });
                        const matches = highlight.match(quantifiers);
                        if (matches) quantCount += matches.length;
                    });
                }
            });
        }
        
        // Check projects
        if (cvData.projects) {
            cvData.projects.forEach((project: any) => {
                if (project.description) {
                    totalBullets++;
                    const matches = project.description.match(quantifiers);
                    if (matches) quantCount += matches.length;
                }
            });
        }
        
        if (totalBullets === 0) return 50; // Default score if no content
        
        // Score: 50% from verbs, 50% from quantification
        const verbScore = Math.min((verbCount / totalBullets) * 100, 50);
        const quantScore = Math.min((quantCount / totalBullets) * 100, 50);
        
        return Math.round(verbScore + quantScore);
    }

    /**
     * Analyze CV and generate surgical fixes (direct AI call, no caching)
     * Use analyzeCVWithCache() for production to save AI tokens
     */
    static async analyzeCV(
        cvData: UnifiedCVDataStructure,
        targetRole: string,
        seniorityLevel: string,
        jobData?: any
    ): Promise<{ score: number; fixes: SurgicalFix[]; annotations: FixAnnotation[] }> {
        try {
            const response = await fetch('/api/ai/cv-surgeon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cvData,
                    targetRole,
                    seniorityLevel,
                    jobData
                })
            });

            if (!response.ok) {
                const raw = await response.text().catch(() => '');
                let message = `CV Surgeon analysis failed (${response.status})`;
                try {
                    const parsed = raw ? JSON.parse(raw) : null;
                    message = parsed?.error || parsed?.message || message;
                } catch {
                    // ignore
                }
                throw new Error(message);
            }

            const result = await response.json();

            if (result.success) {
                const fixes: SurgicalFix[] = result.fixes || [];
                // Generate fixSignatureHash for each fix
                const fixesWithHash = fixes.map(fix => ({
                    ...fix,
                    // Hash will be generated when needed, but we can pre-compute it
                }));
                
                return {
                    score: result.score || 0,
                    fixes: fixesWithHash,
                    // Normalize immediately so UI can use report/overlay features even before backend is upgraded
                    annotations: (result.annotations && Array.isArray(result.annotations))
                        ? (result.annotations as FixAnnotation[]).map(ann => ({
                            ...ann,
                            fixSignatureHash: ann.fixSignatureHash || this.generateFixSignatureHash({
                                id: ann.id,
                                issue: ann.issue,
                                original_text: ann.originalText,
                                fixed_text: ann.replacementText,
                                fieldPath: ann.fieldPath,
                                section: ann.fieldPath
                            } as SurgicalFix)
                        }))
                        : normalizeSurgicalFixesToAnnotations(cvData, fixesWithHash).map(ann => ({
                            ...ann,
                            fixSignatureHash: ann.fixSignatureHash || this.generateFixSignatureHash({
                                id: ann.id,
                                issue: ann.issue,
                                original_text: ann.originalText,
                                fixed_text: ann.replacementText,
                                fieldPath: ann.fieldPath,
                                section: ann.fieldPath
                            } as SurgicalFix)
                        }))
                };
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('CVSurgeonService.analyzeCV error:', error);
            throw error;
        }
    }

    /**
     * Clear cached analysis for a CV (useful after major edits)
     */
    static async clearAnalysisCache(cvId: string, userId: string): Promise<void> {
        try {
            const url = new URL(`/api/cvs/${cvId}/surgeon-analysis`, window.location.origin);
            url.searchParams.set('userId', userId);
            await fetch(url.toString(), { method: 'DELETE' });
            console.log('✅ CVSurgeonService - Analysis cache cleared');
        } catch (error) {
            console.warn('⚠️ CVSurgeonService - Failed to clear cache:', error);
        }
    }

    /**
     * Apply a FixAnnotation deterministically via fieldPath + snippet span.
     * Returns updated CV and an undo entry for this action.
     */
    static applyFixAnnotation(
        cvData: UnifiedCVDataStructure,
        fix: FixAnnotation
    ): { updatedCV: UnifiedCVDataStructure; undo: FixUndoEntry | null } {
        const updatedCV: any = JSON.parse(JSON.stringify(cvData));
        const tokens = parseFieldPath(fix.fieldPath);
        const current = getAtPath(updatedCV, tokens);
        
        // SPECIAL HANDLING: Skills fixes with JSON replacement text
        const isSkillsFix = fix.fieldPath.includes('skills') || fix.category === 'keywords';
        if (isSkillsFix && fix.replacementText) {
            // Check if replacementText is JSON (starts with [ or {)
            const trimmedReplacement = fix.replacementText.trim();
            if ((trimmedReplacement.startsWith('[') || trimmedReplacement.startsWith('{')) && typeof current === 'string') {
                try {
                    // Try to parse the JSON
                    const parsedSkills = JSON.parse(trimmedReplacement);
                    
                    // If it's an array of skill objects with category and skills
                    if (Array.isArray(parsedSkills) && parsedSkills.length > 0 && parsedSkills[0].category && parsedSkills[0].skills) {
                        // Merge into existing skills array structure
                        const existingSkills = updatedCV.skills || [];
                        const mergedSkills = [...existingSkills];
                        
                        parsedSkills.forEach((newCategory: any) => {
                            const existingCategoryIndex = mergedSkills.findIndex(
                                (s: any) => s.category === newCategory.category || s.name === newCategory.category
                            );
                            
                            if (existingCategoryIndex >= 0) {
                                // Merge skills into existing category
                                const existingCategory = mergedSkills[existingCategoryIndex];
                                const existingSkillList = Array.isArray(existingCategory.skills) 
                                    ? existingCategory.skills 
                                    : (Array.isArray(existingCategory.items) ? existingCategory.items : []);
                                const newSkillList = Array.isArray(newCategory.skills) ? newCategory.skills : [];
                                
                                // Combine and deduplicate
                                const combined = [...existingSkillList, ...newSkillList];
                                const unique = Array.from(new Set(combined.map((s: any) => String(s))));
                                
                                mergedSkills[existingCategoryIndex] = {
                                    ...existingCategory,
                                    skills: unique,
                                    category: newCategory.category
                                };
                            } else {
                                // Add new category
                                mergedSkills.push({
                                    category: newCategory.category,
                                    skills: Array.isArray(newCategory.skills) ? newCategory.skills : []
                                });
                            }
                        });
                        
                        updatedCV.skills = mergedSkills;
                        
                        return {
                            updatedCV,
                            undo: {
                                fixId: fix.id,
                                fieldPath: 'skills',
                                previousValue: JSON.stringify(existingSkills),
                                nextValue: JSON.stringify(mergedSkills),
                                appliedAt: Date.now()
                            }
                        };
                    }
                } catch (parseError) {
                    console.warn('⚠️ Failed to parse skills JSON, falling back to string replacement:', parseError);
                    // Fall through to normal string replacement
                }
            }
        }
        
        if (typeof current !== 'string') {
            return { updatedCV, undo: null };
        }

        const next = replaceSnippet(
            current,
            fix.originalText,
            fix.replacementText,
            fix.match?.start ?? null,
            fix.match?.end ?? null
        );

        if (next == null) {
            // As a fallback, only replace whole field if caller indicates field-level strategy
            if (fix.match?.matchStrategy === 'field' && fix.replacementText) {
                setAtPath(updatedCV, tokens, fix.replacementText);
                return {
                    updatedCV,
                    undo: {
                        fixId: fix.id,
                        fieldPath: fix.fieldPath,
                        previousValue: current,
                        nextValue: fix.replacementText,
                        appliedAt: Date.now()
                    }
                };
            }
            return { updatedCV, undo: null };
        }

        setAtPath(updatedCV, tokens, next);
        return {
            updatedCV,
            undo: {
                fixId: fix.id,
                fieldPath: fix.fieldPath,
                previousValue: current,
                nextValue: next,
                appliedAt: Date.now()
            }
        };
    }

    /**
     * Convenience: apply fix and maintain an undo stack (last N).
     */
    static applyFixWithUndoStack(
        cvData: UnifiedCVDataStructure,
        fix: FixAnnotation,
        undoStack: FixUndoEntry[],
        maxDepth = 20
    ): { updatedCV: UnifiedCVDataStructure; undoStack: FixUndoEntry[] } {
        const { updatedCV, undo } = this.applyFixAnnotation(cvData, fix);
        if (!undo) return { updatedCV, undoStack };
        const nextStack = [undo, ...(undoStack || [])].slice(0, maxDepth);
        return { updatedCV, undoStack: nextStack };
    }

    /**
     * Undo a single applied fix (pure, does not validate current value).
     */
    static applyUndoEntry(
        cvData: UnifiedCVDataStructure,
        entry: FixUndoEntry
    ): UnifiedCVDataStructure {
        const updatedCV: any = JSON.parse(JSON.stringify(cvData));
        const tokens = parseFieldPath(entry.fieldPath);
        setAtPath(updatedCV, tokens, entry.previousValue);
        return updatedCV;
    }

    /**
     * Apply a surgical fix to CV data
     */
    static applySurgicalFix(
        cvData: UnifiedCVDataStructure,
        fix: SurgicalFix
    ): UnifiedCVDataStructure {
        // Create a deep copy
        const updatedCV = JSON.parse(JSON.stringify(cvData));

        // Prefer deterministic application via fieldPath when available (new format)
        if (fix.fieldPath) {
            const tokens = parseFieldPath(fix.fieldPath);
            const current = getAtPath(updatedCV, tokens);
            if (typeof current === 'string') {
                const next = replaceSnippet(current, fix.original_text, fix.fixed_text, null, null);
                if (next != null) {
                    setAtPath(updatedCV, tokens, next);
                    return updatedCV;
                }
                // If the fix intends to replace the whole field, allow it as fallback
                if (fix.fixed_text) {
                    setAtPath(updatedCV, tokens, fix.fixed_text);
                    return updatedCV;
                }
            }
        }

        // Apply fix based on section
        switch (fix.section.toLowerCase()) {
            case 'summary':
            case 'professional summary':
                if (updatedCV.basics) {
                    updatedCV.basics.summary = fix.fixed_text;
                }
                break;

            case 'work experience':
            case 'experience':
                // Find and replace in work array
                if (updatedCV.work) {
                    updatedCV.work = updatedCV.work.map((job: any) => {
                        const jobText = JSON.stringify(job);
                        if (jobText.includes(fix.original_text)) {
                            // Replace in highlights/description
                            if (job.highlights) {
                                job.highlights = job.highlights.map((h: string) =>
                                    h.includes(fix.original_text) ? h.replace(fix.original_text, fix.fixed_text) : h
                                );
                            }
                            if (job.summary && job.summary.includes(fix.original_text)) {
                                job.summary = job.summary.replace(fix.original_text, fix.fixed_text);
                            }
                        }
                        return job;
                    });
                }
                break;

            case 'skills':
                // Update skills section
                if (updatedCV.skills) {
                    updatedCV.skills = updatedCV.skills.map((skill: any) => {
                        if (skill.name === fix.original_text) {
                            return { ...skill, name: fix.fixed_text };
                        }
                        return skill;
                    });
                }
                break;

            case 'education':
                if (updatedCV.education) {
                    updatedCV.education = updatedCV.education.map((edu: any) => {
                        const eduText = JSON.stringify(edu);
                        if (eduText.includes(fix.original_text)) {
                            if (edu.courses) {
                                edu.courses = edu.courses.map((c: string) =>
                                    c.includes(fix.original_text) ? c.replace(fix.original_text, fix.fixed_text) : c
                                );
                            }
                            if (edu.notes && edu.notes.includes(fix.original_text)) {
                                edu.notes = edu.notes.replace(fix.original_text, fix.fixed_text);
                            }
                        }
                        return edu;
                    });
                }
                break;

            case 'projects':
                if (updatedCV.projects) {
                    updatedCV.projects = updatedCV.projects.map((project: any) => {
                        if (project.description && project.description.includes(fix.original_text)) {
                            project.description = project.description.replace(fix.original_text, fix.fixed_text);
                        }
                        if (project.highlights) {
                            project.highlights = project.highlights.map((h: string) =>
                                h.includes(fix.original_text) ? h.replace(fix.original_text, fix.fixed_text) : h
                            );
                        }
                        return project;
                    });
                }
                break;

            default:
                console.warn(`Unknown section for surgical fix: ${fix.section}`);
        }

        return updatedCV;
    }

    /**
     * Apply multiple fixes at once
     */
    static applyMultipleFixes(
        cvData: UnifiedCVDataStructure,
        fixes: SurgicalFix[]
    ): UnifiedCVDataStructure {
        let updatedCV = cvData;

        for (const fix of fixes) {
            updatedCV = this.applySurgicalFix(updatedCV, fix);
        }

        return updatedCV;
    }
}

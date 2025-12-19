import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { normalizeSurgicalFixesToAnnotations, type FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

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
     * Analyze CV with database caching support
     * This is the preferred method - checks cache first to save AI tokens
     */
    static async analyzeCVWithCache(
        cvData: UnifiedCVDataStructure,
        targetRole: string,
        seniorityLevel: string,
        cvId?: string,
        userId?: string,
        jobData?: any
    ): Promise<{ score: number; fixes: SurgicalFix[]; annotations: FixAnnotation[]; cached: boolean }> {
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
                    return {
                        score: cacheResult.analysis.score,
                        fixes: cacheResult.analysis.fixes || [],
                        annotations: cacheResult.analysis.annotations || [],
                        cached: true
                    };
                }
                console.log('🔄 CVSurgeonService - Cache miss or invalid, running new analysis');
            } catch (cacheError) {
                console.warn('⚠️ CVSurgeonService - Failed to check cache, proceeding with fresh analysis:', cacheError);
            }
        }

        // Run fresh analysis
        const result = await this.analyzeCV(cvData, targetRole, seniorityLevel, jobData);

        // Save to cache if we have cvId and userId
        if (cvId && userId) {
            try {
                await fetch(`/api/cvs/${cvId}/surgeon-analysis`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        score: result.score,
                        fixes: result.fixes,
                        annotations: result.annotations,
                        targetRole,
                        seniorityLevel,
                        jobData
                    })
                });
                console.log('✅ CVSurgeonService - Analysis saved to database cache');
            } catch (saveError) {
                console.warn('⚠️ CVSurgeonService - Failed to save analysis to cache:', saveError);
            }
        }

        return { ...result, cached: false };
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
                return {
                    score: result.score || 0,
                    fixes,
                    // Normalize immediately so UI can use report/overlay features even before backend is upgraded
                    annotations: (result.annotations && Array.isArray(result.annotations))
                        ? (result.annotations as FixAnnotation[])
                        : normalizeSurgicalFixesToAnnotations(cvData, fixes)
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

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { SurgicalFix } from '@/lib/services/cv-surgeon-service';

/**
 * Map surgical fixes to CV data structure locations
 * This provides precise targeting for where fixes should be applied
 */
export interface FixLocation {
    section: string;
    arrayIndex?: number;
    field?: string;
    subField?: string;
}

/**
 * Parse a surgical fix and determine its exact location in the CV
 */
export function locateFix(
    cvData: UnifiedCVDataStructure,
    fix: SurgicalFix
): FixLocation | null {
    const section = fix.section.toLowerCase();

    // Summary/Basics
    if (section.includes('summary') || section.includes('professional summary')) {
        return {
            section: 'basics',
            field: 'summary'
        };
    }

    // Work Experience
    if (section.includes('work') || section.includes('experience')) {
        const workIndex = findInArray(cvData.work || [], fix.original_text);
        if (workIndex !== -1) {
            return {
                section: 'work',
                arrayIndex: workIndex
            };
        }
    }

    // Education
    if (section.includes('education')) {
        const eduIndex = findInArray(cvData.education || [], fix.original_text);
        if (eduIndex !== -1) {
            return {
                section: 'education',
                arrayIndex: eduIndex
            };
        }
    }

    // Projects
    if (section.includes('project')) {
        const projectIndex = findInArray(cvData.projects || [], fix.original_text);
        if (projectIndex !== -1) {
            return {
                section: 'projects',
                arrayIndex: projectIndex
            };
        }
    }

    // Skills
    if (section.includes('skill')) {
        return {
            section: 'skills'
        };
    }

    return null;
}

/**
 * Find text in an array of objects
 */
function findInArray(array: any[], searchText: string): number {
    return array.findIndex(item => {
        const itemText = JSON.stringify(item);
        return itemText.includes(searchText);
    });
}

/**
 * Apply a surgical fix with precise location targeting
 */
export function applyFixWithLocation(
    cvData: UnifiedCVDataStructure,
    fix: SurgicalFix,
    location: FixLocation
): UnifiedCVDataStructure {
    const updatedCV = JSON.parse(JSON.stringify(cvData));

    switch (location.section) {
        case 'basics':
            if (location.field === 'summary' && updatedCV.basics) {
                updatedCV.basics.summary = fix.fixed_text;
            }
            break;

        case 'work':
            if (location.arrayIndex !== undefined && updatedCV.work?.[location.arrayIndex]) {
                const work = updatedCV.work[location.arrayIndex];

                // Replace in highlights
                if (work.highlights) {
                    work.highlights = work.highlights.map((h: string) =>
                        h.includes(fix.original_text) ? h.replace(fix.original_text, fix.fixed_text) : h
                    );
                }

                // Replace in summary/description
                if (work.summary && work.summary.includes(fix.original_text)) {
                    work.summary = work.summary.replace(fix.original_text, fix.fixed_text);
                }
            }
            break;

        case 'education':
            if (location.arrayIndex !== undefined && updatedCV.education?.[location.arrayIndex]) {
                const edu = updatedCV.education[location.arrayIndex];

                if (edu.courses) {
                    edu.courses = edu.courses.map((c: string) =>
                        c.includes(fix.original_text) ? c.replace(fix.original_text, fix.fixed_text) : c
                    );
                }

                if (edu.notes && edu.notes.includes(fix.original_text)) {
                    edu.notes = edu.notes.replace(fix.original_text, fix.fixed_text);
                }
            }
            break;

        case 'projects':
            if (location.arrayIndex !== undefined && updatedCV.projects?.[location.arrayIndex]) {
                const project = updatedCV.projects[location.arrayIndex];

                if (project.description && project.description.includes(fix.original_text)) {
                    project.description = project.description.replace(fix.original_text, fix.fixed_text);
                }

                if (project.highlights) {
                    project.highlights = project.highlights.map((h: string) =>
                        h.includes(fix.original_text) ? h.replace(fix.original_text, fix.fixed_text) : h
                    );
                }
            }
            break;

        case 'skills':
            if (updatedCV.skills) {
                updatedCV.skills = updatedCV.skills.map((skill: any) => {
                    if (skill.name === fix.original_text) {
                        return { ...skill, name: fix.fixed_text };
                    }
                    return skill;
                });
            }
            break;
    }

    return updatedCV;
}

/**
 * Create an undo operation for a fix
 */
export function createUndoFix(fix: SurgicalFix): SurgicalFix {
    return {
        ...fix,
        id: `undo-${fix.id}`,
        original_text: fix.fixed_text,
        fixed_text: fix.original_text,
        impact_score_delta: -fix.impact_score_delta
    };
}

/**
 * Batch apply multiple fixes
 */
export function batchApplyFixes(
    cvData: UnifiedCVDataStructure,
    fixes: SurgicalFix[]
): UnifiedCVDataStructure {
    let updatedCV = cvData;

    for (const fix of fixes) {
        const location = locateFix(updatedCV, fix);
        if (location) {
            updatedCV = applyFixWithLocation(updatedCV, fix, location);
        } else {
            console.warn(`Could not locate fix: ${fix.id}`);
        }
    }

    return updatedCV;
}

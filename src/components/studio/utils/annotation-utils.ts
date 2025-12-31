/**
 * Studio Annotation Utilities
 * 
 * Converts standard FixAnnotations to StudioAnnotations with pillar mapping,
 * color coding, and section identification.
 */

import type { FixAnnotation, FixCategory } from '@/components/resume-enhancer/annotations/fix-annotation';
import type { StudioAnnotation, ATSPillar } from '@/types/studio';
import { PILLAR_COLORS } from '@/types/studio';

// ============================================================================
// Category to Pillar Mapping
// ============================================================================

/**
 * Maps fix categories to ATS pillars
 */
export function categoryToPillar(category: FixCategory): ATSPillar {
    switch (category) {
        case 'impact':
            return 'impactVerbs';
        case 'keywords':
            return 'quantification'; // Keywords often relate to measurable skills
        case 'clarity':
            return 'readability';
        case 'formatting':
            return 'formatting';
        case 'grammar':
            return 'readability';
        case 'structure':
            return 'completeness';
        case 'other':
        default:
            return 'completeness';
    }
}

// ============================================================================
// Section Identification
// ============================================================================

/**
 * Extracts section ID from a field path
 * e.g., "work[0].highlights[1]" -> "work"
 * e.g., "basics.summary" -> "personal"
 * e.g., "skills[0].skills[0]" -> "skills"
 */
export function fieldPathToSection(fieldPath: string): string {
    if (!fieldPath) return 'personal';

    // Handle basics section -> maps to personal
    if (fieldPath.startsWith('basics')) {
        return 'personal';
    }

    // Extract the first segment
    const firstDot = fieldPath.indexOf('.');
    const firstBracket = fieldPath.indexOf('[');

    let section: string;
    if (firstDot === -1 && firstBracket === -1) {
        section = fieldPath;
    } else if (firstDot === -1) {
        section = fieldPath.substring(0, firstBracket);
    } else if (firstBracket === -1) {
        section = fieldPath.substring(0, firstDot);
    } else {
        section = fieldPath.substring(0, Math.min(firstDot, firstBracket));
    }

    // Normalize section names
    const sectionMap: Record<string, string> = {
        'work': 'work',
        'education': 'education',
        'skills': 'skills',
        'projects': 'projects',
        'certificates': 'certificates',
        'languages': 'languages',
        'volunteer': 'volunteer',
        'basics': 'personal',
        'awards': 'certificates',
        'publications': 'projects',
        'references': 'personal',
    };

    return sectionMap[section] || 'personal';
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Converts a FixAnnotation to a StudioAnnotation
 */
export function toStudioAnnotation(fix: FixAnnotation): StudioAnnotation {
    const pillar = categoryToPillar(fix.category);
    const { color, style } = PILLAR_COLORS[pillar];
    const sectionId = fieldPathToSection(fix.fieldPath);

    return {
        ...fix,
        pillar,
        sectionId,
        underlineColor: color,
        underlineStyle: style,
    };
}

/**
 * Converts an array of FixAnnotations to StudioAnnotations
 */
export function toStudioAnnotations(fixes: FixAnnotation[]): StudioAnnotation[] {
    return (fixes || []).map(toStudioAnnotation);
}

// ============================================================================
// Grouping Utilities
// ============================================================================

/**
 * Groups annotations by section
 */
export function groupBySection(annotations: StudioAnnotation[]): Record<string, StudioAnnotation[]> {
    return annotations.reduce((acc, annotation) => {
        const section = annotation.sectionId;
        if (!acc[section]) {
            acc[section] = [];
        }
        acc[section].push(annotation);
        return acc;
    }, {} as Record<string, StudioAnnotation[]>);
}

/**
 * Groups annotations by pillar
 */
export function groupByPillar(annotations: StudioAnnotation[]): Record<ATSPillar, StudioAnnotation[]> {
    const result: Record<ATSPillar, StudioAnnotation[]> = {
        completeness: [],
        impactVerbs: [],
        quantification: [],
        formatting: [],
        readability: [],
    };

    annotations.forEach(annotation => {
        result[annotation.pillar].push(annotation);
    });

    return result;
}

// ============================================================================
// Filtering Utilities
// ============================================================================

/**
 * Filters annotations to only open ones
 */
export function getOpenAnnotations(annotations: StudioAnnotation[]): StudioAnnotation[] {
    return annotations.filter(a => a.status === 'open');
}

/**
 * Filters annotations by section
 */
export function getAnnotationsBySection(
    annotations: StudioAnnotation[],
    sectionId: string
): StudioAnnotation[] {
    return annotations.filter(a => a.sectionId === sectionId);
}

/**
 * Filters annotations by pillar
 */
export function getAnnotationsByPillar(
    annotations: StudioAnnotation[],
    pillar: ATSPillar
): StudioAnnotation[] {
    return annotations.filter(a => a.pillar === pillar);
}

// ============================================================================
// Statistics
// ============================================================================

export interface AnnotationStats {
    total: number;
    open: number;
    applied: number;
    dismissed: number;
    byPillar: Record<ATSPillar, number>;
    bySection: Record<string, number>;
    bySeverity: Record<'low' | 'medium' | 'high', number>;
}

/**
 * Calculates statistics for annotations
 */
export function calculateAnnotationStats(annotations: StudioAnnotation[]): AnnotationStats {
    const stats: AnnotationStats = {
        total: annotations.length,
        open: 0,
        applied: 0,
        dismissed: 0,
        byPillar: {
            completeness: 0,
            impactVerbs: 0,
            quantification: 0,
            formatting: 0,
            readability: 0,
        },
        bySection: {},
        bySeverity: {
            low: 0,
            medium: 0,
            high: 0,
        },
    };

    annotations.forEach(annotation => {
        // Status counts
        if (annotation.status === 'open') stats.open++;
        else if (annotation.status === 'applied') stats.applied++;
        else if (annotation.status === 'dismissed') stats.dismissed++;

        // Pillar counts
        stats.byPillar[annotation.pillar]++;

        // Section counts
        const section = annotation.sectionId;
        stats.bySection[section] = (stats.bySection[section] || 0) + 1;

        // Severity counts
        stats.bySeverity[annotation.severity]++;
    });

    return stats;
}

// ============================================================================
// Sorting
// ============================================================================

/**
 * Sorts annotations by severity (high to low)
 */
export function sortBySeverity(annotations: StudioAnnotation[]): StudioAnnotation[] {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return [...annotations].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Sorts annotations by impact score delta (high to low)
 */
export function sortByImpact(annotations: StudioAnnotation[]): StudioAnnotation[] {
    return [...annotations].sort((a, b) => b.impactScoreDelta - a.impactScoreDelta);
}

/**
 * SurgicalFixToIssueAdapter
 * 
 * Centralized service for converting surgical fixes from CV Surgeon
 * to Issue type used by the pill engine and Smart Context Card.
 * 
 * This eliminates duplicate mapping logic and ensures consistent
 * type conversions across the application.
 */

import type { SurgicalFix } from '@/lib/services/cv-surgeon-service';
import type { Issue, IssueType, IssueSeverity, IssuePriority, IssueTier } from '@/lib/pill-engine/types';

// Section mapping from fieldPath root to Issue section type
const SECTION_MAP: Record<string, Issue['section']> = {
    'work': 'work',
    'experience': 'work',
    'employment': 'work',
    'education': 'education',
    'skills': 'skills',
    'projects': 'projects',
    'summary': 'basics',
    'basics': 'basics',
    'personal': 'basics',
    'volunteer': 'work',
    'awards': 'basics',
    'publications': 'projects',
    'languages': 'skills',
    'interests': 'skills',
    'references': 'basics',
    'certificates': 'skills',
};

// Category to IssueType mapping
const CATEGORY_TO_TYPE_MAP: Record<string, IssueType> = {
    'impact': 'MISSING_METRICS',
    'keywords': 'KEYWORD_GAP',
    'clarity': 'VAGUE_ADJECTIVE',
    'formatting': 'DENSE_BLOCK',
    'grammar': 'TENSE_GRAMMAR',
    'structure': 'SECTION_ORDER',
    'other': 'IMPROVEMENT',
};

// Severity mapping
const SEVERITY_MAP: Record<string, IssueSeverity> = {
    'high': 'critical',
    'medium': 'warning',
    'low': 'info',
};

// Priority mapping based on category and severity
function determinePriority(fix: SurgicalFix): IssuePriority {
    if (fix.severity === 'high') return 'critical';
    if (fix.category === 'keywords') return 'ai-insight';
    if (fix.severity === 'medium') return 'suggestion';
    return 'suggestion';
}

// Tier mapping based on category
function determineTier(fix: SurgicalFix): IssueTier {
    // Tier 1: Structural issues
    if (fix.category === 'structure' || fix.category === 'formatting') return 1;
    // Tier 2: Content issues (most surgical fixes)
    if (fix.category === 'impact' || fix.category === 'keywords' || fix.category === 'clarity') return 2;
    // Tier 3: Minor issues
    return 3;
}

/**
 * Extract the root section from a fieldPath
 * e.g., "work[0].highlights[1]" -> "work"
 */
function extractRootSection(fieldPath: string | undefined): string {
    if (!fieldPath) return 'basics';
    return fieldPath.split(/[.[]/)[0] || 'basics';
}

/**
 * Convert a single SurgicalFix to an Issue
 */
export function surgicalFixToIssue(fix: SurgicalFix): Issue {
    const rootSection = extractRootSection(fix.fieldPath);
    const section = SECTION_MAP[rootSection] || 'basics';
    
    return {
        id: fix.id,
        type: CATEGORY_TO_TYPE_MAP[fix.category || 'other'] || 'IMPROVEMENT',
        severity: SEVERITY_MAP[fix.severity || 'medium'] || 'warning',
        priority: determinePriority(fix),
        tier: determineTier(fix),
        section,
        sectionId: rootSection,
        message: fix.issue,
        meta: {
            originalText: fix.original_text,
            fixedText: fix.fixed_text,
            impactScoreDelta: fix.impact_score_delta,
            category: fix.category,
            fieldPath: fix.fieldPath,
        },
        suggestedFixId: fix.id,
        deepLink: {
            section,
            sectionId: rootSection,
            field: fix.fieldPath,
        },
    };
}

/**
 * Convert an array of SurgicalFixes to Issues
 * Filters out non-pending fixes by default
 */
export function surgicalFixesToIssues(
    fixes: SurgicalFix[],
    options: {
        includeApplied?: boolean;
        includeRejected?: boolean;
    } = {}
): Issue[] {
    const { includeApplied = false, includeRejected = false } = options;
    
    return fixes
        .filter(fix => {
            if (fix.status === 'accepted' && !includeApplied) return false;
            if (fix.status === 'rejected' && !includeRejected) return false;
            return true;
        })
        .map(surgicalFixToIssue);
}

/**
 * Merge surgical fix issues with engine issues
 * Avoids duplicates by checking suggestedFixId
 */
export function mergeIssues(
    engineIssues: Issue[],
    surgicalFixes: SurgicalFix[]
): Issue[] {
    const surgicalIssues = surgicalFixesToIssues(surgicalFixes);
    
    // Get IDs of surgical issues to avoid duplicates
    const surgicalFixIds = new Set(surgicalIssues.map(i => i.suggestedFixId));
    
    // Filter engine issues that might duplicate surgical fixes
    // (engine might detect same issues with different IDs)
    const filteredEngineIssues = engineIssues.filter(engineIssue => {
        // If engine issue has a suggestedFixId, check if it's already in surgical
        if (engineIssue.suggestedFixId && surgicalFixIds.has(engineIssue.suggestedFixId)) {
            return false;
        }
        return true;
    });
    
    return [...filteredEngineIssues, ...surgicalIssues];
}

/**
 * Get section display name for UI
 */
export function getSectionDisplayName(section: Issue['section']): string {
    const displayNames: Record<string, string> = {
        'work': 'Work Experience',
        'education': 'Education',
        'skills': 'Skills',
        'projects': 'Projects',
        'basics': 'Personal Info',
        'summary': 'Summary',
    };
    return displayNames[section] || section;
}

/**
 * Get issue type display name for UI
 */
export function getIssueTypeDisplayName(type: IssueType): string {
    // Convert SNAKE_CASE to Title Case
    return type
        .split('_')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
}

export type { SurgicalFix, Issue };
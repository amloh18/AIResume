/**
 * CV Data Validator
 * Comprehensive validation and sanitization for CV data integrity
 * Handles all input edge cases: whitespace, null, undefined, partial data
 */

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { AnalysisMode } from './analysis-mode';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    confidence?: number;
}

export interface JDValidationResult extends ValidationResult {
    wordCount: number;
    estimatedReadTime?: number;
}

export interface RoleValidationResult extends ValidationResult {
    confidence: number;
    isGeneric: boolean;
    suggestions?: string[];
}

export interface DataIntegrityIssue {
    severity: 'error' | 'warning' | 'info';
    field: string;
    message: string;
    fixable: boolean;
    fixAction?: string;
}

// ============================================================================
// Input Sanitization (Edge Cases #7-#10, #18-#20)
// ============================================================================

/**
 * Sanitize any string input - handles whitespace, null, undefined
 * Edge Cases: #9 (whitespace), #18-20 (null/undefined/empty strings)
 */
export function sanitizeInput(input?: string | null): string | null {
    // Handle null/undefined
    if (input === null || input === undefined) {
        return null;
    }

    // Convert to string if needed
    const str = String(input);

    // Trim whitespace
    const trimmed = str.trim();

    // Treat empty strings as null
    if (trimmed.length === 0) {
        return null;
    }

    // Additional cleanup: normalize multiple spaces to single space
    const normalized = trimmed.replace(/\s+/g, ' ');

    return normalized;
}

/**
 * Compare two inputs to detect changes (for state monitoring)
 */
export function hasInputChanged(oldInput?: string | null, newInput?: string | null): boolean {
    const oldSanitized = sanitizeInput(oldInput);
    const newSanitized = sanitizeInput(newInput);
    return oldSanitized !== newSanitized;
}

/**
 * Create a hash of input for change detection
 */
export function hashInput(input?: string | null): string {
    const sanitized = sanitizeInput(input);
    if (!sanitized) return 'null';

    // Simple hash function for change detection
    let hash = 0;
    for (let i = 0; i < sanitized.length; i++) {
        const char = sanitized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}

// ============================================================================
// JD Validation (Edge Cases #7, #9)
// ============================================================================

const MIN_JD_WORDS = 50;
const MIN_JD_CHARS = 200;
const RECOMMENDED_JD_WORDS = 150;

/**
 * Validate Job Description text
 * Edge Cases: #7 (partial JD), #9 (whitespace JD)
 */
export function validateJD(jd?: string | null): JDValidationResult {
    const sanitized = sanitizeInput(jd);

    // No JD provided
    if (!sanitized) {
        return {
            isValid: false,
            reason: 'No job description provided',
            wordCount: 0,
            confidence: 0
        };
    }

    // Count words (split by whitespace, filter empty)
    const words = sanitized.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = sanitized.length;

    // Too short (Edge Case #7: Partial JD)
    if (wordCount < MIN_JD_WORDS || charCount < MIN_JD_CHARS) {
        return {
            isValid: false,
            reason: `Job description too short. Need at least ${MIN_JD_WORDS} words (currently ${wordCount} words). For best results, use ${RECOMMENDED_JD_WORDS}+ words.`,
            wordCount,
            confidence: 0
        };
    }

    // Valid but could be better
    if (wordCount < RECOMMENDED_JD_WORDS) {
        return {
            isValid: true,
            reason: `Job description is valid but brief. Consider adding more details for better analysis (currently ${wordCount} words, recommended ${RECOMMENDED_JD_WORDS}+).`,
            wordCount,
            confidence: 0.7,
            estimatedReadTime: Math.ceil(wordCount / 200) // Assuming 200 words per minute
        };
    }

    // Good JD
    return {
        isValid: true,
        wordCount,
        confidence: 1.0,
        estimatedReadTime: Math.ceil(wordCount / 200)
    };
}

// ============================================================================
// Role Validation (Edge Case #8)
// ============================================================================

const GENERIC_ROLES = [
    'employee',
    'worker',
    'staff',
    'member',
    'person',
    'professional',
    'individual',
    'candidate',
    'applicant',
    'job seeker',
    'team member'
];

const OVERLY_BROAD_ROLES = [
    'manager',
    'developer',
    'engineer',
    'designer',
    'analyst',
    'consultant',
    'specialist',
    'coordinator'
];

/**
 * Validate target role specificity
 * Edge Case: #8 (generic role like "Employee")
 */
export function validateRole(role?: string | null): RoleValidationResult {
    const sanitized = sanitizeInput(role);

    // No role provided
    if (!sanitized) {
        return {
            isValid: false,
            reason: 'No target role provided',
            confidence: 0,
            isGeneric: false
        };
    }

    const lowerRole = sanitized.toLowerCase();

    // Check if role is too generic (Edge Case #8)
    const isGeneric = GENERIC_ROLES.some(generic => lowerRole === generic);
    if (isGeneric) {
        return {
            isValid: true, // Still valid, just low confidence
            reason: `Role "${sanitized}" is very generic. Be more specific for better results (e.g., "Senior Product Manager" instead of "Employee").`,
            confidence: 0.2,
            isGeneric: true,
            suggestions: [
                'Add seniority level (Junior, Mid-level, Senior, Lead)',
                'Specify domain/industry (e.g., "SaaS Product Manager")',
                'Include specialization (e.g., "Frontend Developer")'
            ]
        };
    }

    // Check if role is overly broad
    const isBroad = OVERLY_BROAD_ROLES.some(broad => lowerRole === broad);
    if (isBroad) {
        return {
            isValid: true,
            reason: `Role "${sanitized}" could be more specific. Adding details will improve analysis quality.`,
            confidence: 0.6,
            isGeneric: false,
            suggestions: [
                'Add technology/domain (e.g., "React Developer")',
                'Specify level (e.g., "Senior Software Engineer")',
                'Include focus area (e.g., "Product Marketing Manager")'
            ]
        };
    }

    // Good role - specific enough
    const wordCount = sanitized.split(/\s+/).length;
    const confidence = Math.min(1.0, 0.7 + (wordCount * 0.1)); // More words = more specific

    return {
        isValid: true,
        confidence,
        isGeneric: false
    };
}

// ============================================================================
// Linked Job Validation (Edge Cases #10, #32-#33)
// ============================================================================

/**
 * Validate that a linked job exists and is accessible
 * Edge Cases: #10 (stale jobId), #32 (unlinked job), #33 (deleted job)
 */
export async function validateLinkedJob(
    jobId?: string | null,
    userId?: string
): Promise<ValidationResult & { jobExists: boolean; jobData?: any }> {
    // No job ID provided
    if (!jobId) {
        return {
            isValid: false,
            reason: 'No job ID linked',
            jobExists: false
        };
    }

    try {
        // Attempt to fetch job
        const response = await fetch(`/api/jobs/${jobId}${userId ? `?userId=${userId}` : ''}`);

        // Job not found (Edge Case #10, #33)
        if (response.status === 404) {
            return {
                isValid: false,
                reason: 'Linked job no longer exists. It may have been deleted.',
                jobExists: false
            };
        }

        // Server error
        if (!response.ok) {
            return {
                isValid: false,
                reason: `Failed to validate job (Status: ${response.status})`,
                jobExists: false
            };
        }

        const result = await response.json();

        // Job exists and is accessible
        if (result.success && result.data?.job) {
            const job = result.data.job;

            // Check if job is closed (Edge Case #31)
            if (job.status === 'closed' || job.status === 'archived') {
                return {
                    isValid: true,
                    reason: 'Job is closed but still linked for historical data',
                    jobExists: true,
                    jobData: job
                };
            }

            return {
                isValid: true,
                jobExists: true,
                jobData: job
            };
        }

        // Unexpected response format
        return {
            isValid: false,
            reason: 'Invalid job data format',
            jobExists: false
        };

    } catch (error) {
        console.error('Error validating linked job:', error);
        return {
            isValid: false,
            reason: 'Network error while validating job',
            jobExists: false
        };
    }
}

// ============================================================================
// CV Type Sanitization (Edge Case #30)
// ============================================================================

/**
 * Sanitize and validate CV type
 * Edge Case: #30 (corrupt/undefined cvType)
 */
export function sanitizeCVType(
    cvType?: string | null,
    metadata?: { isMaster?: boolean },
    journeyId?: string | null
): 'master' | 'journey' | 'standalone' {
    // If cvType is explicitly set and valid, use it
    if (cvType === 'master' || cvType === 'journey' || cvType === 'standalone') {
        return cvType;
    }

    // Fallback inference from metadata (Edge Case #30)
    if (metadata?.isMaster === true) {
        return 'master';
    }

    if (journeyId) {
        return 'journey';
    }

    // Default to standalone (safest fallback)
    return 'standalone';
}

// ============================================================================
// Comprehensive Data Integrity Check
// ============================================================================

/**
 * Run comprehensive integrity checks on CV data
 * Returns list of issues found
 */
export function detectDataIntegrityIssues(
    cv: Partial<UnifiedCVDataStructure & {
        cvType?: string;
        targetRole?: string;
        seniorityLevel?: string;
        jobData?: any;
        journeyId?: string;
        metadata?: any;
    }>,
    mode: AnalysisMode
): DataIntegrityIssue[] {
    const issues: DataIntegrityIssue[] = [];

    // Check CV Type
    if (!cv.cvType) {
        issues.push({
            severity: 'warning',
            field: 'cvType',
            message: 'CV type is undefined. It will default to "standalone".',
            fixable: true,
            fixAction: 'Auto-detect from metadata'
        });
    }

    // Master CV specific checks
    if (cv.cvType === 'master') {
        if (cv.jobData) {
            issues.push({
                severity: 'error',
                field: 'jobData',
                message: 'Master CV should not have job data attached. Master CVs are role-based only.',
                fixable: true,
                fixAction: 'Remove job data'
            });
        }

        if (!cv.targetRole) {
            issues.push({
                severity: 'error',
                field: 'targetRole',
                message: 'Master CV requires a target role for analysis.',
                fixable: false,
                fixAction: 'Set target role'
            });
        }
    }

    // Journey CV specific checks
    if (cv.cvType === 'journey') {
        if (!cv.jobData && !cv.journeyId) {
            issues.push({
                severity: 'error',
                field: 'jobData',
                message: 'Journey CV is missing job data and journey ID.',
                fixable: false,
                fixAction: 'Link to a job or convert to standalone'
            });
        }
    }

    // Mode-specific validation
    if (mode === 'role-based' && !cv.targetRole) {
        issues.push({
            severity: 'error',
            field: 'targetRole',
            message: 'Role-based analysis requires a target role.',
            fixable: false,
            fixAction: 'Set target role or add job description'
        });
    }

    if ((mode === 'jd-based' || mode === 'hybrid') && !cv.jobData) {
        issues.push({
            severity: 'error',
            field: 'jobData',
            message: 'JD-based analysis requires job description data.',
            fixable: false,
            fixAction: 'Add job description'
        });
    }

    // Check basic CV data completeness
    if (!cv.basics?.name) {
        issues.push({
            severity: 'warning',
            field: 'basics.name',
            message: 'CV is missing candidate name.',
            fixable: false,
            fixAction: 'Add your name'
        });
    }

    if (!cv.work || cv.work.length === 0) {
        issues.push({
            severity: 'info',
            field: 'work',
            message: 'No work experience added. This may limit analysis quality.',
            fixable: false,
            fixAction: 'Add work experience'
        });
    }

    return issues;
}

/**
 * Validate CV is ready for analysis
 */
export function validateCVForAnalysis(
    cv: any,
    mode: AnalysisMode
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const issues = detectDataIntegrityIssues(cv, mode);

    const errors = issues
        .filter(i => i.severity === 'error')
        .map(i => i.message);

    const warnings = issues
        .filter(i => i.severity === 'warning')
        .map(i => i.message);

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

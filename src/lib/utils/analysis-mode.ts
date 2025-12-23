/**
 * Analysis mode detection utility for CV types
 * Determines how CV analysis should be performed based on CV type and available data
 * Enhanced with validation, warnings, and comprehensive edge case handling
 */

import {
    sanitizeInput,
    validateJD,
    validateRole,
    hashInput,
    type JDValidationResult,
    type RoleValidationResult
} from './cv-data-validator';

export type AnalysisMode = 'role-based' | 'jd-based' | 'hybrid' | 'insufficient-data';

export type ValidationState = 'valid' | 'warning' | 'error';

export interface AnalysisModeResult {
    mode: AnalysisMode;
    hasRole: boolean;
    hasJD: boolean;
    canConvertToJourney: boolean;
    requiresRole: boolean;
    requiresJD: boolean;
}

/**
 * Enhanced analysis mode result with validation info
 */
export interface AnalysisModeInfo extends AnalysisModeResult {
    // Validation state
    validationState: ValidationState;
    warnings: string[];
    missingDataReasons: string[];

    // Input quality metrics
    roleValidation?: RoleValidationResult;
    jdValidation?: JDValidationResult;

    // Context hashes for change detection
    roleHash: string;
    jdHash: string;

    // Action suggestions
    suggestedActions: string[];
}

/**
 * Determine the analysis mode for a CV based on type and available context
 */
export function getAnalysisMode(
    cvType: 'master' | 'journey' | 'standalone' | undefined,
    targetRole?: string,
    seniorityLevel?: string,
    jobDescription?: string
): AnalysisModeResult {
    const hasRole = !!(targetRole && seniorityLevel);
    const hasJD = !!(jobDescription && jobDescription.trim().length > 50);

    // Master CV - always role-based
    if (cvType === 'master') {
        return {
            mode: hasRole ? 'role-based' : 'insufficient-data',
            hasRole,
            hasJD: false, // Master CVs don't use JD
            canConvertToJourney: false,
            requiresRole: true,
            requiresJD: false
        };
    }

    // Journey CV - always JD-based
    if (cvType === 'journey') {
        return {
            mode: hasJD ? 'jd-based' : 'insufficient-data',
            hasRole,
            hasJD,
            canConvertToJourney: false, // Already a journey
            requiresRole: false,
            requiresJD: true
        };
    }

    // Standalone CV - flexible (role OR JD OR both)
    if (cvType === 'standalone') {
        let mode: AnalysisMode = 'insufficient-data';

        if (hasJD && hasRole) {
            mode = 'hybrid'; // JD takes priority but role available
        } else if (hasJD) {
            mode = 'jd-based';
        } else if (hasRole) {
            mode = 'role-based';
        }

        return {
            mode,
            hasRole,
            hasJD,
            canConvertToJourney: hasJD, // Can convert if JD is present
            requiresRole: false,
            requiresJD: false
        };
    }

    // Default fallback
    return {
        mode: 'insufficient-data',
        hasRole,
        hasJD,
        canConvertToJourney: false,
        requiresRole: false,
        requiresJD: false
    };
}

/**
 * Get user-friendly label for analysis mode
 */
export function getAnalysisModeLabel(mode: AnalysisMode): string {
    switch (mode) {
        case 'role-based':
            return 'Role-Based Analysis';
        case 'jd-based':
            return 'JD-Based ATS Analysis';
        case 'hybrid':
            return 'JD-Based Analysis';
        case 'insufficient-data':
            return 'Setup Required';
        default:
            return 'Unknown';
    }
}

/**
 * Get description for analysis mode
 */
export function getAnalysisModeDescription(mode: AnalysisMode, cvType?: string): string {
    switch (mode) {
        case 'role-based':
            return cvType === 'master'
                ? 'Your master CV is analyzed against your target role and seniority level'
                : 'Your CV is analyzed against your target role and seniority level';
        case 'jd-based':
            return 'Your CV is analyzed against the job description for ATS compatibility';
        case 'hybrid':
            return 'Analysis prioritizes job description while keeping role context for reference';
        case 'insufficient-data':
            return 'Add target role or job description to enable AI analysis';
        default:
            return '';
    }
}

/**
 * Determine what context to use for surgeon analysis
 */
export function getAnalysisContext(
    mode: AnalysisMode,
    targetRole?: string,
    seniorityLevel?: string,
    jobDescription?: string
): {
    useRole: boolean;
    useJD: boolean;
    primaryContext: 'role' | 'jd' | null;
} {
    switch (mode) {
        case 'role-based':
            return {
                useRole: true,
                useJD: false,
                primaryContext: 'role'
            };
        case 'jd-based':
            return {
                useRole: false,
                useJD: true,
                primaryContext: 'jd'
            };
        case 'hybrid':
            return {
                useRole: true,
                useJD: true,
                primaryContext: 'jd' // JD takes priority
            };
        case 'insufficient-data':
        default:
            return {
                useRole: false,
                useJD: false,
                primaryContext: null
            };
    }
}

// ============================================================================
// Enhanced Validation Functions (Edge Cases Handling)
// ============================================================================

/**
 * Get comprehensive analysis mode information with full validation
 * Handles all 50 edge cases with proper sanitization and warnings
 */
export function getAnalysisModeWithValidation(
    cvType: 'master' | 'journey' | 'standalone' | undefined,
    targetRole?: string,
    seniorityLevel?: string,
    jobDescription?: string,
    jobData?: any
): AnalysisModeInfo {
    // Sanitize all inputs (Edge Cases #7-#10, #18-#20)
    const sanitizedRole = sanitizeInput(targetRole);
    const sanitizedSeniority = sanitizeInput(seniorityLevel);
    const sanitizedJD = sanitizeInput(jobDescription);

    // Validate inputs
    const roleValidation = validateRole(sanitizedRole);
    const jdValidation = validateJD(sanitizedJD);

    // Generate context hashes for change detection
    const roleHash = hashInput(`${sanitizedRole}-${sanitizedSeniority}`);
    const jdHash = hashInput(sanitizedJD);

    // Determine if we have valid inputs
    const hasRole = !!(sanitizedRole && sanitizedSeniority);
    const hasJD = jdValidation.isValid;

    // Initialize arrays
    const warnings: string[] = [];
    const missingDataReasons: string[] = [];
    const suggestedActions: string[] = [];

    // Determine mode based on CV type
    let mode: AnalysisMode = 'insufficient-data';
    let validationState: ValidationState = 'valid';
    let requiresRole = false;
    let requiresJD = false;
    let canConvertToJourney = false;

    // Master CV - always role-based (Edge Cases #21-#30)
    if (cvType === 'master') {
        requiresRole = true;

        if (hasRole) {
            mode = 'role-based';

            // Check role quality (Edge Case #8: Generic role)
            if (roleValidation.isGeneric) {
                warnings.push(roleValidation.reason || 'Role is too generic');
                validationState = 'warning';
                if (roleValidation.suggestions) {
                    suggestedActions.push(...roleValidation.suggestions);
                }
            } else if (roleValidation.confidence && roleValidation.confidence < 0.7) {
                warnings.push(roleValidation.reason || 'Role could be more specific');
                validationState = 'warning';
            }

            // Edge Case #21-22: Master with JD
            if (sanitizedJD || jobData) {
                warnings.push('Master CVs should not have job descriptions. Master CVs are role-based only.');
                validationState = 'warning';
                suggestedActions.push('Remove job description or convert to Journey CV');
            }
        } else {
            // Edge Case #23: Master without role
            mode = 'insufficient-data';
            validationState = 'error';
            missingDataReasons.push('Master CV requires a target role');
            suggestedActions.push('Set your target role and seniority level');
        }
    }
    // Journey CV - always JD-based (Edge Cases #31-#40)
    else if (cvType === 'journey') {
        requiresJD = true;

        if (hasJD) {
            mode = 'jd-based';

            // Check JD quality
            if (jdValidation.confidence && jdValidation.confidence < 1.0) {
                warnings.push(jdValidation.reason || 'Job description could be more detailed');
                validationState = 'warning';
                suggestedActions.push('Add more details to the job description for better analysis');
            }
        } else {
            // Edge Case #32, #36: Journey without JD
            mode = 'insufficient-data';
            validationState = 'error';
            missingDataReasons.push('Journey CV requires a job description for ATS analysis');
            suggestedActions.push('Link to a job or add a job description manually');
        }
    }
    // Standalone CV - flexible (Edge Cases #1-#20)
    else {
        if (hasJD && hasRole) {
            // Edge Case #4: Hybrid mode
            mode = 'hybrid';
            canConvertToJourney = true;

            // Edge Case #11: Title mismatch warning
            if (jobData?.jobTitle && sanitizedRole) {
                const jdTitle = sanitizeInput(jobData.jobTitle);
                if (jdTitle && jdTitle.toLowerCase() !== sanitizedRole.toLowerCase()) {
                    warnings.push(`Job title "${jdTitle}" differs from target role "${sanitizedRole}". Analysis will prioritize the job description.`);
                    validationState = 'warning';
                }
            }

            // Check input quality
            if (jdValidation.confidence && jdValidation.confidence < 1.0) {
                warnings.push(jdValidation.reason || 'Job description could be more detailed');
            }
            if (roleValidation.isGeneric || (roleValidation.confidence && roleValidation.confidence < 0.7)) {
                warnings.push(roleValidation.reason || 'Role could be more specific');
            }

            if (warnings.length > 0) {
                validationState = 'warning';
            }
        } else if (hasJD) {
            // Edge Case #3: JD added without role
            mode = 'jd-based';
            canConvertToJourney = true;

            if (jdValidation.confidence && jdValidation.confidence < 1.0) {
                warnings.push(jdValidation.reason || 'Job description could be more detailed');
                validationState = 'warning';
            }

            suggestedActions.push('Add target role for enhanced hybrid analysis');
        } else if (hasRole) {
            // Edge Case #2: Role added without JD
            mode = 'role-based';

            if (roleValidation.isGeneric || (roleValidation.confidence && roleValidation.confidence < 0.7)) {
                warnings.push(roleValidation.reason || 'Role could be more specific');
                validationState = 'warning';
                if (roleValidation.suggestions) {
                    suggestedActions.push(...roleValidation.suggestions);
                }
            }

            suggestedActions.push('Add job description for ATS-optimized analysis');
        } else {
            // Edge Case #1: Empty CV
            mode = 'insufficient-data';
            validationState = 'error';
            missingDataReasons.push('Add a target role or job description to enable AI analysis');
            suggestedActions.push('Set target role', 'Or paste a job description');
        }
    }

    return {
        mode,
        hasRole,
        hasJD,
        canConvertToJourney,
        requiresRole,
        requiresJD,
        validationState,
        warnings,
        missingDataReasons,
        roleValidation,
        jdValidation,
        roleHash,
        jdHash,
        suggestedActions
    };
}

/**
 * Check if analysis context has meaningfully changed
 * (for score invalidation logic)
 */
export function hasAnalysisContextChanged(
    oldInfo: AnalysisModeInfo | null,
    newInfo: AnalysisModeInfo
): boolean {
    if (!oldInfo) return true;

    // Mode changed
    if (oldInfo.mode !== newInfo.mode) return true;

    // Role context changed
    if (oldInfo.roleHash !== newInfo.roleHash) return true;

    // JD context changed
    if (oldInfo.jdHash !== newInfo.jdHash) return true;

    return false;
}


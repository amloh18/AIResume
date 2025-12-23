import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Generate automatic CV title based on CV type and data
 * @param cvType - Type of CV (master, standalone, journey)
 * @param cvData - CV data structure
 * @param jobData - Job data for journey CVs (optional)
 * @returns Generated title string
 */
export function generateCVTitle(
    cvType: 'master' | 'standalone' | 'journey',
    cvData: UnifiedCVDataStructure,
    jobData?: any
): string {
    // Extract full name from CV data
    const fullName = cvData?.basics?.name || 'My CV';

    // Extract professional title/label
    const professionalTitle = cvData?.basics?.label || cvData?.work?.[0]?.position || 'Professional';

    switch (cvType) {
        case 'master':
            // Master CV: {Professional Title} - {Full Name}
            return `${professionalTitle} - ${fullName}`;

        case 'standalone':
            // Standalone CV: {Job Title} - {Full Name} | CV
            const jobTitle = professionalTitle;
            return `${jobTitle} - ${fullName} | CV`;

        case 'journey':
            // Journey CV: {Company Name} - {Job Title} | CV
            const companyName = jobData?.company || jobData?.companyName || 'Company';
            const targetJobTitle = jobData?.jobTitle || jobData?.title || professionalTitle;
            return `${companyName} - ${targetJobTitle} | CV`;

        default:
            return `${professionalTitle} - ${fullName}`;
    }
}

/**
 * Update CV title if it's a default/generic title
 * @param currentTitle - Current CV title
 * @param cvType - Type of CV
 * @param cvData - CV data
 * @param jobData - Job data (optional)
 * @returns New title if update needed, otherwise current title
 */
export function updateCVTitleIfNeeded(
    currentTitle: string,
    cvType: 'master' | 'standalone' | 'journey',
    cvData: UnifiedCVDataStructure,
    jobData?: any
): string {
    // List of default/generic titles that should be replaced
    const defaultTitles = [
        'My CV',
        'Resume',
        'Curriculum Vitae',
        'My Resume',
        'Untitled CV',
        ''
    ];

    // If current title is default or empty, generate new one
    if (defaultTitles.includes(currentTitle.trim())) {
        return generateCVTitle(cvType, cvData, jobData);
    }

    // Keep existing non-default title
    return currentTitle;
}

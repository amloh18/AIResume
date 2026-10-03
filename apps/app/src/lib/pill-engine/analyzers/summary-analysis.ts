import { Issue, ResumeState } from '../types';

export const analyzeSummary = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { summary, targetJobTitle } = state;

    if (!summary) return issues;

    const cleanSummary = summary.trim();
    if (cleanSummary.length === 0) return issues; // Handled by empty section check

    // 1. Word Count / Length
    const words = cleanSummary.split(/\s+/);
    if (words.length > 100) {
        issues.push({
            id: 'summary-too-long',
            type: 'SUMMARY_TOO_LONG',
            severity: 'warning',
            priority: 'suggestion',
            tier: 1,
            section: 'basics', // summary is in basics usually
            message: 'Keep your summary under 3-4 lines (approx 60-80 words) for maximum readability.',
            deepLink: { section: 'basics', field: 'summary' }
        });
    }

    // 2. First Person Usage ("I am")
    // Note: Some modern advice allows "I", but "I am a..." is often redundant.
    if (/\bI am\b/i.test(cleanSummary)) {
        issues.push({
            id: 'first-person-usage',
            type: 'FIRST_PERSON_USAGE',
            severity: 'info',
            priority: 'suggestion',
            tier: 1,
            section: 'basics',
            message: "Resumes usually use 'implied first person.' Try 'Data Analyst with...' instead.",
            deepLink: { section: 'basics', field: 'summary' }
        });
    }

    // 3. Missing Job Title (Target Role)
    if (targetJobTitle && words.length > 0) {
        // Simple check if target role keywords appear in the summary
        const lowerSummary = cleanSummary.toLowerCase();
        const roleParts = targetJobTitle.toLowerCase().split(' ').filter(p => p.length > 3);

        // If the role has significant words, check if at least one appears
        if (roleParts.length > 0) {
            const hasRoleRef = roleParts.some(part => lowerSummary.includes(part));

            if (!hasRoleRef) {
                issues.push({
                    id: 'missing-job-title-summary',
                    type: 'MISSING_JOB_TITLE',
                    severity: 'warning',
                    priority: 'critical',
                    tier: 1,
                    section: 'basics',
                    message: `Ensure your target role (${targetJobTitle}) is mentioned in the first sentence.`,
                    deepLink: { section: 'basics', field: 'summary' }
                });
            }
        }
    }

    // 4. Missing Experience Years (Heuristic)
    if (!/\d+\+?\s*years?/i.test(cleanSummary) && !/years? of experience/i.test(cleanSummary)) {
        issues.push({
            id: 'missing-experience-years',
            type: 'MISSING_EXPERIENCE_YEARS',
            severity: 'info',
            priority: 'suggestion',
            tier: 1,
            section: 'basics',
            message: "Recruiters look for seniority immediately. Mention '5+ years' if applicable.",
            deepLink: { section: 'basics', field: 'summary' }
        });
    }

    return issues;
};

import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

export const summaryRules: Rule[] = [
    {
        id: 'summary-too-long',
        type: 'SUMMARY_TOO_LONG',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.summary && state.summary.length > 0) {
                const words = state.summary.split(/\s+/).length;
                if (words > 100) {
                    issues.push({
                        id: 'summary-too-long',
                        type: 'SUMMARY_TOO_LONG',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'basics',
                        message: "Keep your summary under 3-4 lines to ensure it gets read.",
                        deepLink: { section: 'basics', field: 'summary' }
                    });
                }
            }
            return issues;
        }
    },
    {
        id: 'first-person-usage',
        type: 'FIRST_PERSON_USAGE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.summary && /\b(I am|I have|I seek)\b/i.test(state.summary)) {
                issues.push({
                    id: 'first-person-summary',
                    type: 'FIRST_PERSON_USAGE',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'basics',
                    message: "Avoid 'I am'—try starting with your title, e.g., 'Data Analyst with 3 years...'",
                    deepLink: { section: 'basics', field: 'summary' }
                });
            }
            return issues;
        }
    },
    {
        id: 'missing-job-title-summary',
        type: 'MISSING_JOB_TITLE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.targetJobTitle && state.summary) {
                // Check first 15 words
                const first15 = state.summary.split(/\s+/).slice(0, 15).join(' ').toLowerCase();
                const titleParts = state.targetJobTitle.toLowerCase().split(' ').filter(w => w.length > 3);

                if (titleParts.length > 0) {
                    const hasTitle = titleParts.some(part => first15.includes(part));
                    if (!hasTitle) {
                        issues.push({
                            id: 'missing-job-title-sum',
                            type: 'MISSING_JOB_TITLE',
                            severity: 'warning',
                            priority: 'critical',
                            tier: 1,
                            section: 'basics',
                            message: `Ensure your target role (${state.targetJobTitle}) is mentioned early in the summary.`,
                            deepLink: { section: 'basics', field: 'summary' }
                        });
                    }
                }
            }
            return issues;
        }
    },
    {
        id: 'missing-years',
        type: 'MISSING_EXPERIENCE_YEARS',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.summary && !/\d+\+?\s*years?/i.test(state.summary) && !/years? of experience/i.test(state.summary)) {
                issues.push({
                    id: 'missing-years-summary',
                    type: 'MISSING_EXPERIENCE_YEARS',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'basics',
                    message: "Mention your years of experience early; recruiters look for seniority markers.",
                    deepLink: { section: 'basics', field: 'summary' }
                });
            }
            return issues;
        }
    },
    {
        id: 'generic-objective',
        type: 'GENERIC_OBJECTIVE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.summary && /seeking a challenging role|grow my skills/i.test(state.summary)) {
                issues.push({
                    id: 'generic-objective',
                    type: 'GENERIC_OBJECTIVE',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'basics',
                    message: "Avoid generic objectives like 'seeking a challenging role'. Focus on what you offer.",
                    deepLink: { section: 'basics', field: 'summary' }
                });
            }
            return issues;
        }
    }
];

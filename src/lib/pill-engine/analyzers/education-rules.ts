import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';
import { parseISO, isFuture, isValid } from 'date-fns';

export const educationRules: Rule[] = [
    {
        id: 'high-school',
        type: 'HIGH_SCHOOL',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            // Strategy: If > 2 years experience, discourage High School listing
            if (state.education && state.work.length >= 1) { // Simple check for work usage
                // Calculate roughly years of exp? Or just rely on heuristics.
                // Assuming "2 years exp" means ~2 work entries or >24 months delta.
                // Let's rely on simple entry count for now: if 2+ work entries, likely experienced.
                if (state.work.length >= 2) {
                    state.education.forEach(edu => {
                        if (/high school|secondary school/i.test(edu.institution) || /high school|secondary school/i.test(edu.studyType)) {
                            issues.push({
                                id: `high-school-${edu.id}`,
                                type: 'HIGH_SCHOOL',
                                severity: 'info',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'education',
                                sectionId: edu.id,
                                message: "You have professional experience now; you can safely remove your High School info.",
                                deepLink: { section: 'education', sectionId: edu.id }
                            });
                        }
                    });
                }
            }
            return issues;
        }
    },
    {
        id: 'low-gpa',
        type: 'LOW_GPA',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.education) {
                state.education.forEach(edu => {
                    if (edu.score) {
                        // Attempt to parse score like "3.2/4.0" or "3.2"
                        const match = edu.score.match(/(\d+(\.\d+)?)/);
                        if (match) {
                            const val = parseFloat(match[1]);
                            // Assuming 4.0 scale if value is < 5
                            if (val < 3.5 && val > 0 && val <= 4.0) {
                                issues.push({
                                    id: `low-gpa-${edu.id}`,
                                    type: 'LOW_GPA',
                                    severity: 'info',
                                    priority: 'suggestion',
                                    tier: 1,
                                    section: 'education',
                                    sectionId: edu.id,
                                    message: "GPAs below 3.5 are usually omitted. Focus on your honors or major projects instead.",
                                    deepLink: { section: 'education', sectionId: edu.id, field: 'score' }
                                });
                            }
                        }
                    }
                });
            }
            return issues;
        }
    },
    {
        id: 'missing-grad-date',
        type: 'MISSING_GRAD_DATE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.education) {
                state.education.forEach(edu => {
                    if (!edu.endDate && !edu.isCurrent) {
                        issues.push({
                            id: `missing-grad-date-${edu.id}`,
                            type: 'MISSING_GRAD_DATE',
                            severity: 'warning',
                            priority: 'critical',
                            tier: 1,
                            section: 'education',
                            sectionId: edu.id,
                            message: "Degree listed without a graduation date.",
                            deepLink: { section: 'education', sectionId: edu.id, field: 'endDate' }
                        });
                    }
                });
            }
            return issues;
        }
    },
    {
        id: 'future-date-label',
        type: 'FUTURE_DATE_LABEL',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.education) {
                state.education.forEach(edu => {
                    if (edu.endDate) {
                        const end = parseISO(edu.endDate);
                        if (isValid(end) && isFuture(end)) {
                            // Check if description/studyType says "Expected" or "Candidate"
                            // This is hard since we don't have description in ResumeState education yet? 
                            // Wait, I just added Education to types, but only limited fields.
                            // Let's assume we check institution/area/studyType.
                            const context = (edu.institution + edu.area + edu.studyType).toLowerCase();
                            if (!context.includes('expected') && !context.includes('candidate') && !context.includes('progress')) {
                                issues.push({
                                    id: `future-label-${edu.id}`,
                                    type: 'FUTURE_DATE_LABEL',
                                    severity: 'info',
                                    priority: 'suggestion',
                                    tier: 1,
                                    section: 'education',
                                    sectionId: edu.id,
                                    message: "Date is in the future. Add 'Expected' or 'Candidate' for clarity.",
                                    deepLink: { section: 'education', sectionId: edu.id } // Link to general section as field might not be editable text for "Expected" label directly
                                });
                            }
                        }
                    }
                });
            }
            return issues;
        }
    }
];

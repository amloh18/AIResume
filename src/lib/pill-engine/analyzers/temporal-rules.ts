import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';
import { differenceInMonths, parseISO, isValid, isFuture, isPast } from 'date-fns';

export const temporalRules: Rule[] = [
    {
        id: 'chronology-error',
        type: 'CHRONOLOGY_ERROR',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            let prevEndDate: Date | null = null;

            // Assuming state.work is ordered as presented in UI (usually top to bottom)
            // Validation: Start dates should be descending (Newest first)
            for (let i = 0; i < state.work.length; i++) {
                const role = state.work[i];
                if (!role.startDate) continue;

                // Parse dates. Handle 'Present' or simple strings carefully.
                // Assuming standardized ISO from CV data or handling simple parsing
                const startDate = parseISO(role.startDate); // Needs robust parsing ideally

                if (i > 0 && isValid(startDate)) {
                    const prevRole = state.work[i - 1];
                    const prevStart = parseISO(prevRole.startDate);

                    if (isValid(prevStart) && startDate > prevStart) {
                        issues.push({
                            id: `chronology-${role.id}`,
                            type: 'CHRONOLOGY_ERROR',
                            severity: 'critical',
                            priority: 'critical',
                            tier: 1,
                            section: 'work',
                            sectionId: role.id,
                            message: "Double-check your dates; resumes should be in reverse-chronological order.",
                            deepLink: { section: 'work', sectionId: role.id, field: 'startDate' }
                        });
                        break; // Stop after first major chronology error
                    }
                }
            }
            return issues;
        }
    },
    {
        id: 'date-gap',
        type: 'DATE_GAP',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            // Sort by Date Descending first to be sure
            const sortedWork = [...state.work].sort((a, b) =>
                (new Date(b.startDate).getTime() || 0) - (new Date(a.startDate).getTime() || 0)
            );

            for (let i = 0; i < sortedWork.length - 1; i++) {
                const current = sortedWork[i]; // Newer job
                const previous = sortedWork[i + 1]; // Older job

                // Gap is between Previous.EndDate and Current.StartDate
                // If current is present, doesn't matter for gap *between* jobs
                // Only if previous ended way before current started

                if (previous.endDate && current.startDate) {
                    const prevEnd = parseISO(previous.endDate);
                    const currStart = parseISO(current.startDate);

                    if (isValid(prevEnd) && isValid(currStart)) {
                        const gapMonths = differenceInMonths(currStart, prevEnd);
                        if (gapMonths > 6) {
                            issues.push({
                                id: `gap-${previous.id}-${current.id}`,
                                type: 'DATE_GAP', // Maps to EMPLOYMENT_GAP in old system maybe, but keeping specific
                                severity: 'warning',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: current.id,
                                message: `There is a gap of ${gapMonths} months here. Consider adding freelance work or education.`,
                                deepLink: { section: 'work', sectionId: current.id } // Link to the newer job (start of gap)
                            });
                        }
                    }
                }
            }
            return issues;
        }
    },
    {
        id: 'present-tense-past',
        type: 'PRESENT_TENSE_PAST',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                if (!role.isCurrent && role.endDate) {
                    // It's a past role. Check bullets for present tense verbs.
                    // Simplified list of common present tense verbs
                    const presentVerbs = ['manage', 'lead', 'develop', 'create', 'maintain', 'support', 'assist', 'analyze'];
                    role.bullets.forEach((bullet, idx) => {
                        const firstWord = bullet.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
                        if (presentVerbs.includes(firstWord) || (firstWord.endsWith('s') && presentVerbs.includes(firstWord.slice(0, -1)))) {
                            issues.push({
                                id: `tense-error-${role.id}-${idx}`,
                                type: 'PRESENT_TENSE_PAST',
                                severity: 'info',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: role.id,
                                bulletIndex: idx,
                                message: "This role ended in the past; ensure all verbs are in the past tense (e.g., 'Managed').",
                                deepLink: { section: 'work', sectionId: role.id, field: `bullets.${idx}` }
                            });
                        }
                    });
                }
            });
            return issues;
        }
    },
    {
        id: 'short-tenure',
        type: 'SHORT_TENURE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                // Ignore internships for short tenure checks
                if (role.title.toLowerCase().includes('intern')) return;

                if (role.startDate) {
                    const start = parseISO(role.startDate);
                    const end = role.isCurrent ? new Date() : (role.endDate ? parseISO(role.endDate) : new Date());

                    if (isValid(start) && isValid(end)) {
                        const months = differenceInMonths(end, start);
                        if (months < 6 && months >= 0) { // >= 0 to avoid future date bugs
                            issues.push({
                                id: `short-tenure-${role.id}`,
                                type: 'SHORT_TENURE',
                                severity: 'info',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: role.id,
                                message: "This role is quite short (< 6 months). Be prepared to explain it.",
                                deepLink: { section: 'work', sectionId: role.id }
                            });
                        }
                    }
                }
            });
            return issues;
        }
    }
];

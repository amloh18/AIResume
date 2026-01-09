import { EnrichedWorkExperience, Issue, ResumeState } from '../types';
import { differenceInMonths, isValid } from 'date-fns';

const GAP_THRESHOLD_MONTHS = 3;

export const analyzeEmploymentGaps = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { work } = state;

    if (!work || work.length < 2) return issues;

    // robust sort
    const sortedWork = [...work].sort((a, b) => {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        return dateA - dateB;
    });

    for (let i = 0; i < sortedWork.length - 1; i++) {
        const current = sortedWork[i];
        const next = sortedWork[i + 1];

        let currentEnd: Date;
        if (current.isCurrent) {
            currentEnd = new Date();
        } else if (current.endDate) {
            currentEnd = new Date(current.endDate);
        } else {
            continue;
        }

        const nextStart = new Date(next.startDate);

        if (!isValid(currentEnd) || !isValid(nextStart)) continue;

        if (nextStart > currentEnd) {
            const gapMonths = differenceInMonths(nextStart, currentEnd);

            if (gapMonths >= GAP_THRESHOLD_MONTHS) {
                issues.push({
                    id: `gap-${current.id}-${next.id}`,
                    type: 'EMPLOYMENT_GAP',
                    severity: gapMonths > 6 ? 'warning' : 'info',
                    tier: 1, // Tier 1: Structural
                    section: 'work',
                    sectionId: current.id,
                    message: `Gap of ${gapMonths} months detected between ${current.company} and ${next.company}.`,
                    meta: {
                        gapStart: currentEnd.toISOString(),
                        gapEnd: nextStart.toISOString(),
                        months: gapMonths,
                        prevRole: current.company,
                        nextRole: next.company
                    },
                    deepLink: {
                        section: 'work',
                        sectionId: current.id, // Link to the item *before* the gap or generic work section
                        field: 'endDate'
                    }
                });
            }
        }
    }

    return issues;
};

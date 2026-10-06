import { Issue, ResumeState } from '../types';

const METRIC_REGEX = /(\d+(\.\d+)?%?)|(\$|£|€)\d+|(\d+(K|M|B)\+?)/i;

export const analyzeQuantification = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { work } = state;

    work.forEach(role => {
        role.bullets.forEach((bullet, index) => {
            if (bullet.length < 20) return;

            if (!METRIC_REGEX.test(bullet)) {
                issues.push({
                    id: `metric-miss-${role.id}-${index}`,
                    type: 'MISSING_METRICS',
                    severity: 'info',
                    tier: 2, // Tier 2: Content quality
                    section: 'work',
                    sectionId: role.id,
                    bulletIndex: index,
                    message: `This bullet point could be stronger with a number or metric.`,
                    meta: {
                        bulletContent: bullet
                    },
                    deepLink: {
                        section: 'work',
                        sectionId: role.id,
                        field: `bullets.${index}` // Conceptual path, UI will need to handle array indexing
                    }
                });
            }
        });
    });

    return issues;
};

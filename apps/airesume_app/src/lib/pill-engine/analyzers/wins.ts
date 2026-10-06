import { Issue, ResumeState } from '../types';

const STRONG_VERBS = new Set([
    'architected', 'spearheaded', 'orchestrated', 'pioneered', 'transformed'
]);

export const analyzeWins = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { work } = state;

    work.forEach(role => {
        role.bullets.forEach((bullet, index) => {
            const firstWord = bullet.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');

            if (STRONG_VERBS.has(firstWord)) {
                issues.push({
                    id: `win-verb-${role.id}-${index}`,
                    type: 'WIN_VERBS',
                    severity: 'positive',
                    tier: 3, // Tier 3: Optimization/Strategy (or bonus)
                    section: 'work',
                    sectionId: role.id,
                    bulletIndex: index,
                    message: `Strong action verb '${firstWord}'! This shows leadership.`,
                    meta: { word: firstWord },
                    deepLink: {
                        section: 'work',
                        sectionId: role.id,
                        field: `bullets.${index}`
                    }
                });
            }
        });
    });

    return issues;
};

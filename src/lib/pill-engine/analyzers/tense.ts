import { Issue, ResumeState } from '../types';

// Simple heuristic list
const PRESENT_TENSE_VERBS = new Set([
    'manage', 'lead', 'create', 'develop', 'maintain', 'support', 'design', 'write', 'build', 'analyze',
    'coordinate', 'assist', 'organize', 'plan', 'execute', 'implement', 'monitor', 'review'
]);

export const analyzeTense = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { work } = state;

    work.forEach(role => {
        if (role.isCurrent) return;

        role.bullets.forEach((bullet, index) => {
            const firstWord = bullet.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');

            let isPresent = false;
            if (PRESENT_TENSE_VERBS.has(firstWord)) isPresent = true;
            else if (firstWord.endsWith('s') && PRESENT_TENSE_VERBS.has(firstWord.slice(0, -1))) isPresent = true;

            if (isPresent) {
                issues.push({
                    id: `tense-${role.id}-${index}`,
                    type: 'TENSE_GRAMMAR',
                    severity: 'warning',
                    tier: 2, // Tier 2: Content quality
                    section: 'work',
                    sectionId: role.id,
                    bulletIndex: index,
                    message: `Past role uses present tense '${firstWord}'. Consider changing to past tense.`,
                    meta: {
                        word: firstWord,
                        bulletContent: bullet
                    },
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

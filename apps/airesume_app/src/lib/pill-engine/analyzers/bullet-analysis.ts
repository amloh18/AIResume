import { Issue, ResumeState } from '../types';

const WEAK_VERBS = new Set([
    'responsible for', 'worked on', 'helped', 'assisted', 'participated in', 'duties include', 'tasked with', 'handled'
]);

const VAGUE_ADJECTIVES = new Set([
    'great', 'good', 'excellent', 'various', 'multiple', 'many', 'several', 'strong'
]);

// Keep track of verbs for repetition check
const VERB_CACHE: Record<string, string[]> = {};

export const analyzeBullets = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { work } = state;

    work.forEach(role => {
        VERB_CACHE[role.id] = [];

        role.bullets.forEach((bullet, index) => {
            const cleanBullet = bullet.trim();
            const lowerBullet = cleanBullet.toLowerCase();
            const firstWord = cleanBullet.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');

            // 1. Weak Verbs
            let hasWeakVerb = false;
            WEAK_VERBS.forEach(verb => {
                if (lowerBullet.startsWith(verb)) {
                    hasWeakVerb = true;
                    issues.push({
                        id: `weak-verb-${role.id}-${index}`,
                        type: 'WEAK_VERB',
                        severity: 'warning',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'work',
                        sectionId: role.id,
                        bulletIndex: index,
                        message: `Weak opening verb '${verb}'. try 'Spearheaded' or 'Engineered'.`,
                        deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                    });
                }
            });

            // 2. Logic for Repeated Verbs (Simple)
            if (firstWord.length > 3) {
                const recentVerbs = VERB_CACHE[role.id].slice(-2); // Last 2 bullets
                if (recentVerbs.includes(firstWord)) {
                    issues.push({
                        id: `repeated-verb-${role.id}-${index}`,
                        type: 'REPEATED_VERB',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'work',
                        sectionId: role.id,
                        bulletIndex: index,
                        message: `Variety is key. You've used '${firstWord}' recently.`,
                        deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                    });
                }
                VERB_CACHE[role.id].push(firstWord);
            }

            // 3. Bullet Length
            const wordCount = cleanBullet.split(/\s+/).length;
            if (wordCount < 5 && wordCount > 0) {
                issues.push({
                    id: `thin-bullet-${role.id}-${index}`,
                    type: 'BULLET_TOO_SHORT',
                    severity: 'warning',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'work',
                    sectionId: role.id,
                    bulletIndex: index,
                    message: `This bullet feels thin. Mention the tools you used to achieve this result.`,
                    deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                });
            } else if (wordCount > 30) {
                issues.push({
                    id: `long-bullet-${role.id}-${index}`,
                    type: 'BULLET_TOO_LONG',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'work',
                    sectionId: role.id,
                    bulletIndex: index,
                    message: `This is becoming a paragraph. Break this into two punchy bullets.`,
                    deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                });
            }

            // 4. Vague Adjectives
            VAGUE_ADJECTIVES.forEach(adj => {
                if (lowerBullet.includes(` ${adj} `)) {
                    issues.push({
                        id: `vague-adj-${role.id}-${index}`,
                        type: 'VAGUE_ADJECTIVE',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'work',
                        sectionId: role.id,
                        bulletIndex: index,
                        message: `Replace '${adj}' with a specific metric (e.g., '15% Increase').`,
                        deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                    });
                }
            });
        });
    });

    return issues;
};

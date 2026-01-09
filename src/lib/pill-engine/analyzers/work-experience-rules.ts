import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

const WEAK_VERBS = new Set([
    'responsible for', 'worked on', 'helped', 'assisted', 'participated in', 'duties include', 'tasked with', 'handled'
]);

const VAGUE_ADJECTIVES = new Set([
    'various', 'multiple', 'some', 'good', 'great', 'several', 'many'
]);

const PASSIVE_PHRASES = [
    'was tasked with', 'was responsible for', 'given duty to', 'was assigned'
];

const FIRST_PERSON_WORDS = new Set(['i', 'me', 'my', 'we', 'our']);

export const workExperienceRules: Rule[] = [
    {
        id: 'weak-verb-check',
        type: 'WEAK_VERB',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    const lower = bullet.trim().toLowerCase();
                    for (const verb of WEAK_VERBS) {
                        if (lower.startsWith(verb)) {
                            issues.push({
                                id: `weak-verb-${role.id}-${index}`,
                                type: 'WEAK_VERB',
                                severity: 'warning',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: role.id,
                                bulletIndex: index,
                                message: `You used '${verb}' — try 'Spearheaded', 'Engineered', or 'Optimized'.`,
                                deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                            });
                        }
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'bullet-length-short',
        type: 'BULLET_TOO_SHORT',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    if (bullet.trim().length > 0 && bullet.trim().split(/\s+/).length < 5) {
                        issues.push({
                            id: `short-bullet-${role.id}-${index}`,
                            type: 'BULLET_TOO_SHORT',
                            severity: 'warning',
                            priority: 'suggestion',
                            tier: 1,
                            section: 'work',
                            sectionId: role.id,
                            bulletIndex: index,
                            message: "This bullet is thin (<5 words). Mention the specific tools or results.",
                            deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                        });
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'bullet-length-long',
        type: 'BULLET_TOO_LONG',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    if (bullet.split(/\s+/).length > 25) {
                        issues.push({
                            id: `long-bullet-${role.id}-${index}`,
                            type: 'BULLET_TOO_LONG',
                            severity: 'info',
                            priority: 'suggestion',
                            tier: 1,
                            section: 'work',
                            sectionId: role.id,
                            bulletIndex: index,
                            message: "This bullet is becoming a paragraph. Break it into two for better readability.",
                            deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                        });
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'repeated-verb',
        type: 'REPEATED_VERB',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                const startWords = role.bullets.map(b => b.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g, ''));
                const counts: Record<string, number> = {};
                startWords.forEach(w => { if (w.length > 3) counts[w] = (counts[w] || 0) + 1 });

                Object.entries(counts).forEach(([word, count]) => {
                    if (count >= 3) {
                        issues.push({
                            id: `repeat-verb-${role.id}-${word}`,
                            type: 'REPEATED_VERB',
                            severity: 'info',
                            priority: 'suggestion',
                            tier: 1,
                            section: 'work',
                            sectionId: role.id,
                            message: `Variety! You've started 3+ bullets with '${word}'.`,
                            deepLink: { section: 'work', sectionId: role.id }
                        });
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'vague-adjective',
        type: 'VAGUE_ADJECTIVE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    const lower = bullet.toLowerCase();
                    for (const adj of VAGUE_ADJECTIVES) {
                        if (lower.includes(` ${adj} `)) {
                            issues.push({
                                id: `vague-adj-${role.id}-${index}`,
                                type: 'VAGUE_ADJECTIVE',
                                severity: 'info',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: role.id,
                                bulletIndex: index,
                                message: `Avoid vague words like '${adj}'. Be specific.`,
                                deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                            });
                            break; // one per bullet
                        }
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'missing-metric',
        type: 'MISSING_METRICS', // Using existing MISSING_METRICS from types
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const METRIC_REGEX = /(\d+(\.\d+)?%?)|(\$|£|€)\d+|(\d+(K|M|B)\+?)/i;

            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    if (bullet.length > 20 && !METRIC_REGEX.test(bullet)) {
                        // This logic was in quantification.ts before, migrating here
                        issues.push({
                            id: `missing-metric-${role.id}-${index}`,
                            type: 'MISSING_METRICS',
                            severity: 'info',
                            priority: 'ai-insight',
                            tier: 2,
                            section: 'work',
                            sectionId: role.id,
                            bulletIndex: index,
                            message: "Impact is better shown with numbers. Can you quantify this result with a % or $?",
                            deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                        });
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'passive-voice',
        type: 'PASSIVE_VOICE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    const lower = bullet.toLowerCase();
                    for (const phrase of PASSIVE_PHRASES) {
                        if (lower.includes(phrase)) {
                            issues.push({
                                id: `passive-voice-${role.id}-${index}`,
                                type: 'PASSIVE_VOICE',
                                severity: 'warning',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: role.id,
                                bulletIndex: index,
                                message: `Passive voice ('${phrase}') detected. Use active voice like 'Spearheaded'.`,
                                deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                            });
                        }
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'first-person-we',
        type: 'FIRST_PERSON_WE',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    const words = bullet.toLowerCase().split(/\W+/);
                    for (const w of words) {
                        if (FIRST_PERSON_WORDS.has(w)) {
                            issues.push({
                                id: `first-person-${role.id}-${index}`,
                                type: 'FIRST_PERSON_WE',
                                severity: 'info',
                                priority: 'suggestion',
                                tier: 1,
                                section: 'work',
                                sectionId: role.id,
                                bulletIndex: index,
                                message: `Avoid '${w}' in professional bullets. Use implied first person.`,
                                deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                            });
                            break;
                        }
                    }
                });
            });
            return issues;
        }
    },
    {
        id: 'xyz-formula',
        type: 'XYZ_FORMULA_SUGGESTION',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            // Google XYZ: Accomplished [X] as measured by [Y], by doing [Z]
            // We look for bullets that define a task "Responsible for X" or "Managed X" but lack metrics/results
            // Simplistic heuristic: Starts with weak verb OR short length AND no numbers/metrics

            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    // Check if "Task-based" (contains "responsible", "duties", or just short verb+noun)
                    // And NO metrics (numbers, $, %)
                    const hasMetric = /\d+%|\$|\d+/.test(bullet);
                    const isTask = /responsible for|duties include|tasked with/i.test(bullet) || bullet.split(' ').length < 10;

                    if (isTask && !hasMetric) {
                        issues.push({
                            id: `xyz-formula-${role.id}-${index}`,
                            type: 'XYZ_FORMULA_SUGGESTION',
                            severity: 'info',
                            priority: 'ai-insight',
                            tier: 2,
                            section: 'work',
                            sectionId: role.id,
                            bulletIndex: index,
                            message: "Make this bullet pop with the XYZ Formula: 'Accomplished [X] as measured by [Y], by doing [Z]'.",
                            deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                        });
                    }
                });
            });
            return issues;
        }
    }
];

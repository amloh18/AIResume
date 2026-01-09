import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

const SOFT_SKILLS = new Set([
    'communication', 'teamwork', 'leadership', 'problem solving', 'time management',
    'adaptability', 'creativity', 'work ethic', 'detail oriented', 'hard working',
    'critical thinking', 'collaboration'
]);

export const skillsRules: Rule[] = [
    {
        id: 'low-skill-count',
        type: 'LOW_SKILL_COUNT',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const count = state.skills.length;
            if (count > 0 && count < 5) {
                issues.push({
                    id: 'low-skill-count',
                    type: 'LOW_SKILL_COUNT',
                    severity: 'warning',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'skills',
                    message: `A ${state.targetJobTitle || 'Professional'} usually lists 8-12 core technical skills.`,
                    deepLink: { section: 'skills' }
                });
            }
            return issues;
        }
    },
    {
        id: 'soft-skill-heavy',
        type: 'SOFT_SKILL_HEAVY',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            let softCount = 0;
            state.skills.forEach(s => {
                if (SOFT_SKILLS.has(s.toLowerCase().trim())) softCount++;
            });

            if (state.skills.length > 0 && softCount > state.skills.length / 2) {
                issues.push({
                    id: 'soft-skill-heavy',
                    type: 'SOFT_SKILL_HEAVY',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'skills',
                    message: "You have many 'soft' skills. Try replacing some with 'hard' tools/technologies.",
                    deepLink: { section: 'skills' }
                });
            }
            return issues;
        }
    },
    {
        id: 'duplicate-skill',
        type: 'DUPLICATE_SKILL',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const seen = new Set<string>();
            for (const skill of state.skills) {
                const lower = skill.toLowerCase().trim();
                if (seen.has(lower)) {
                    issues.push({
                        id: `duplicate-skill-${lower}`,
                        type: 'DUPLICATE_SKILL',
                        severity: 'warning',
                        priority: 'critical',
                        tier: 1,
                        section: 'skills',
                        message: `You've listed '${skill}' twice.`,
                        deepLink: { section: 'skills' }
                    });
                    // Only flag once per dupe to avoid spam
                    break;
                }
                seen.add(lower);
            }
            return issues;
        }
    },
    {
        id: 'missing-grouping',
        type: 'MISSING_GROUPING',
        evaluate: (state: ResumeState): Issue[] => {
            // Heuristic: If we just have a flat list of > 15 skills, suggest grouping.
            // Assumption: ResumeState.skills is flat. If the UI supports categories, we check that structure.
            // Currently ResumeState.skills is string[].
            const issues: Issue[] = [];
            if (state.skills.length > 15) {
                issues.push({
                    id: 'missing-grouping',
                    type: 'MISSING_GROUPING',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'skills',
                    message: "Organize your skills into categories (e.g., Languages, Tools) for clarity.",
                    deepLink: { section: 'skills' }
                });
            }
            return issues;
        }
    },
    {
        id: 'missing-tech-stack',
        type: 'MISSING_TECH_STACK',
        evaluate: (state: ResumeState): Issue[] => {
            // Placeholder: This requires a keyword dictionary map for roles.
            // Returning empty for now to be safe, or implement basic check.
            const issues: Issue[] = [];
            if (state.targetJobTitle && /data analyst/i.test(state.targetJobTitle)) {
                const hasSQL = state.skills.some(s => /sql|sequel/i.test(s));
                if (!hasSQL) {
                    issues.push({
                        id: 'missing-tech-stack-da',
                        type: 'MISSING_TECH_STACK',
                        severity: 'info',
                        priority: 'ai-insight',
                        tier: 2,
                        section: 'skills',
                        message: "No mention of SQL found. It's a key tool for Data Analysts.",
                        deepLink: { section: 'skills' }
                    });
                }
            }
            return issues;
        }
    }
];

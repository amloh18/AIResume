import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

export const consistencyRules: Rule[] = [
    {
        id: 'skill-exp-mismatch',
        type: 'SKILL_EXP_MISMATCH',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            // Check top skills (first 5)
            const topSkills = state.skills.slice(0, 5);
            const allWorkText = state.work.flatMap(w => [...w.bullets, w.summary || '']).join(' ').toLowerCase();

            topSkills.forEach(skill => {
                const lowSkill = skill.toLowerCase();
                // Simple text match
                if (!allWorkText.includes(lowSkill)) {
                    issues.push({
                        id: `skill-exp-sync-${skill}`,
                        type: 'SKILL_EXP_MISMATCH',
                        severity: 'warning',
                        priority: 'suggestion',
                        tier: 2,
                        section: 'work', // Point to work to add it there
                        message: `You listed '${skill}' in Skills, but didn't mention using it in your experience descriptions.`,
                        deepLink: { section: 'work' }
                    });
                }
            });
            return issues;
        }
    }
];

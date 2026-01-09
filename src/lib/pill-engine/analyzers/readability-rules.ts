import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';
import { DOMAIN_KNOWLEDGE } from '../domain-data';

export const readabilityRules: Rule[] = [
    {
        id: 'readability-f-pattern',
        type: 'READABILITY_F_PATTERN',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];

            // Find domain keywords if applicable
            const targetRole = state.targetJobTitle ? state.targetJobTitle.toLowerCase() : '';
            const domain = DOMAIN_KNOWLEDGE.find(d => d.keywords.some(k => targetRole.includes(k)));

            if (!domain || !domain.mustHaveSkills) return issues;

            const keySkills = domain.mustHaveSkills;

            state.work.forEach(role => {
                role.bullets.forEach((bullet, index) => {
                    // Check if high value keyword appears late in the bullet (after 10th word)
                    const words = bullet.split(/\s+/);
                    if (words.length > 15) {
                        const lateText = words.slice(10).join(' ').toLowerCase();
                        const earlyText = words.slice(0, 10).join(' ').toLowerCase();

                        for (const skill of keySkills) {
                            const lowSkill = skill.toLowerCase();
                            // If skill is in late text BUT NOT in early text
                            if (lateText.includes(lowSkill) && !earlyText.includes(lowSkill)) {
                                issues.push({
                                    id: `f-pattern-${role.id}-${index}`,
                                    type: 'READABILITY_F_PATTERN',
                                    severity: 'info',
                                    priority: 'suggestion',
                                    tier: 2,
                                    section: 'work',
                                    sectionId: role.id,
                                    bulletIndex: index,
                                    message: `Recruiters scan in an 'F-pattern.' Move '${skill}' to the start of the bullet for 2x visibility.`,
                                    deepLink: { section: 'work', sectionId: role.id, field: `bullets.${index}` }
                                });
                                break; // One suggestion per bullet is enough
                            }
                        }
                    }
                });
            });

            return issues;
        }
    }
];

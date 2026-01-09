import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';
import { DOMAIN_KNOWLEDGE } from '../domain-data';

export const domainRules: Rule[] = [
    {
        id: 'domain-check',
        type: 'DOMAIN_SKILL_GAP', // Primary type, though we output multiple types
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const targetRole = state.targetJobTitle ? state.targetJobTitle.toLowerCase() : '';

            if (!targetRole) return issues;

            // 1. Detect Domain
            const domain = DOMAIN_KNOWLEDGE.find(d =>
                d.keywords.some(k => targetRole.includes(k))
            );

            if (!domain) return issues; // No specific domain logic applies

            // 2. Check Must-Have Skills
            const userSkills = state.skills.map(s => s.toLowerCase());
            // Check if user has at least a few of the top Must-Haves
            const missingSkills = domain.mustHaveSkills.filter(s => !userSkills.includes(s.toLowerCase()));

            // Heuristic: If missing > 70% of suggested skills, flag it
            if (missingSkills.length > (domain.mustHaveSkills.length * 0.5)) {
                // Show top 3 missing
                const examples = missingSkills.slice(0, 3).join(', ');
                issues.push({
                    id: `domain-skill-gap-${domain.id}`,
                    type: 'DOMAIN_SKILL_GAP',
                    severity: 'warning',
                    priority: 'critical',
                    tier: 1,
                    section: 'skills',
                    message: `For ${state.targetJobTitle}, recruiters often look for: ${examples}.`,
                    deepLink: { section: 'skills' }
                });
            }

            // 3. Check Power Verbs in Bullets
            let verbMatchCount = 0;
            const allBullets = state.work.flatMap(w => w.bullets);
            allBullets.forEach(b => {
                const lower = b.toLowerCase();
                if (domain.powerVerbs.some(v => lower.includes(v.toLowerCase()))) {
                    verbMatchCount++;
                }
            });

            if (allBullets.length > 0 && verbMatchCount === 0) {
                const examples = domain.powerVerbs.slice(0, 3).join(', ');
                issues.push({
                    id: `domain-verb-gap-${domain.id}`,
                    type: 'DOMAIN_VERB_GAP',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'work',
                    message: `Try using industry-specific verbs like: ${examples}.`,
                    deepLink: { section: 'work' }
                });
            }

            // 4. Domain Specific Trigger Info (General Tip)
            // Show this if it's not already shown (maybe once per session? or always as a tip)
            // Let's make it an 'ai-insight' or 'suggestion' that always appears if relevant conditions met
            // Or just a general tip issue
            issues.push({
                id: `domain-tip-${domain.id}`,
                type: 'DOMAIN_TIP',
                severity: 'info',
                priority: 'ai-insight',
                tier: 2,
                section: 'summary', // General advice
                message: domain.triggerInfo,
                deepLink: { section: 'work' }
            });

            return issues;
        }
    }
];

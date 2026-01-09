import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

const LEADERSHIP_VERBS = ['mentored', 'strategized', 'managed', 'led', 'directed', 'orchestrated', 'oversaw', 'spearheaded', 'delegated', 'hired'];

export const seniorityRules: Rule[] = [
    {
        id: 'seniority-verb-check',
        type: 'SENIORITY_MISMATCH_VERB',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];

            // Check if user claims Seniority
            const isSenior = ['senior', 'lead', 'manager', 'director', 'head', 'vp', 'executive', 'chief'].some(title =>
                (state.targetJobTitle || '').toLowerCase().includes(title) ||
                (state.targetSeniority === 'senior' || state.targetSeniority === 'exec')
            );

            if (isSenior) {
                // Check recent roles for leadership verbs
                const recentWork = state.work.slice(0, 2); // Check last 2 roles
                let leadershipVerbCount = 0;

                recentWork.forEach(role => {
                    role.bullets.forEach(b => {
                        const lower = b.toLowerCase();
                        if (LEADERSHIP_VERBS.some(v => lower.includes(v))) {
                            leadershipVerbCount++;
                        }
                    });
                });

                if (leadershipVerbCount < 2 && recentWork.length > 0) {
                    issues.push({
                        id: 'seniority-verb-mismatch',
                        type: 'SENIORITY_MISMATCH_VERB',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 2,
                        section: 'work',
                        message: "As a Senior/Lead, show your leadership. Try adding verbs like 'Mentored', 'Strategized', or 'Managed'.",
                        deepLink: { section: 'work' }
                    });
                }
            }
            return issues;
        }
    }
];

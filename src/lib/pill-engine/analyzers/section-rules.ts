import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

export const sectionRules: Rule[] = [
    {
        id: 'empty-section',
        type: 'EMPTY_SECTION',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            // Check essential sections
            if (!state.summary || state.summary.trim().length === 0) {
                issues.push({
                    id: 'empty-summary',
                    type: 'EMPTY_SECTION',
                    severity: 'critical',
                    priority: 'critical',
                    tier: 1,
                    section: 'basics',
                    message: "Your Profile summary is empty. A 2-sentence hook increases recruiter interest.",
                    deepLink: { section: 'basics', field: 'summary' }
                });
            }
            if (state.work.length > 0) {
                // Check if any work item has no bullets or summary
                state.work.forEach(w => {
                    if (w.bullets.length === 0 && (!w.summary || w.summary.trim().length === 0)) {
                        issues.push({
                            id: `empty-work-${w.id}`,
                            type: 'EMPTY_SECTION',
                            severity: 'warning',
                            priority: 'critical',
                            tier: 1,
                            section: 'work',
                            sectionId: w.id,
                            message: `Role at ${w.company} is empty. Add bullet points.`,
                            deepLink: { section: 'work', sectionId: w.id }
                        });
                    }
                });
            }
            return issues;
        }
    },
    {
        id: 'low-bullet-count',
        type: 'LOW_BULLET_COUNT',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const recentRole = state.work.find(w => w.isCurrent) || state.work[0];
            if (recentRole && recentRole.bullets.length < 3) {
                issues.push({
                    id: `low-bullets-${recentRole.id}`,
                    type: 'LOW_BULLET_COUNT',
                    severity: 'critical',
                    priority: 'suggestion', // User said Suggestion in table, Critical in text. Using Suggestion per table.
                    tier: 1,
                    section: 'work',
                    sectionId: recentRole.id,
                    message: "Your most recent role is your strongest asset; aim for 3-5 bullets here.",
                    deepLink: { section: 'work', sectionId: recentRole.id }
                });
            }
            return issues;
        }
    },
    {
        id: 'unbalanced-detail',
        type: 'UNBALANCED_DETAIL',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            if (state.work.length > 1) {
                const recent = state.work[0];
                const older = state.work[1];
                // Heuristic: Older role has 2+ more bullets than recent
                if (older.bullets.length > recent.bullets.length + 1) {
                    issues.push({
                        id: `unbalanced-${recent.id}`,
                        type: 'UNBALANCED_DETAIL',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'work',
                        sectionId: recent.id,
                        message: "Recent job has less detail than an older one. Rebalance focus to your current skills.",
                        deepLink: { section: 'work', sectionId: recent.id }
                    });
                }
            }
            return issues;
        }
    },
    {
        id: 'missing-experience',
        type: 'MISSING_EXPERIENCE',
        evaluate: (state: ResumeState): Issue[] => {
            if (!state.work || state.work.length === 0) {
                return [{
                    id: 'missing-work-section',
                    type: 'MISSING_EXPERIENCE',
                    severity: 'critical',
                    priority: 'critical',
                    tier: 1,
                    section: 'work',
                    message: 'No Work Experience section found.',
                    deepLink: { section: 'work' }
                }];
            }
            return [];
        }
    },
    {
        id: 'section-order',
        type: 'SECTION_ORDER', // Placeholder logic, requires knowledge of actual section order which ResumeState doesn't fully have yet (it's normalized)
        evaluate: (state: ResumeState): Issue[] => {
            // Need CVStructure to do this properly. 
            // For now, return empty or implement if we pass Structure info to ResumeState later.
            return [];
        }
    },
    {
        id: 'dense-block',
        type: 'DENSE_BLOCK',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            // Check basics summary
            if (state.summary && state.summary.split('\n').length > 4) { // Heuristic: 4 newlines? Or words. 
                // Let's use word count variant for blocks since formatting varies
                // Actually user said "exceeds 4 lines". 
                if (state.summary.length > 400) { // Rough char count for 4 lines
                    issues.push({
                        id: 'dense-summary',
                        type: 'DENSE_BLOCK',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'basics',
                        message: "This summary block is dense. Keep it to 3-4 lines max.",
                        deepLink: { section: 'basics', field: 'summary' }
                    });
                }
            }
            // Check work summaries (if user puts paragraphs there instead of bullets)
            state.work.forEach(w => {
                if (w.summary && w.summary.length > 300) {
                    issues.push({
                        id: `dense-work-summary-${w.id}`,
                        type: 'DENSE_BLOCK',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'work',
                        sectionId: w.id,
                        message: "Introductory paragraph for this role is too long. Move details to bullets.",
                        deepLink: { section: 'work', sectionId: w.id, field: 'summary' }
                    });
                }
            });
            return issues;
        }
    }
];

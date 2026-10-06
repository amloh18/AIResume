import { Issue, ResumeState } from '../types';

export const analyzeSections = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { work, summary, skills } = state;

    // 1. Profile Summary Check
    if (!summary || summary.trim().length === 0) {
        issues.push({
            id: 'empty-summary',
            type: 'EMPTY_SECTION',
            severity: 'critical',
            priority: 'critical',
            tier: 1,
            section: 'basics',
            message: 'Your Profile summary is empty. A 2-sentence hook increases recruiter interest.',
            deepLink: { section: 'basics', field: 'summary' } // basics usually maps to summary
        });
    }

    // 2. Work Experience Checks
    if (work && work.length > 0) {
        // Sort by date (assuming ISO strings or mostly valid dates)
        // Just take the first one as "Recent" for heuristic simplicity or rely on isCurrent
        const recentRole = work.find(w => w.isCurrent) || work[0];

        if (recentRole) {
            // Bullet Count for recent role
            if (recentRole.bullets.length < 3) {
                issues.push({
                    id: `low-bullets-${recentRole.id}`,
                    type: 'LOW_BULLET_COUNT',
                    severity: 'critical',
                    priority: 'critical',
                    tier: 1,
                    section: 'work',
                    sectionId: recentRole.id,
                    message: 'This is your most recent role; aim for 3-5 bullets to showcase impact.',
                    deepLink: { section: 'work', sectionId: recentRole.id }
                });
            }

            // Detail Balance (Recent vs Older)
            if (work.length > 1) {
                const olderRole = work[1];
                if (recentRole.bullets.length < olderRole.bullets.length) {
                    issues.push({
                        id: `unbalanced-detail-${recentRole.id}`,
                        type: 'UNBALANCED_DETAIL',
                        severity: 'warning',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'work',
                        sectionId: recentRole.id,
                        message: 'Your most recent role should usually be the most detailed.',
                        deepLink: { section: 'work', sectionId: recentRole.id }
                    });
                }
            }
        }
    }

    // 3. Skills Section Check (Basic presence)
    if (!skills || skills.length === 0) {
        issues.push({
            id: 'empty-skills',
            type: 'EMPTY_SECTION',
            severity: 'critical',
            priority: 'critical',
            tier: 1,
            section: 'skills',
            message: 'You have no skills listed. Add at least 5 core technical skills.',
            deepLink: { section: 'skills' }
        });
    }

    return issues;
};

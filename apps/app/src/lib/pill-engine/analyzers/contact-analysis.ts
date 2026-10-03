// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { Issue, ResumeState } from '../types';

export const analyzeContact = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { basics } = state;

    if (!basics) return issues;

    // 1. Email Professionalism
    if (basics.email) {
        const emailLocalPart = basics.email.split('@')[0].toLowerCase();
        // Check for numbers at end (gamer123), silly prefixes
        if (/[0-9]{3,}$/.test(emailLocalPart) ||
            ['cute', 'sweet', 'boy', 'girl', 'gamer', 'luv'].some(s => emailLocalPart.includes(s))) {
            issues.push({
                id: 'unprofessional-email',
                type: 'UNPROFESSIONAL_EMAIL',
                severity: 'warning',
                priority: 'suggestion',
                tier: 1,
                section: 'basics',
                message: 'Consider using a professional firstname.lastname@ email.',
                deepLink: { section: 'basics', field: 'email' }
            });
        }
    }

    // 2. LinkedIn Presence
    const hasLinkedIn = basics.url?.includes('linkedin.com') ||
        basics.profiles?.some(p => p.url.includes('linkedin.com') || p.network.toLowerCase() === 'linkedin');

    if (!hasLinkedIn) {
        issues.push({
            id: 'missing-linkedin',
            type: 'MISSING_LINKEDIN',
            severity: 'warning',
            priority: 'suggestion',
            tier: 1,
            section: 'basics',
            message: 'Adding a LinkedIn profile can increase interview rates by 70%.',
            deepLink: { section: 'basics', field: 'url' }
        });
    }

    // 3. Portfolio / GitHub (Role specific check)
    const targetRole = state.targetJobTitle.toLowerCase();
    const needsPortfolio = ['developer', 'engineer', 'designer', 'artist', 'architect', 'analyst'].some(role => targetRole.includes(role));

    if (needsPortfolio) {
        const hasPortfolio = basics.url?.includes('github') ||
            basics.url?.includes('behance') ||
            basics.url?.includes('dribbble') ||
            basics.profiles?.some(p => ['github', 'behance', 'dribbble', 'portfolio'].includes(p.network.toLowerCase()));

        if (!hasPortfolio) {
            issues.push({
                id: 'missing-portfolio',
                type: 'MISSING_PORTFOLIO',
                severity: 'info',
                priority: 'suggestion',
                tier: 1,
                section: 'basics',
                message: `As a ${state.targetJobTitle || 'Candidate'}, a link to your GitHub or Portfolio is highly recommended.`,
                deepLink: { section: 'basics', field: 'url' }
            });
        }
    }

    // 4. Phone Format (Simple Check)
    if (basics.phone) {
        // Just checking if it has a country code style (+) or is just local
        if (!basics.phone.includes('+') && basics.phone.length > 5) {
            issues.push({
                id: 'phone-format',
                type: 'PHONE_FORMAT_ISSUE',
                severity: 'info',
                priority: 'suggestion',
                tier: 1,
                section: 'basics',
                message: 'Ensure your phone number includes a country code for international reach.',
                deepLink: { section: 'basics', field: 'phone' }
            });
        }
    }

    // 5. Location Check
    if (!basics.location?.city && !basics.location?.region) {
        issues.push({
            id: 'missing-location',
            type: 'MISSING_LOCATION',
            severity: 'warning',
            priority: 'critical',
            tier: 1,
            section: 'basics',
            message: 'Recruiters often filter by location—even for remote roles.',
            deepLink: { section: 'basics', field: 'location' }
        });
    }

    return issues;
};

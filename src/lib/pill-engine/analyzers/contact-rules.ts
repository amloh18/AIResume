import { Rule } from '../registry';
import { Issue, ResumeState } from '../types';

export const contactRules: Rule[] = [
    {
        id: 'unprofessional-email',
        type: 'UNPROFESSIONAL_EMAIL',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const email = state.basics?.email;
            if (email) {
                const localPart = email.split('@')[0].toLowerCase();
                if (/[0-9]{3,}$/.test(localPart) ||
                    ['cute', 'sweet', 'boy', 'girl', 'gamer', 'luv', 'hacker', 'ninja'].some(s => localPart.includes(s))) {
                    issues.push({
                        id: 'unprofessional-email',
                        type: 'UNPROFESSIONAL_EMAIL',
                        severity: 'warning',
                        priority: 'critical',
                        tier: 1,
                        section: 'basics',
                        message: "Consider using a professional `firstname.lastname@` email address.",
                        deepLink: { section: 'basics', field: 'email' }
                    });
                }
            }
            return issues;
        }
    },
    {
        id: 'missing-linkedin',
        type: 'MISSING_LINKEDIN',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const hasLinkedIn = state.basics?.url?.includes('linkedin.com') ||
                state.basics?.profiles?.some(p => p.url.includes('linkedin.com') || p.network.toLowerCase() === 'linkedin');
            if (!hasLinkedIn) {
                issues.push({
                    id: 'missing-linkedin',
                    type: 'MISSING_LINKEDIN',
                    severity: 'warning', // Critical per text, but usually suggestion via table? Table says Suggestion.
                    priority: 'suggestion',
                    tier: 1,
                    section: 'basics',
                    message: "Adding a LinkedIn profile can increase recruiter response rates by 70%.",
                    deepLink: { section: 'basics', field: 'url' }
                });
            }
            return issues;
        }
    },
    {
        id: 'missing-portfolio',
        type: 'MISSING_PORTFOLIO',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const role = state.targetJobTitle.toLowerCase();
            const needsPortfolio = /designer|developer|engineer|artist|architect/.test(role);

            if (needsPortfolio) {
                const hasPortfolio = state.basics?.url?.match(/github|behance|dribbble|kaggle|portfolio/i) ||
                    state.basics?.profiles?.some(p => /github|behance|dribbble|kaggle|portfolio/i.test(p.network) || /github|behance|dribbble|kaggle/i.test(p.url));

                if (!hasPortfolio) {
                    issues.push({
                        id: 'missing-portfolio',
                        type: 'MISSING_PORTFOLIO',
                        severity: 'info',
                        priority: 'suggestion',
                        tier: 1,
                        section: 'basics',
                        message: `For a ${state.targetJobTitle} role, a link to your GitHub or Portfolio is highly recommended.`,
                        deepLink: { section: 'basics', field: 'url' }
                    });
                }
            }
            return issues;
        }
    },
    {
        id: 'phone-format',
        type: 'PHONE_FORMAT',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const phone = state.basics?.phone;
            if (phone && phone.length > 6 && !phone.includes('+')) {
                issues.push({
                    id: 'phone-format',
                    type: 'PHONE_FORMAT',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 1,
                    section: 'basics',
                    message: "Ensure your phone number includes a country code (e.g. +1) for international reach.",
                    deepLink: { section: 'basics', field: 'phone' }
                });
            }
            return issues;
        }
    },
    {
        id: 'missing-location',
        type: 'MISSING_LOCATION',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];
            const loc = state.basics?.location;
            if (!loc || (!loc.city && !loc.region)) {
                issues.push({
                    id: 'missing-location',
                    type: 'MISSING_LOCATION',
                    severity: 'critical',
                    priority: 'critical',
                    tier: 1,
                    section: 'basics',
                    message: "No City/State/Country detected. Recruiters often filter by location.",
                    deepLink: { section: 'basics', field: 'location' }
                });
            }
            return issues;
        }
    },
    {
        id: 'missing-social-proof',
        type: 'MISSING_SOCIAL_PROOF',
        evaluate: (state: ResumeState): Issue[] => {
            const issues: Issue[] = [];

            // Check based on role type
            // Tech -> GitHub, Design -> Portfolio, Marketing -> Twitter/LinkedIn?
            // General -> LinkedIn

            const role = (state.targetJobTitle || '').toLowerCase();
            const profiles = state.basics?.profiles || [];
            const url = state.basics?.url || '';
            const allLinks = (profiles.map(p => p.url + p.network).join(' ') + url).toLowerCase();

            let missingProof = '';

            if (role.match(/developer|engineer|programmer|data/)) {
                if (!allLinks.includes('github') && !allLinks.includes('gitlab')) {
                    missingProof = 'GitHub';
                }
            } else if (role.match(/designer|creative|artist|ux|ui/)) {
                if (!allLinks.includes('portfolio') && !allLinks.includes('dribbble') && !allLinks.includes('behance')) {
                    missingProof = 'Portfolio';
                }
            } else {
                if (!allLinks.includes('linkedin')) {
                    missingProof = 'LinkedIn';
                }
            }

            if (missingProof) {
                issues.push({
                    id: 'missing-social-proof',
                    type: 'MISSING_SOCIAL_PROOF',
                    severity: 'info',
                    priority: 'suggestion',
                    tier: 2,
                    section: 'basics',
                    message: `Your profile is missing a ${missingProof} link. Social proof builds trust.`,
                    deepLink: { section: 'basics', field: 'url' }
                });
            }

            return issues;
        }
    }
];

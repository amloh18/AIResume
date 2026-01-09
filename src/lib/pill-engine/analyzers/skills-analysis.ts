import { Issue, ResumeState } from '../types';

const SOFT_SKILLS = new Set([
    'communication', 'teamwork', 'leadership', 'problem solving', 'time management',
    'adaptability', 'creativity', 'work ethic', 'detail oriented', 'hard working'
]);

export const analyzeSkills = (state: ResumeState): Issue[] => {
    const issues: Issue[] = [];
    const { skills, targetJobTitle } = state;

    if (!skills) return issues;

    // 1. Skill Count
    // Assuming skills is a flat list of strings in ResumeState (mapped from CV data)
    if (skills.length > 0 && skills.length < 5) {
        issues.push({
            id: 'low-skill-count',
            type: 'LOW_SKILL_COUNT',
            severity: 'warning',
            priority: 'critical',
            tier: 1,
            section: 'skills',
            message: `A ${targetJobTitle || 'Professional'} usually lists 8-12 core skills.`,
            deepLink: { section: 'skills' }
        });
    }

    // 2. Duplicate Skills
    const lowerSkills = skills.map(s => s.toLowerCase().trim());
    const duplicates = lowerSkills.filter((item, index) => lowerSkills.indexOf(item) !== index);
    if (duplicates.length > 0) {
        issues.push({
            id: 'duplicate-skill',
            type: 'DUPLICATE_SKILL',
            severity: 'info',
            priority: 'suggestion',
            tier: 1,
            section: 'skills',
            message: `You've listed '${duplicates[0]}' twice—let's clean that up.`,
            deepLink: { section: 'skills' }
        });
    }

    // 3. Soft Skills Heavy
    let softSkillCount = 0;
    lowerSkills.forEach(s => {
        if (SOFT_SKILLS.has(s)) softSkillCount++;
    });

    if (skills.length > 0 && softSkillCount > skills.length / 2) {
        issues.push({
            id: 'soft-skill-heavy',
            type: 'SOFT_SKILL_HEAVY',
            severity: 'info',
            priority: 'suggestion',
            tier: 1,
            section: 'skills',
            message: 'Keep soft skills to a minimum; show them through your bullets instead.',
            deepLink: { section: 'skills' }
        });
    }

    // 4. Missing Hard Skills (Generic Check)
    // Real check would need a job role map, but a generic check for tech roles:
    if (targetJobTitle && /developer|engineer|analyst|data/i.test(targetJobTitle)) {
        // Very basic check for tech keywords just to demonstrate logic
        // Ideally this comes from a larger dictionary or JD analysis
        const hasHardSkills = lowerSkills.some(s =>
            /java|python|sql|react|node|aws|docker|excel|tableau|c\+\+|c#|javascript|html|css/.test(s)
        );

        if (skills.length > 0 && !hasHardSkills) {
            issues.push({
                id: 'missing-hard-skills',
                type: 'MISSING_HARD_SKILLS',
                severity: 'warning',
                priority: 'suggestion',
                tier: 1,
                section: 'skills',
                message: 'Add technical tools/languages (e.g. Python, SQL) relevant to your role.',
                deepLink: { section: 'skills' }
            });
        }
    }

    return issues;
};

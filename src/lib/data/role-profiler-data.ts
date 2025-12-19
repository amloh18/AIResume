// Common job titles for autocomplete
export const COMMON_JOB_TITLES = [
    // Data & Analytics
    'Data Analyst',
    'Data Scientist',
    'Business Intelligence Analyst',
    'Data Engineer',
    'Analytics Manager',

    // Software Engineering
    'Software Engineer',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Mobile Developer',
    'QA Engineer',
    'Security Engineer',
    'Cloud Engineer',

    // Product & Design
    'Product Manager',
    'UX Designer',
    'UI Designer',
    'Product Designer',
    'Product Owner',
    'Graphic Designer',
    'Web Designer',

    // Marketing & Sales
    'Marketing Manager',
    'Digital Marketing Specialist',
    'Content Marketing Manager',
    'Sales Manager',
    'Account Executive',
    'Business Development Manager',
    'Social Media Manager',
    'SEO Specialist',
    'Brand Manager',

    // Operations & Management
    'Operations Manager',
    'Project Manager',
    'Program Manager',
    'Scrum Master',
    'HR Manager',
    'Finance Manager',
    'Supply Chain Manager',
    'Logistics Coordinator',

    // Education
    'Teacher',
    'Professor',
    'Principal',
    'School Administrator',
    'Curriculum Developer',
    'Education Coordinator',
    'Tutor',
    'Academic Advisor',

    // Healthcare
    'Nurse',
    'Registered Nurse',
    'Nurse Practitioner',
    'Physician',
    'Doctor',
    'Medical Assistant',
    'Physical Therapist',
    'Occupational Therapist',
    'Pharmacist',
    'Healthcare Administrator',

    // Finance & Accounting
    'Accountant',
    'Financial Analyst',
    'Financial Advisor',
    'Investment Banker',
    'Auditor',
    'Tax Specialist',
    'Bookkeeper',
    'CFO',
    'Controller',

    // Legal
    'Lawyer',
    'Attorney',
    'Paralegal',
    'Legal Assistant',
    'Compliance Officer',
    'Legal Counsel',

    // Customer Success
    'Customer Success Manager',
    'Technical Support Engineer',
    'Customer Service Representative',
    'Account Manager',
    'Client Relations Manager',

    // Consulting & Strategy
    'Business Consultant',
    'Management Consultant',
    'Strategy Consultant',
    'Financial Consultant',

    // Media & Communications
    'Journalist',
    'Content Writer',
    'Copywriter',
    'Editor',
    'Public Relations Manager',
    'Communications Manager',

    // Real Estate
    'Real Estate Agent',
    'Real Estate Broker',
    'Property Manager',

    // Executive
    'Chief Technology Officer',
    'Chief Product Officer',
    'Chief Marketing Officer',
    'Chief Executive Officer',
    'VP of Engineering',
    'VP of Product',
    'VP of Sales',
    'Director of Operations',
    'Director of Marketing',
    'Director of Finance'
];

// Seniority level definitions
export type SeniorityLevel = 'Beginner' | 'Experienced' | 'Professional' | 'Senior' | 'Executive';

export interface SeniorityLevelInfo {
    level: SeniorityLevel;
    description: string;
    yearsOfExperience: string;
    keywords: string[];
}

export const SENIORITY_LEVELS: SeniorityLevelInfo[] = [
    {
        level: 'Beginner',
        description: 'Entry-level or early career professional',
        yearsOfExperience: '0-2 years',
        keywords: ['learning', 'supporting', 'assisting', 'hands-on', 'training']
    },
    {
        level: 'Experienced',
        description: 'Mid-level professional with solid foundation',
        yearsOfExperience: '2-5 years',
        keywords: ['implementing', 'executing', 'contributing', 'collaborating', 'delivering']
    },
    {
        level: 'Professional',
        description: 'Seasoned professional with deep expertise',
        yearsOfExperience: '5-8 years',
        keywords: ['leading', 'designing', 'architecting', 'optimizing', 'mentoring']
    },
    {
        level: 'Senior',
        description: 'Senior professional with strategic impact',
        yearsOfExperience: '8-12 years',
        keywords: ['strategic', 'transforming', 'scaling', 'managing', 'influencing']
    },
    {
        level: 'Executive',
        description: 'Executive leadership role',
        yearsOfExperience: '12+ years',
        keywords: ['vision', 'driving', 'ROI', 'P&L', 'board', 'C-level']
    }
];

// Template recommendations based on seniority
export const TEMPLATE_SENIORITY_MAP: Record<SeniorityLevel, string[]> = {
    Beginner: ['TheModernCV', 'TechProBlue', 'DesignerModern'],
    Experienced: ['ProfessionalExtended', 'ElegantTimeline', 'DataDrivenPro'],
    Professional: ['ExecutiveProfessional', 'ProfessionalExtended', 'DataDrivenPro'],
    Senior: ['ExecutiveProfessional', 'ExecutiveStandard', 'ElegantTimeline'],
    Executive: ['ExecutiveProfessional', 'ExecutiveStandard']
};

// Search filter for job titles
export function filterJobTitles(query: string): string[] {
    if (!query) return COMMON_JOB_TITLES.slice(0, 10);

    const lowerQuery = query.toLowerCase();
    return COMMON_JOB_TITLES.filter(title =>
        title.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
}

// Get seniority info
export function getSeniorityInfo(level: SeniorityLevel): SeniorityLevelInfo | undefined {
    return SENIORITY_LEVELS.find(s => s.level === level);
}

// Get recommended templates for seniority level
export function getRecommendedTemplates(level: SeniorityLevel): string[] {
    return TEMPLATE_SENIORITY_MAP[level] || [];
}

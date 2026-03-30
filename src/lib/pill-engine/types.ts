export type IssueType =
    | 'EMPLOYMENT_GAP'
    | 'IRRELEVANT_ROLE'
    | 'MISSING_METRICS'
    | 'TENSE_GRAMMAR'
    | 'KEYWORD_GAP'
    | 'SENIORITY_MISMATCH'
    | 'KEYWORD_OVERDENSITY'
    | 'VISUAL_DENSITY'
    | 'MARKET_SKILL_GAP'
    | 'NARRATIVE_MISMATCH'
    | 'WIN_METRICS'
    | 'WIN_VERBS'
    // New Tier 1 Analyzers
    | 'WEAK_VERB'
    | 'BULLET_TOO_SHORT'
    | 'BULLET_TOO_LONG'
    | 'REPEATED_VERB'
    | 'VAGUE_ADJECTIVE'
    | 'PASSIVE_VOICE'
    | 'FIRST_PERSON_WE'
    | 'EMPTY_SECTION'
    | 'LOW_BULLET_COUNT'
    | 'UNBALANCED_DETAIL'
    | 'MISSING_EXPERIENCE'
    | 'SECTION_ORDER'
    | 'DENSE_BLOCK'
    | 'UNPROFESSIONAL_EMAIL'
    | 'MISSING_LINKEDIN'
    | 'MISSING_PORTFOLIO'
    | 'PHONE_FORMAT'
    | 'MISSING_LOCATION'
    | 'LOW_SKILL_COUNT'
    | 'SOFT_SKILL_HEAVY'
    | 'DUPLICATE_SKILL'
    | 'MISSING_GROUPING'
    | 'MISSING_TECH_STACK'
    | 'SUMMARY_TOO_LONG'
    | 'FIRST_PERSON_USAGE'
    | 'MISSING_JOB_TITLE'
    | 'MISSING_EXPERIENCE_YEARS'
    | 'GENERIC_OBJECTIVE'
    | 'CHRONOLOGY_ERROR'
    | 'DATE_GAP'
    | 'PRESENT_TENSE_PAST'
    | 'SHORT_TENURE'
    | 'HIGH_SCHOOL'
    | 'LOW_GPA'
    | 'MISSING_GRAD_DATE'
    | 'FUTURE_DATE_LABEL'
    | 'MISSING_HARD_SKILLS'
    // Domain Specific
    | 'DOMAIN_SKILL_GAP'
    | 'DOMAIN_VERB_GAP'
    | 'DOMAIN_METRIC_GAP'
    | 'DOMAIN_TIP'
    // Power Features
    | 'SENIORITY_MISMATCH_VERB'
    | 'READABILITY_F_PATTERN'
    | 'SKILL_EXP_MISMATCH'
    | 'MISSING_SOCIAL_PROOF'
    | 'XYZ_FORMULA_SUGGESTION'
    | 'ATS_KEYWORD_DENSITY'
    | 'IMPROVEMENT'
    | 'CRITICAL';

export type IssuePriority = 'critical' | 'suggestion' | 'ai-insight';

export type IssueSeverity = 'info' | 'warning' | 'critical' | 'positive';

export type IssueTier = 1 | 2 | 3;

export type IssueScoreCategory = 'completeness' | 'impact' | 'metrics' | 'formatting' | 'keywords';

export interface DeepLink {
    section: 'work' | 'skills' | 'summary' | 'education' | 'projects' | 'basics';
    sectionId?: string;
    field?: string; // Specific field name if applicable (e.g., 'startDate')
}

export interface Issue {
    id: string;
    type: IssueType;
    severity: IssueSeverity;
    priority?: IssuePriority;
    tier: IssueTier;
    section: 'work' | 'skills' | 'summary' | 'education' | 'projects' | 'basics';
    sectionId?: string;
    bulletIndex?: number;
    message: string;
    meta?: Record<string, any>;
    suggestedFixId?: string;
    deepLink?: DeepLink; // For actionable CTA
    scoreCategory?: IssueScoreCategory; // Maps to score breakdown type
}

export interface ResumeState {
    targetJobTitle: string;
    targetRegion?: 'dubai' | 'uk' | 'india' | 'usa';
    targetSeniority?: 'junior' | 'mid' | 'senior' | 'exec';
    skills: string[];
    work: EnrichedWorkExperience[];
    projects: EnrichedProject[];
    summary: string;
    basics?: {
        email: string;
        phone: string;
        url: string; // LinkedIn or Website
        location?: {
            city: string;
            region: string;
        };
        profiles?: {
            network: string;
            url: string;
        }[];
    };
    education?: {
        id: string;
        institution: string;
        area: string;
        studyType: string;
        startDate: string;
        endDate: string;
        score: string;
        isCurrent: boolean;
    }[];
}

export interface EnrichedWorkExperience {
    id: string;
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    summary: string;
    bullets: string[];
    hiddenFromATS?: boolean;
}

export interface EnrichedProject {
    id: string;
    name: string;
    description: string;
    bullets: string[];
}

export type AnalyzerFn = (state: ResumeState) => Issue[];

export interface PillConfig {
    quietMode?: boolean; // If true, rely on blur/idle instead of aggressive debounce
    enabledAnalyzers?: IssueType[];
}

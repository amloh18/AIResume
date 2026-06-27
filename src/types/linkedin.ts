/**
 * LinkedIn Enhancer Tool - Type Definitions
 * Based on linkedin.md JSON schema and 2026 standards
 */

// User context for tone and targeting
export interface LinkedInUserContext {
    tone_selection: 'Professional' | 'Startup-Friendly' | 'Executive' | 'Conversational';
    target_industry: string;
    career_goal: string;
}

// Section state machine enum
export type LinkedInSectionStatus = 'ORIGINAL' | 'GENERATED' | 'ACCEPTED' | 'APPLIED';

// Hero section (headline, location)
export interface LinkedInHeroSection {
    status: LinkedInSectionStatus;
    current: {
        headline: string;
        location: string;
        name?: string;
        photoUrl?: string;
        bannerUrl?: string;
        connections?: string;
    };
    enhanced: {
        headline: string;
        seo_keywords_used: string[];
        location_suggestion: string;
        rationale: string;
        confidence_score?: number;
    };
}

// About section with hook/body/CTA
export interface LinkedInAboutSection {
    status: LinkedInSectionStatus;
    current: string;
    enhanced: {
        hook: string;
        body: string;
        cta: string;
        character_count: number;
        narrative_strategy: string;
        confidence_score?: number;
    };
}

// Experience entry
export interface LinkedInExperienceEntry {
    id: string;
    status?: LinkedInSectionStatus;
    original_data: {
        role: string;
        company: string;
        duration?: string;
        location?: string;
        description?: string;
        employment_type?: string;
    };
    enhanced_data: {
        title: string;
        description_bullets: string[];
        tagged_skills: string[];
        improvement_notes: string;
        confidence_score?: number;
    };
}

// Education entry
export interface LinkedInEducationEntry {
    id: string;
    institution: string;
    degree: string;
    field?: string;
    grade?: string;
    activities?: string;
}

// Skills matrix
export interface LinkedInSkillsMatrix {
    current: string[];
    suggested_additions: string[];
    verified_badges_eligible: string[];
    top_3_priority: string[];
    industry_specific: string[];
    interpersonal: string[];
}

// Languages section
export interface LinkedInLanguagesSection {
    languages: Array<{
        name: string;
        proficiency: string;
    }>;
}

// Project entry
export interface LinkedInProjectEntry {
    id: string;
    status?: LinkedInSectionStatus;
    original_data: {
        title: string;
        date_range: string;
        associated_with?: string; // e.g., "University of the West of England"
        url?: string;
        description?: string;
    };
    enhanced_data: {
        title: string;
        description_bullets: string[];
        tagged_skills: string[];
        improvement_notes: string;
        confidence_score?: number;
    };
}

// Side card recommendations
export interface LinkedInSideCards {
    affiliate_courses: Array<{
        title: string;
        provider: string;
        affiliate_url: string;
        logic: string;
    }>;
    networking: Array<{
        group_name: string;
        members: string;
    }>;
    career_pathway: {
        next_step: string;
        missing_skill: string;
    };
    profile_strength_score: number;
    skill_gap_analysis: string;
    recommended_actions: string[];
}

// AI Audit response
export interface LinkedInAudit {
    detected_edge_cases: string[];
    strategy_applied: string;
}

// Career guide from AI
export interface LinkedInCareerGuide {
    salary_insight: string;
    next_steps: string[];
    missing_credentials: string[];
}

// Profile sections container
export interface LinkedInProfileSections {
    hero: LinkedInHeroSection;
    about: LinkedInAboutSection;
    experience: LinkedInExperienceEntry[];
    education: LinkedInEducationEntry[];
    projects: LinkedInProjectEntry[];
    skills_matrix: LinkedInSkillsMatrix;
    languages: LinkedInLanguagesSection;
}

// Main state schema
export interface LinkedInEnhancerState {
    version: string;
    isLoading: boolean;
    isEnhancing: boolean;
    showEnhancingOverlay: boolean; // Only show overlay on regenerate, not initial load
    error: string | null;
    user_context: LinkedInUserContext;
    sections: LinkedInProfileSections;
    side_cards: LinkedInSideCards;
    audit: LinkedInAudit | null;
    career_guide: LinkedInCareerGuide | null;
    selectedCvId: string | null;
    selectedCvType: 'master' | 'standalone' | null;
}

// CV Selection item
export interface CVSelectionItem {
    id: string;
    name: string;
    type: 'master' | 'standalone';
    updatedAt: string;
}

// Character limits for LinkedIn fields
export const LINKEDIN_LIMITS = {
    HEADLINE: 220,
    HEADLINE_VISIBLE: 60, // First 60 chars most visible in search
    ABOUT: 2600,
    ABOUT_HOOK: 200, // Mobile cutoff zone
    EXPERIENCE_DESC: 2000,
    EXPERIENCE_TITLE: 100,
    SKILLS_TOP: 3,
    SKILLS_MAX: 50,
} as const;

// Color palette for LinkedIn styling
export const LINKEDIN_COLORS = {
    BACKGROUND: '#f3f2ee',
    PRIMARY_BLUE: '#0a66c2',
    TEXT_PRIMARY: '#000000e6',
    TEXT_SECONDARY: '#00000099',
    CARD_BACKGROUND: '#ffffff',
    BORDER: '#0000001a',
    SUCCESS: '#057642',
    WARNING: '#b24020',
} as const;

// @ts-nocheck
/**
 * Enhanced Resume JSON Schema
 * 
 * This is the canonical data structure for all resume data in AI Resume 2.0.
 * All layers (forms, editor, preview, AI) read from and write to this structure.
 * 
 * Key Features:
 * - Every node has a unique ID (UUID v4)
 * - Nested structure with parent-child references
 * - Version tracking for conflict resolution
 * - Backward compatibility with existing UnifiedCVDataStructure
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Enhanced Resume JSON - Single Source of Truth
 */
export interface EnhancedResumeJSON {
    meta: ResumeMeta;
    basics: ResumeBasics;
    sections: ResumeSection[];
}

/**
 * Resume metadata
 */
export interface ResumeMeta {
    id: string; // UUID v4
    templateId: string;
    theme: ResumeTheme;
    version: number;
    lastModified: string; // ISO 8601 timestamp
    createdAt: string; // ISO 8601 timestamp
}

/**
 * Theme configuration
 */
export interface ResumeTheme {
    font: string;
    spacing: number;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
}

/**
 * Personal information (basics)
 */
export interface ResumeBasics {
    id: string; // UUID v4
    name: string;
    label: string; // Professional title
    image: string; // URL to profile image
    email: string;
    phone: string;
    url: string; // Personal website
    summary: string;
    location: ResumeLocation;
    profiles: ResumeProfile[];
}

/**
 * Location information
 */
export interface ResumeLocation {
    id: string; // UUID v4
    address: string;
    postalCode: string;
    city: string;
    countryCode: string;
    region: string;
}

/**
 * Social profile
 */
export interface ResumeProfile {
    id: string; // UUID v4
    network: string; // e.g., "linkedin", "github"
    username: string;
    url: string;
}

// ============================================================================
// SECTION TYPES
// ============================================================================

/**
 * Section types
 */
export type SectionType =
    | 'experience'
    | 'education'
    | 'skills'
    | 'projects'
    | 'certificates'
    | 'languages'
    | 'volunteer'
    | 'awards'
    | 'publications'
    | 'interests'
    | 'references';

/**
 * Resume section (generic)
 */
export interface ResumeSection {
    id: string; // UUID v4
    type: SectionType;
    visible: boolean;
    column?: 'sidebar' | 'main';
    order: number;
    items: ResumeItem[];
}

/**
 * Resume item (generic base)
 */
export interface ResumeItem {
    id: string; // UUID v4
    [key: string]: any; // Section-specific fields
}

// ============================================================================
// SECTION-SPECIFIC ITEM TYPES
// ============================================================================

/**
 * Experience item
 */
export interface ExperienceItem extends ResumeItem {
    company: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    current: boolean;
    summary: string;
    highlights: BulletPoint[];
}

/**
 * Education item
 */
export interface EducationItem extends ResumeItem {
    institution: string;
    url: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
    courses: string[];
}

/**
 * Skills item
 */
export interface SkillsItem extends ResumeItem {
    category: string;
    skills: Skill[];
}

/**
 * Individual skill
 */
export interface Skill {
    id: string; // UUID v4
    name: string;
    level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    keywords: string[];
}

/**
 * Project item
 */
export interface ProjectItem extends ResumeItem {
    name: string;
    description: string;
    highlights: BulletPoint[];
    keywords: string[];
    startDate: string;
    endDate: string;
    url: string;
}

/**
 * Certificate item
 */
export interface CertificateItem extends ResumeItem {
    name: string;
    date: string;
    issuer: string;
    url: string;
    description: string;
}

/**
 * Language item
 */
export interface LanguageItem extends ResumeItem {
    language: string;
    fluency: 'native' | 'fluent' | 'intermediate' | 'basic';
}

/**
 * Volunteer item
 */
export interface VolunteerItem extends ResumeItem {
    organization: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: BulletPoint[];
}

/**
 * Award item
 */
export interface AwardItem extends ResumeItem {
    title: string;
    date: string;
    awarder: string;
    summary: string;
}

/**
 * Publication item
 */
export interface PublicationItem extends ResumeItem {
    name: string;
    publisher: string;
    releaseDate: string;
    url: string;
    summary: string;
}

/**
 * Interest item
 */
export interface InterestItem extends ResumeItem {
    name: string;
    keywords: string[];
}

/**
 * Reference item
 */
export interface ReferenceItem extends ResumeItem {
    name: string;
    reference: string;
}

/**
 * Bullet point (for highlights)
 */
export interface BulletPoint {
    id: string; // UUID v4
    text: string;
    metrics?: {
        value: number;
        unit: string;
        context: string;
    };
}

// ============================================================================
// CHANGE TRACKING TYPES
// ============================================================================

/**
 * Change source
 */
export type ChangeSource = 'form' | 'editor' | 'ai' | 'sync' | 'migration';

/**
 * Change type
 */
export type ChangeType = 'update' | 'add' | 'remove' | 'reorder';

/**
 * Change payload for tracking modifications
 */
export interface ChangePayload {
    type: ChangeType;
    path: string; // JSON path to changed node
    value?: any;
    previousValue?: any;
    metadata: {
        nodeId: string;
        sectionId: string;
        itemId?: string;
        bulletId?: string;
    };
    timestamp: string; // ISO 8601
    source: ChangeSource;
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate a new UUID v4
 */
export const generateId = (): string => uuidv4();

/**
 * Generate IDs for an entire resume structure
 */
export const generateResumeIds = (resume: Partial<EnhancedResumeJSON>): EnhancedResumeJSON => {
    return {
        meta: {
            id: resume.meta?.id || generateId(),
            templateId: resume.meta?.templateId || 'default',
            theme: resume.meta?.theme || DEFAULT_THEME,
            version: resume.meta?.version || 1,
            lastModified: new Date().toISOString(),
            createdAt: resume.meta?.createdAt || new Date().toISOString()
        },
        basics: generateBasicsIds(resume.basics),
        sections: (resume.sections || []).map(section => generateSectionIds(section))
    };
};

/**
 * Generate IDs for basics section
 */
const generateBasicsIds = (basics?: Partial<ResumeBasics>): ResumeBasics => {
    return {
        id: basics?.id || generateId(),
        name: basics?.name || '',
        label: basics?.label || '',
        image: basics?.image || '',
        email: basics?.email || '',
        phone: basics?.phone || '',
        url: basics?.url || '',
        summary: basics?.summary || '',
        location: {
            id: basics?.location?.id || generateId(),
            address: basics?.location?.address || '',
            postalCode: basics?.location?.postalCode || '',
            city: basics?.location?.city || '',
            countryCode: basics?.location?.countryCode || '',
            region: basics?.location?.region || ''
        },
        profiles: (basics?.profiles || []).map(profile => ({
            id: profile.id || generateId(),
            network: profile.network || '',
            username: profile.username || '',
            url: profile.url || ''
        }))
    };
};

/**
 * Generate IDs for a section
 */
const generateSectionIds = (section: Partial<ResumeSection>): ResumeSection => {
    return {
        id: section.id || generateId(),
        type: section.type || 'experience',
        visible: section.visible ?? true,
        column: section.column,
        order: section.order ?? 0,
        items: (section.items || []).map(item => generateItemIds(item, section.type || 'experience'))
    };
};

/**
 * Generate IDs for an item based on section type
 */
const generateItemIds = (item: Partial<ResumeItem>, sectionType: SectionType): ResumeItem => {
    const baseItem = {
        id: item.id || generateId()
    };

    switch (sectionType) {
        case 'experience':
            return {
                ...baseItem,
                company: item.company || '',
                position: item.position || '',
                url: item.url || '',
                startDate: item.startDate || '',
                endDate: item.endDate || '',
                current: item.current ?? false,
                summary: item.summary || '',
                highlights: (item.highlights || []).map(bullet => ({
                    id: bullet.id || generateId(),
                    text: bullet.text || '',
                    metrics: bullet.metrics
                }))
            } as ExperienceItem;

        case 'education':
            return {
                ...baseItem,
                institution: item.institution || '',
                url: item.url || '',
                area: item.area || '',
                studyType: item.studyType || '',
                startDate: item.startDate || '',
                endDate: item.endDate || '',
                score: item.score || '',
                courses: item.courses || []
            } as EducationItem;

        case 'skills':
            return {
                ...baseItem,
                category: item.category || '',
                skills: (item.skills || []).map(skill => ({
                    id: skill.id || generateId(),
                    name: skill.name || '',
                    level: skill.level,
                    keywords: skill.keywords || []
                }))
            } as SkillsItem;

        case 'projects':
            return {
                ...baseItem,
                name: item.name || '',
                description: item.description || '',
                highlights: (item.highlights || []).map(bullet => ({
                    id: bullet.id || generateId(),
                    text: bullet.text || '',
                    metrics: bullet.metrics
                })),
                keywords: item.keywords || [],
                startDate: item.startDate || '',
                endDate: item.endDate || '',
                url: item.url || ''
            } as ProjectItem;

        case 'certificates':
            return {
                ...baseItem,
                name: item.name || '',
                date: item.date || '',
                issuer: item.issuer || '',
                url: item.url || '',
                description: item.description || ''
            } as CertificateItem;

        case 'languages':
            return {
                ...baseItem,
                language: item.language || '',
                fluency: item.fluency || 'intermediate'
            } as LanguageItem;

        case 'volunteer':
            return {
                ...baseItem,
                organization: item.organization || '',
                position: item.position || '',
                url: item.url || '',
                startDate: item.startDate || '',
                endDate: item.endDate || '',
                summary: item.summary || '',
                highlights: (item.highlights || []).map(bullet => ({
                    id: bullet.id || generateId(),
                    text: bullet.text || '',
                    metrics: bullet.metrics
                }))
            } as VolunteerItem;

        case 'awards':
            return {
                ...baseItem,
                title: item.title || '',
                date: item.date || '',
                awarder: item.awarder || '',
                summary: item.summary || ''
            } as AwardItem;

        case 'publications':
            return {
                ...baseItem,
                name: item.name || '',
                publisher: item.publisher || '',
                releaseDate: item.releaseDate || '',
                url: item.url || '',
                summary: item.summary || ''
            } as PublicationItem;

        case 'interests':
            return {
                ...baseItem,
                name: item.name || '',
                keywords: item.keywords || []
            } as InterestItem;

        case 'references':
            return {
                ...baseItem,
                name: item.name || '',
                reference: item.reference || ''
            } as ReferenceItem;

        default:
            return baseItem;
    }
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default theme configuration
 */
export const DEFAULT_THEME: ResumeTheme = {
    font: 'Inter',
    spacing: 1.2,
    primaryColor: '#000000',
    secondaryColor: '#666666',
    backgroundColor: '#ffffff',
    fontSize: '11pt',
    lineHeight: '1.2'
};

/**
 * Default empty resume structure
 */
export const DEFAULT_ENHANCED_RESUME: EnhancedResumeJSON = {
    meta: {
        id: generateId(),
        templateId: 'default',
        theme: DEFAULT_THEME,
        version: 1,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString()
    },
    basics: {
        id: generateId(),
        name: '',
        label: '',
        image: '',
        email: '',
        phone: '',
        url: '',
        summary: '',
        location: {
            id: generateId(),
            address: '',
            postalCode: '',
            city: '',
            countryCode: '',
            region: ''
        },
        profiles: []
    },
    sections: []
};

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

/**
 * JSON Schema for validating enhanced resume structure
 */
export const ENHANCED_RESUME_VALIDATION_SCHEMA = {
    type: 'object',
    required: ['meta', 'basics', 'sections'],
    properties: {
        meta: {
            type: 'object',
            required: ['id', 'templateId', 'theme', 'version', 'lastModified', 'createdAt'],
            properties: {
                id: { type: 'string', format: 'uuid' },
                templateId: { type: 'string' },
                theme: {
                    type: 'object',
                    required: ['font', 'spacing', 'primaryColor', 'secondaryColor', 'backgroundColor', 'fontSize', 'lineHeight'],
                    properties: {
                        font: { type: 'string' },
                        spacing: { type: 'number' },
                        primaryColor: { type: 'string' },
                        secondaryColor: { type: 'string' },
                        backgroundColor: { type: 'string' },
                        fontSize: { type: 'string' },
                        lineHeight: { type: 'string' }
                    }
                },
                version: { type: 'number' },
                lastModified: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' }
            }
        },
        basics: {
            type: 'object',
            required: ['id', 'name', 'email'],
            properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', minLength: 1 },
                label: { type: 'string' },
                image: { type: 'string' },
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
                url: { type: 'string' },
                summary: { type: 'string' },
                location: {
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        address: { type: 'string' },
                        postalCode: { type: 'string' },
                        city: { type: 'string' },
                        countryCode: { type: 'string' },
                        region: { type: 'string' }
                    }
                },
                profiles: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['id', 'network', 'username', 'url'],
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            network: { type: 'string' },
                            username: { type: 'string' },
                            url: { type: 'string' }
                        }
                    }
                }
            }
        },
        sections: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'type', 'visible', 'order', 'items'],
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    type: {
                        type: 'string',
                        enum: ['experience', 'education', 'skills', 'projects', 'certificates', 'languages', 'volunteer', 'awards', 'publications', 'interests', 'references']
                    },
                    visible: { type: 'boolean' },
                    column: { type: 'string', enum: ['sidebar', 'main'] },
                    order: { type: 'number' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['id'],
                            properties: {
                                id: { type: 'string', format: 'uuid' }
                            }
                        }
                    }
                }
            }
        }
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a node by its ID from the resume
 */
export const getNodeById = (resume: EnhancedResumeJSON, nodeId: string): any => {
    // Check meta
    if (resume.meta.id === nodeId) return resume.meta;

    // Check basics
    if (resume.basics.id === nodeId) return resume.basics;
    if (resume.basics.location.id === nodeId) return resume.basics.location;

    const profile = resume.basics.profiles.find(p => p.id === nodeId);
    if (profile) return profile;

    // Check sections
    for (const section of resume.sections) {
        if (section.id === nodeId) return section;

        for (const item of section.items) {
            if (item.id === nodeId) return item;

            // Check highlights (for experience, volunteer, projects)
            if ('highlights' in item && Array.isArray(item.highlights)) {
                const highlight = item.highlights.find((h: BulletPoint) => h.id === nodeId);
                if (highlight) return highlight;
            }

            // Check skills (for skills section)
            if ('skills' in item && Array.isArray(item.skills)) {
                const skill = item.skills.find((s: Skill) => s.id === nodeId);
                if (skill) return skill;
            }
        }
    }

    return null;
};

/**
 * Get section by ID
 */
export const getSectionById = (resume: EnhancedResumeJSON, sectionId: string): ResumeSection | null => {
    return resume.sections.find(s => s.id === sectionId) || null;
};

/**
 * Get item by ID
 */
export const getItemById = (resume: EnhancedResumeJSON, itemId: string): ResumeItem | null => {
    for (const section of resume.sections) {
        const item = section.items.find(i => i.id === itemId);
        if (item) return item;
    }
    return null;
};

/**
 * Resolve JSON path to value
 */
export const resolvePath = (resume: EnhancedResumeJSON, path: string): any => {
    const parts = path.split('.');
    let current: any = resume;

    for (const part of parts) {
        // Handle array indices
        const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, key, index] = arrayMatch;
            current = current[key][parseInt(index)];
        } else {
            current = current[part];
        }

        if (current === undefined) {
            return undefined;
        }
    }

    return current;
};

/**
 * Check if resume has any content
 */
export const hasContent = (resume: EnhancedResumeJSON): boolean => {
    // Check basics
    if (resume.basics.name || resume.basics.email || resume.basics.summary) {
        return true;
    }

    // Check sections
    for (const section of resume.sections) {
        if (section.items.length > 0) {
            return true;
        }
    }

    return false;
};

/**
 * Get section count
 */
export const getSectionCount = (resume: EnhancedResumeJSON): number => {
    return resume.sections.length;
};

/**
 * Get total item count
 */
export const getTotalItemCount = (resume: EnhancedResumeJSON): number => {
    return resume.sections.reduce((total, section) => total + section.items.length, 0);
};

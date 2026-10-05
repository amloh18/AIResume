/**
 * Enhanced Resume Migration Utilities
 * 
 * This module provides migration functions to convert existing
 * UnifiedCVDataStructure to the new EnhancedResumeJSON format.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import {
    EnhancedResumeJSON,
    ResumeMeta,
    ResumeBasics,
    ResumeSection,
    ResumeItem,
    ExperienceItem,
    EducationItem,
    SkillsItem,
    ProjectItem,
    CertificateItem,
    LanguageItem,
    VolunteerItem,
    AwardItem,
    PublicationItem,
    InterestItem,
    ReferenceItem,
    BulletPoint,
    Skill,
    generateId,
    DEFAULT_THEME
} from '../../types/enhanced-resume-schema';

/**
 * Migrate UnifiedCVDataStructure to EnhancedResumeJSON
 * 
 * This function converts the existing flat structure to the new
 * enhanced format with unique IDs on all nodes.
 */
export function migrateToEnhancedSchema(
    legacyData: UnifiedCVDataStructure,
    templateId: string = 'default'
): EnhancedResumeJSON {
    return {
        meta: migrateMeta(legacyData, templateId),
        basics: migrateBasics(legacyData.basics),
        sections: migrateSections(legacyData)
    };
}

/**
 * Migrate metadata
 */
function migrateMeta(
    legacyData: UnifiedCVDataStructure,
    templateId: string
): ResumeMeta {
    return {
        id: generateId(),
        templateId,
        theme: { ...DEFAULT_THEME },
        version: 1,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
}

/**
 * Migrate basics section
 */
function migrateBasics(basics: UnifiedCVDataStructure['basics']): ResumeBasics {
    return {
        id: generateId(),
        name: basics.name || '',
        label: basics.label || '',
        image: basics.image || '',
        email: basics.email || '',
        phone: basics.phone || '',
        url: basics.url || '',
        summary: basics.summary || '',
        location: {
            id: generateId(),
            address: basics.location?.address || '',
            postalCode: basics.location?.postalCode || '',
            city: basics.location?.city || '',
            countryCode: basics.location?.countryCode || '',
            region: basics.location?.region || ''
        },
        profiles: (basics.profiles || []).map(profile => ({
            id: generateId(),
            network: profile.network || '',
            username: profile.username || '',
            url: profile.url || ''
        }))
    };
}

/**
 * Migrate all sections
 */
function migrateSections(legacyData: UnifiedCVDataStructure): ResumeSection[] {
    const sections: ResumeSection[] = [];
    let order = 0;

    // Work experience
    if (legacyData.work && legacyData.work.length > 0) {
        sections.push({
            id: generateId(),
            type: 'experience',
            visible: true,
            order: order++,
            items: legacyData.work.map(work => migrateWorkExperience(work))
        });
    }

    // Education
    if (legacyData.education && legacyData.education.length > 0) {
        sections.push({
            id: generateId(),
            type: 'education',
            visible: true,
            order: order++,
            items: legacyData.education.map(edu => migrateEducation(edu))
        });
    }

    // Skills
    if (legacyData.skills && legacyData.skills.length > 0) {
        sections.push({
            id: generateId(),
            type: 'skills',
            visible: true,
            order: order++,
            items: legacyData.skills.map(skill => migrateSkills(skill))
        });
    }

    // Projects
    if (legacyData.projects && legacyData.projects.length > 0) {
        sections.push({
            id: generateId(),
            type: 'projects',
            visible: true,
            order: order++,
            items: legacyData.projects.map(proj => migrateProject(proj))
        });
    }

    // Certificates
    if (legacyData.certificates && legacyData.certificates.length > 0) {
        sections.push({
            id: generateId(),
            type: 'certificates',
            visible: true,
            order: order++,
            items: legacyData.certificates.map(cert => migrateCertificate(cert))
        });
    }

    // Languages
    if (legacyData.languages && legacyData.languages.length > 0) {
        sections.push({
            id: generateId(),
            type: 'languages',
            visible: true,
            order: order++,
            items: legacyData.languages.map(lang => migrateLanguage(lang))
        });
    }

    // Volunteer
    if (legacyData.volunteer && legacyData.volunteer.length > 0) {
        sections.push({
            id: generateId(),
            type: 'volunteer',
            visible: true,
            order: order++,
            items: legacyData.volunteer.map(vol => migrateVolunteer(vol))
        });
    }

    // Awards
    if (legacyData.awards && legacyData.awards.length > 0) {
        sections.push({
            id: generateId(),
            type: 'awards',
            visible: true,
            order: order++,
            items: legacyData.awards.map(award => migrateAward(award))
        });
    }

    // Publications
    if (legacyData.publications && legacyData.publications.length > 0) {
        sections.push({
            id: generateId(),
            type: 'publications',
            visible: true,
            order: order++,
            items: legacyData.publications.map(pub => migratePublication(pub))
        });
    }

    // Interests
    if (legacyData.interests && legacyData.interests.length > 0) {
        sections.push({
            id: generateId(),
            type: 'interests',
            visible: true,
            order: order++,
            items: legacyData.interests.map(interest => migrateInterest(interest))
        });
    }

    // References
    if (legacyData.references && legacyData.references.length > 0) {
        sections.push({
            id: generateId(),
            type: 'references',
            visible: true,
            order: order++,
            items: legacyData.references.map(ref => migrateReference(ref))
        });
    }

    return sections;
}

/**
 * Migrate work experience item
 */
function migrateWorkExperience(work: UnifiedCVDataStructure['work'][0]): ExperienceItem {
    return {
        id: generateId(),
        company: work.name || '',
        position: work.position || '',
        url: work.url || '',
        startDate: work.startDate || '',
        endDate: work.endDate || '',
        current: !work.endDate,
        summary: work.summary || '',
        highlights: (work.highlights || []).map(text => ({
            id: generateId(),
            text
        }))
    };
}

/**
 * Migrate education item
 */
function migrateEducation(edu: UnifiedCVDataStructure['education'][0]): EducationItem {
    return {
        id: generateId(),
        institution: edu.institution || '',
        url: edu.url || '',
        area: edu.area || '',
        studyType: edu.studyType || '',
        startDate: edu.startDate || '',
        endDate: edu.endDate || '',
        score: edu.score || '',
        courses: edu.courses || []
    };
}

/**
 * Migrate skills item
 */
function migrateSkills(skill: UnifiedCVDataStructure['skills'][0]): SkillsItem {
    return {
        id: generateId(),
        category: skill.category || '',
        skills: (skill.skills || []).map(s => ({
            id: generateId(),
            name: s,
            keywords: []
        }))
    };
}

/**
 * Migrate project item
 */
function migrateProject(proj: UnifiedCVDataStructure['projects'][0]): ProjectItem {
    return {
        id: generateId(),
        name: proj.name || '',
        description: proj.description || '',
        highlights: (proj.highlights || []).map(text => ({
            id: generateId(),
            text
        })),
        keywords: proj.keywords || [],
        startDate: proj.startDate || '',
        endDate: proj.endDate || '',
        url: proj.url || ''
    };
}

/**
 * Migrate certificate item
 */
function migrateCertificate(cert: UnifiedCVDataStructure['certificates'][0]): CertificateItem {
    return {
        id: generateId(),
        name: cert.name || '',
        date: cert.date || '',
        issuer: cert.issuer || '',
        url: cert.url || '',
        description: cert.description || ''
    };
}

/**
 * Migrate language item
 */
function migrateLanguage(lang: UnifiedCVDataStructure['languages'][0]): LanguageItem {
    return {
        id: generateId(),
        language: lang.language || '',
        fluency: (lang.fluency as LanguageItem['fluency']) || 'intermediate'
    };
}

/**
 * Migrate volunteer item
 */
function migrateVolunteer(vol: UnifiedCVDataStructure['volunteer'][0]): VolunteerItem {
    return {
        id: generateId(),
        organization: vol.organization || '',
        position: vol.position || '',
        url: vol.url || '',
        startDate: vol.startDate || '',
        endDate: vol.endDate || '',
        summary: vol.summary || '',
        highlights: (vol.highlights || []).map(text => ({
            id: generateId(),
            text
        }))
    };
}

/**
 * Migrate award item
 */
function migrateAward(award: UnifiedCVDataStructure['awards'][0]): AwardItem {
    return {
        id: generateId(),
        title: award.title || '',
        date: award.date || '',
        awarder: award.awarder || '',
        summary: award.summary || ''
    };
}

/**
 * Migrate publication item
 */
function migratePublication(pub: UnifiedCVDataStructure['publications'][0]): PublicationItem {
    return {
        id: generateId(),
        name: pub.name || '',
        publisher: pub.publisher || '',
        releaseDate: pub.releaseDate || '',
        url: pub.url || '',
        summary: pub.summary || ''
    };
}

/**
 * Migrate interest item
 */
function migrateInterest(interest: UnifiedCVDataStructure['interests'][0]): InterestItem {
    return {
        id: generateId(),
        name: interest.name || '',
        keywords: interest.keywords || []
    };
}

/**
 * Migrate reference item
 */
function migrateReference(ref: UnifiedCVDataStructure['references'][0]): ReferenceItem {
    return {
        id: generateId(),
        name: ref.name || '',
        reference: ref.reference || ''
    };
}

/**
 * Reverse migration: Convert EnhancedResumeJSON back to UnifiedCVDataStructure
 * 
 * This is useful for backward compatibility with existing components
 * that haven't been updated yet.
 */
export function migrateToLegacyFormat(
    enhancedData: EnhancedResumeJSON
): UnifiedCVDataStructure {
    return {
        basics: {
            name: enhancedData.basics.name,
            label: enhancedData.basics.label,
            image: enhancedData.basics.image,
            email: enhancedData.basics.email,
            phone: enhancedData.basics.phone,
            url: enhancedData.basics.url,
            summary: enhancedData.basics.summary,
            location: {
                address: enhancedData.basics.location.address,
                postalCode: enhancedData.basics.location.postalCode,
                city: enhancedData.basics.location.city,
                countryCode: enhancedData.basics.location.countryCode,
                region: enhancedData.basics.location.region
            },
            profiles: enhancedData.basics.profiles.map(profile => ({
                network: profile.network,
                username: profile.username,
                url: profile.url
            }))
        },
        work: extractSectionItems<ExperienceItem>(enhancedData, 'experience').map(item => ({
            name: item.company,
            position: item.position,
            url: item.url,
            startDate: item.startDate,
            endDate: item.endDate,
            summary: item.summary,
            highlights: item.highlights.map(h => h.text)
        })),
        volunteer: extractSectionItems<VolunteerItem>(enhancedData, 'volunteer').map(item => ({
            organization: item.organization,
            position: item.position,
            url: item.url,
            startDate: item.startDate,
            endDate: item.endDate,
            summary: item.summary,
            highlights: item.highlights.map(h => h.text)
        })),
        education: extractSectionItems<EducationItem>(enhancedData, 'education').map(item => ({
            institution: item.institution,
            url: item.url,
            area: item.area,
            studyType: item.studyType,
            startDate: item.startDate,
            endDate: item.endDate,
            score: item.score,
            courses: item.courses
        })),
        awards: extractSectionItems<AwardItem>(enhancedData, 'awards').map(item => ({
            title: item.title,
            date: item.date,
            awarder: item.awarder,
            summary: item.summary
        })),
        certificates: extractSectionItems<CertificateItem>(enhancedData, 'certificates').map(item => ({
            name: item.name,
            date: item.date,
            issuer: item.issuer,
            url: item.url,
            description: item.description
        })),
        publications: extractSectionItems<PublicationItem>(enhancedData, 'publications').map(item => ({
            name: item.name,
            publisher: item.publisher,
            releaseDate: item.releaseDate,
            url: item.url,
            summary: item.summary
        })),
        skills: extractSectionItems<SkillsItem>(enhancedData, 'skills').map(item => ({
            category: item.category,
            skills: item.skills.map(s => s.name)
        })),
        languages: extractSectionItems<LanguageItem>(enhancedData, 'languages').map(item => ({
            language: item.language,
            fluency: item.fluency
        })),
        interests: extractSectionItems<InterestItem>(enhancedData, 'interests').map(item => ({
            name: item.name,
            keywords: item.keywords
        })),
        references: extractSectionItems<ReferenceItem>(enhancedData, 'references').map(item => ({
            name: item.name,
            reference: item.reference
        })),
        projects: extractSectionItems<ProjectItem>(enhancedData, 'projects').map(item => ({
            name: item.name,
            description: item.description,
            highlights: item.highlights.map(h => h.text),
            keywords: item.keywords,
            startDate: item.startDate,
            endDate: item.endDate,
            url: item.url
        }))
    };
}

/**
 * Helper to extract items from a specific section type
 */
function extractSectionItems<T extends ResumeItem>(
    resume: EnhancedResumeJSON,
    sectionType: string
): T[] {
    const section = resume.sections.find(s => s.type === sectionType);
    return (section?.items || []) as T[];
}

/**
 * Batch migrate multiple CVs
 */
export function batchMigrateToEnhancedSchema(
    legacyCVs: UnifiedCVDataStructure[],
    templateId: string = 'default'
): EnhancedResumeJSON[] {
    return legacyCVs.map(cv => migrateToEnhancedSchema(cv, templateId));
}

/**
 * Validate migration result
 */
export function validateMigration(
    legacyData: UnifiedCVDataStructure,
    enhancedData: EnhancedResumeJSON
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check basics
    if (enhancedData.basics.name !== legacyData.basics.name) {
        errors.push('Name mismatch after migration');
    }
    if (enhancedData.basics.email !== legacyData.basics.email) {
        errors.push('Email mismatch after migration');
    }

    // Check section counts
    const legacySectionCount = [
        legacyData.work?.length || 0,
        legacyData.education?.length || 0,
        legacyData.skills?.length || 0,
        legacyData.projects?.length || 0,
        legacyData.certificates?.length || 0,
        legacyData.languages?.length || 0,
        legacyData.volunteer?.length || 0,
        legacyData.awards?.length || 0,
        legacyData.publications?.length || 0,
        legacyData.interests?.length || 0,
        legacyData.references?.length || 0
    ].reduce((a, b) => a + b, 0);

    const enhancedItemCount = enhancedData.sections.reduce(
        (total, section) => total + section.items.length,
        0
    );

    if (legacySectionCount !== enhancedItemCount) {
        errors.push(`Item count mismatch: legacy=${legacySectionCount}, enhanced=${enhancedItemCount}`);
    }

    // Check all nodes have IDs
    if (!enhancedData.meta.id) {
        errors.push('Meta missing ID');
    }
    if (!enhancedData.basics.id) {
        errors.push('Basics missing ID');
    }
    if (!enhancedData.basics.location.id) {
        errors.push('Location missing ID');
    }

    for (const section of enhancedData.sections) {
        if (!section.id) {
            errors.push(`Section missing ID: ${section.type}`);
        }
        for (const item of section.items) {
            if (!item.id) {
                errors.push(`Item missing ID in section: ${section.type}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

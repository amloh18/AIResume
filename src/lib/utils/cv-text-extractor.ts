/**
 * Canonical CV Text Extraction
 * 
 * Single source of truth for converting UnifiedCVDataStructure to plain text.
 * Used by: keyword-gap-analysis, career-analysis, cv-match, ATS scoring,
 * and any other consumer that needs CV text.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/<li[^>]*>/gi, '* ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Extract all searchable text from a CV for keyword matching and AI analysis.
 * Returns a single lowercase string with all CV content joined by spaces.
 * 
 * Use this for: keyword matching, semantic analysis, AI prompt context.
 */
export function extractCVSearchText(cvData: UnifiedCVDataStructure | any): string {
    if (!cvData) return '';
    const parts: string[] = [];

    // Basics
    if (cvData.basics) {
        if (cvData.basics.summary) parts.push(cvData.basics.summary);
        if (cvData.basics.label) parts.push(cvData.basics.label);
        if (cvData.basics.name) parts.push(cvData.basics.name);
    }

    // Work experience
    if (cvData.work && Array.isArray(cvData.work)) {
        cvData.work.forEach((job: any) => {
            if (job.position) parts.push(job.position);
            if (job.title) parts.push(job.title);
            if (job.summary) parts.push(job.summary);
            if (job.highlights && Array.isArray(job.highlights)) {
                parts.push(...job.highlights);
            }
        });
    }

    // Skills
    if (cvData.skills && Array.isArray(cvData.skills)) {
        cvData.skills.forEach((category: any) => {
            if (category.name) parts.push(category.name);
            if (category.skills && Array.isArray(category.skills)) {
                parts.push(...category.skills);
            }
            if (category.keywords && Array.isArray(category.keywords)) {
                parts.push(...category.keywords);
            }
        });
    }

    // Projects
    if (cvData.projects && Array.isArray(cvData.projects)) {
        cvData.projects.forEach((project: any) => {
            if (project.name) parts.push(project.name);
            if (project.description) parts.push(project.description);
            if (project.highlights && Array.isArray(project.highlights)) {
                parts.push(...project.highlights);
            }
            if (project.keywords && Array.isArray(project.keywords)) {
                parts.push(...project.keywords);
            }
        });
    }

    // Education
    if (cvData.education && Array.isArray(cvData.education)) {
        cvData.education.forEach((edu: any) => {
            if (edu.area) parts.push(edu.area);
            if (edu.studyType) parts.push(edu.studyType);
            if (edu.institution) parts.push(edu.institution);
            if (edu.courses && Array.isArray(edu.courses)) {
                parts.push(...edu.courses);
            }
        });
    }

    // Certificates
    if (cvData.certificates && Array.isArray(cvData.certificates)) {
        cvData.certificates.forEach((cert: any) => {
            if (cert.name) parts.push(cert.name);
        });
    }

    // Volunteer
    if (cvData.volunteer && Array.isArray(cvData.volunteer)) {
        cvData.volunteer.forEach((vol: any) => {
            if (vol.position) parts.push(vol.position);
            if (vol.summary) parts.push(vol.summary);
            if (vol.highlights && Array.isArray(vol.highlights)) {
                parts.push(...vol.highlights);
            }
        });
    }

    return parts.join(' ').toLowerCase();
}

/**
 * Convert CV to structured plain text as an ATS would parse it.
 * Returns a formatted string with sections and newlines.
 * 
 * Use this for: ATS simulation, recruiter-mode display, parsing confidence checks.
 */
export function getPlainTextCV(cvData: UnifiedCVDataStructure | null): string {
    if (!cvData) return '';

    const lines: string[] = [];

    // Header
    if (cvData.basics?.name) lines.push(cvData.basics.name.toUpperCase());
    if (cvData.basics?.label) lines.push(cvData.basics.label);

    // Contact
    const contact: string[] = [];
    if (cvData.basics?.email) contact.push(cvData.basics.email);
    if (cvData.basics?.phone) contact.push(cvData.basics.phone);
    if (cvData.basics?.location) {
        const loc = cvData.basics.location;
        const locStr = [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
        if (locStr) contact.push(locStr);
    }
    if (cvData.basics?.url) contact.push(cvData.basics.url);
    const linkedin = cvData.basics?.profiles?.find((p: any) => p.network?.toLowerCase() === 'linkedin');
    if (linkedin?.url) contact.push(linkedin.url);
    if (contact.length) lines.push(contact.join(' | '));

    lines.push('');

    // Summary
    if (cvData.basics?.summary) {
        lines.push('SUMMARY');
        lines.push(stripHtml(cvData.basics.summary));
        lines.push('');
    }

    // Work Experience
    if (cvData.work && cvData.work.length > 0) {
        lines.push('WORK EXPERIENCE');
        cvData.work.forEach(job => {
            const title = job.position || (job as any).title || job.name || '';
            const company = job.name || (job as any).company || '';
            const dates = [job.startDate || (job as any).start, job.endDate || (job as any).end || 'Present'].filter(Boolean).join(' - ');

            lines.push(`${title} | ${company} | ${dates}`);
            if (job.summary) lines.push(stripHtml(job.summary));
            if (job.highlights && Array.isArray(job.highlights)) {
                job.highlights.forEach((h: string) => lines.push(`• ${stripHtml(h)}`));
            }
            lines.push('');
        });
    }

    // Education
    if (cvData.education && cvData.education.length > 0) {
        lines.push('EDUCATION');
        cvData.education.forEach(edu => {
            const degree = edu.studyType || (edu as any).degree || '';
            const field = edu.area || (edu as any).field || '';
            const school = edu.institution || (edu as any).school || '';
            const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' - ');

            lines.push(`${degree} ${field} | ${school} | ${dates}`);
        });
        lines.push('');
    }

    // Skills
    if (cvData.skills && cvData.skills.length > 0) {
        lines.push('SKILLS');
        cvData.skills.forEach(category => {
            const catName = (category as any).category || (category as any).name || '';
            const skills = (category as any).skills || (category as any).keywords || [];
            if (catName && skills.length) {
                lines.push(`${catName}: ${skills.join(', ')}`);
            } else if (skills.length) {
                lines.push(skills.join(', '));
            }
        });
        lines.push('');
    }

    // Projects
    if (cvData.projects && cvData.projects.length > 0) {
        lines.push('PROJECTS');
        cvData.projects.forEach(project => {
            lines.push(project.name || '');
            if (project.description) lines.push(stripHtml(project.description));
            if (project.highlights && Array.isArray(project.highlights)) {
                project.highlights.forEach((h: string) => lines.push(`• ${stripHtml(h)}`));
            }
        });
        lines.push('');
    }

    // Certificates
    if (cvData.certificates && cvData.certificates.length > 0) {
        lines.push('CERTIFICATIONS');
        cvData.certificates.forEach(cert => {
            lines.push(cert.name || '');
        });
        lines.push('');
    }

    return lines.join('\n');
}

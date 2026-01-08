/**
 * CV Analysis Utilities
 * 
 * Utilities for analyzing CV data for Recruiter Mode and ATS Mode overlays.
 * Provides employment gap detection, title regression analysis, impact metrics extraction,
 * and ATS parsing simulation.
 */

import type { UnifiedCVDataStructure } from '@/types/cv';

type WorkExperience = UnifiedCVDataStructure['work'][number];
type Education = UnifiedCVDataStructure['education'][number];

// ============================================================================
// Types
// ============================================================================

export interface EmploymentGap {
    startDate: string;
    endDate: string;
    durationMonths: number;
    afterPosition?: string;
    beforePosition?: string;
    afterIndex?: number; // Index in original array of the job AFTER the gap (visually above)
    beforeIndex?: number; // Index in original array of the job BEFORE the gap (visually below)
}

export interface TitleRegression {
    fromTitle: string;
    toTitle: string;
    fromCompany: string;
    toCompany: string;
    fromDate: string;
    toDate: string;
    seniorityDrop: number;
    fromIndex?: number;
    toIndex?: number;
}

export interface ImpactStats {
    numbers: { value: string; context: string; section: string }[];
    percentages: { value: string; context: string; section: string }[];
    currencies: { value: string; context: string; section: string }[];
    totalCount: number;
}

export interface ParseableIssue {
    type: 'icon' | 'table' | 'column' | 'font' | 'image' | 'graphic';
    description: string;
    severity: 'warning' | 'error';
    location?: string;
}

export interface SpeedReadData {
    name: string;
    currentTitle: string;
    topSkills: string[];
    recentAchievement: string;
}

// ============================================================================
// Seniority Detection for Title Regression
// ============================================================================

const SENIORITY_LEVELS: Record<string, number> = {
    // C-Suite
    'ceo': 10, 'cto': 10, 'cfo': 10, 'coo': 10, 'cmo': 10, 'cio': 10,
    'chief': 10,
    // VP/Director
    'vp': 9, 'vice president': 9, 'svp': 9,
    'director': 8, 'head': 8,
    // Senior Management
    'senior manager': 7, 'sr manager': 7,
    'manager': 6, 'team lead': 6, 'tech lead': 6, 'lead': 6,
    // Senior Individual Contributors
    'principal': 7, 'staff': 6,
    'senior': 5, 'sr': 5,
    // Mid-level
    'mid': 4, 'intermediate': 4,
    // Junior
    'junior': 3, 'jr': 3, 'associate': 3,
    // Entry
    'intern': 1, 'trainee': 1, 'entry': 2, 'graduate': 2,
};

function estimateSeniorityLevel(title: string): number {
    const normalizedTitle = title.toLowerCase();

    // Check each seniority keyword
    for (const [keyword, level] of Object.entries(SENIORITY_LEVELS)) {
        if (normalizedTitle.includes(keyword)) {
            return level;
        }
    }

    // Default to mid-level if no keywords found
    return 4;
}

// ============================================================================
// Date Parsing Utilities
// ============================================================================

function parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;

    const normalized = dateStr.toLowerCase().trim();

    // Handle "present", "current", "now"
    if (['present', 'current', 'now', 'ongoing'].includes(normalized)) {
        return new Date();
    }

    // Try standard date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    // Try MM/YYYY or YYYY-MM format
    const monthYearMatch = dateStr.match(/(\d{1,2})[\/\-](\d{4})/);
    if (monthYearMatch) {
        return new Date(parseInt(monthYearMatch[2]), parseInt(monthYearMatch[1]) - 1);
    }

    // Try YYYY format only
    const yearMatch = dateStr.match(/^(\d{4})$/);
    if (yearMatch) {
        return new Date(parseInt(yearMatch[1]), 0);
    }

    // Try Month YYYY format (e.g., "Jan 2023", "January 2023")
    const monthNameMatch = dateStr.match(/([a-zA-Z]+)\s*(\d{4})/);
    if (monthNameMatch) {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.findIndex(m => monthNameMatch[1].toLowerCase().startsWith(m));
        if (monthIndex !== -1) {
            return new Date(parseInt(monthNameMatch[2]), monthIndex);
        }
    }

    return null;
}

function getMonthsDifference(start: Date, end: Date): number {
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    return years * 12 + months;
}

// ============================================================================
// Employment Gap Detection
// ============================================================================

/**
 * Detect employment gaps in work history (gaps > 3 months are flagged)
 */
export function detectEmploymentGaps(
    work: WorkExperience[] | undefined,
    thresholdMonths: number = 3
): EmploymentGap[] {
    if (!work || work.length < 2) return [];

    const gaps: EmploymentGap[] = [];

    // Create array with original indices to track them after sort
    const workWithIndices = work.map((item, index) => ({ item, index }));

    // Sort by end date descending (most recent first)
    const sortedWork = [...workWithIndices].sort((a, b) => {
        const endA = parseDate(a.item.endDate) || new Date();
        const endB = parseDate(b.item.endDate) || new Date();
        return endB.getTime() - endA.getTime();
    });

    for (let i = 0; i < sortedWork.length - 1; i++) {
        const current = sortedWork[i];   // More recent job
        const previous = sortedWork[i + 1]; // Older job

        const currentStart = parseDate(current.item.startDate);
        const previousEnd = parseDate(previous.item.endDate);

        if (currentStart && previousEnd) {
            const gapMonths = getMonthsDifference(previousEnd, currentStart);

            if (gapMonths > thresholdMonths) {
                gaps.push({
                    startDate: previous.item.endDate || '',
                    endDate: current.item.startDate || '',
                    durationMonths: gapMonths,
                    afterPosition: previous.item.position || previous.item.name || '',
                    beforePosition: current.item.position || current.item.name || '',
                    afterIndex: current.index,      // The job that started AFTER the gap (visually top)
                    beforeIndex: previous.index,    // The job that ended BEFORE the gap (visually bottom)
                });
            }
        }
    }

    return gaps;
}

// ============================================================================
// Title Regression Detection
// ============================================================================

/**
 * Detect if job titles went "down" in seniority (potential red flag)
 */
export function detectTitleRegression(work: WorkExperience[] | undefined): TitleRegression[] {
    if (!work || work.length < 2) return [];

    const regressions: TitleRegression[] = [];

    // Create array with original indices
    const workWithIndices = work.map((item, index) => ({ item, index }));

    // Sort by start date ascending (oldest first)
    const sortedWork = [...workWithIndices].sort((a, b) => {
        const startA = parseDate(a.item.startDate) || new Date(0);
        const startB = parseDate(b.item.startDate) || new Date(0);
        return startA.getTime() - startB.getTime();
    });

    for (let i = 0; i < sortedWork.length - 1; i++) {
        const current = sortedWork[i]; // Older job
        const next = sortedWork[i + 1]; // Newer job

        const currentTitle = current.item.position || current.item.name || '';
        const nextTitle = next.item.position || next.item.name || '';

        const currentLevel = estimateSeniorityLevel(currentTitle);
        const nextLevel = estimateSeniorityLevel(nextTitle);

        // Flag if seniority dropped by 2+ levels
        if (currentLevel - nextLevel >= 2) {
            regressions.push({
                fromTitle: currentTitle,
                toTitle: nextTitle,
                fromCompany: current.item.name || '',
                toCompany: next.item.name || '',
                fromDate: current.item.endDate || '',
                toDate: next.item.startDate || '',
                seniorityDrop: currentLevel - nextLevel,
                fromIndex: current.index,
                toIndex: next.index
            });
        }
    }

    return regressions;
}

// ============================================================================
// Impact Metrics Extraction
// ============================================================================

const NUMBER_REGEX = /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\+?\b/g;
const PERCENTAGE_REGEX = /(\d+(?:\.\d+)?)\s*%/g;
const CURRENCY_REGEX = /[\$€£¥₹][\d,]+(?:\.\d{2})?(?:\s*[KMBkmb])?|\d+(?:\.\d+)?\s*(?:million|billion|k|m|b)\b/gi;

function extractFromText(text: string, section: string): ImpactStats {
    const stats: ImpactStats = {
        numbers: [],
        percentages: [],
        currencies: [],
        totalCount: 0,
    };

    if (!text) return stats;

    // Extract percentages first (so we don't double-count the number part)
    let match;
    while ((match = PERCENTAGE_REGEX.exec(text)) !== null) {
        stats.percentages.push({
            value: match[0],
            context: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + match[0].length + 30)),
            section,
        });
    }

    // Extract currencies
    while ((match = CURRENCY_REGEX.exec(text)) !== null) {
        stats.currencies.push({
            value: match[0],
            context: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + match[0].length + 30)),
            section,
        });
    }

    // Extract standalone numbers (exclude those already counted as percentages/currencies)
    while ((match = NUMBER_REGEX.exec(text)) !== null) {
        const numValue = match[0];
        // Skip if it's part of a percentage or currency we already found
        const isPartOfPercentage = stats.percentages.some(p => p.value.includes(numValue));
        const isPartOfCurrency = stats.currencies.some(c => c.value.includes(numValue));

        if (!isPartOfPercentage && !isPartOfCurrency && parseInt(numValue.replace(/,/g, '')) > 0) {
            stats.numbers.push({
                value: numValue,
                context: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + numValue.length + 30)),
                section,
            });
        }
    }

    stats.totalCount = stats.numbers.length + stats.percentages.length + stats.currencies.length;
    return stats;
}

/**
 * Extract all quantifiable impact metrics from CV
 */
export function extractImpactMetrics(cvData: UnifiedCVDataStructure | null): ImpactStats {
    const combined: ImpactStats = {
        numbers: [],
        percentages: [],
        currencies: [],
        totalCount: 0,
    };

    if (!cvData) return combined;

    // Extract from summary
    if (cvData.basics?.summary) {
        const summaryStats = extractFromText(cvData.basics.summary, 'summary');
        combined.numbers.push(...summaryStats.numbers);
        combined.percentages.push(...summaryStats.percentages);
        combined.currencies.push(...summaryStats.currencies);
    }

    // Extract from work experience
    if (cvData.work) {
        cvData.work.forEach((job, idx) => {
            const sectionName = `work-${idx}`;

            if (job.summary) {
                const stats = extractFromText(job.summary, sectionName);
                combined.numbers.push(...stats.numbers);
                combined.percentages.push(...stats.percentages);
                combined.currencies.push(...stats.currencies);
            }

            if (job.highlights) {
                job.highlights.forEach(highlight => {
                    const stats = extractFromText(highlight, sectionName);
                    combined.numbers.push(...stats.numbers);
                    combined.percentages.push(...stats.percentages);
                    combined.currencies.push(...stats.currencies);
                });
            }
        });
    }

    // Extract from projects
    if (cvData.projects) {
        cvData.projects.forEach((project, idx) => {
            const sectionName = `project-${idx}`;

            if (project.description) {
                const stats = extractFromText(project.description, sectionName);
                combined.numbers.push(...stats.numbers);
                combined.percentages.push(...stats.percentages);
                combined.currencies.push(...stats.currencies);
            }

            if (project.highlights) {
                project.highlights.forEach(highlight => {
                    const stats = extractFromText(highlight, sectionName);
                    combined.numbers.push(...stats.numbers);
                    combined.percentages.push(...stats.percentages);
                    combined.currencies.push(...stats.currencies);
                });
            }
        });
    }

    combined.totalCount = combined.numbers.length + combined.percentages.length + combined.currencies.length;
    return combined;
}

// ============================================================================
// Speed Read View Data Extraction
// ============================================================================

/**
 * Extract condensed "speed read" data for Recruiter Mode
 */
export function getSpeedReadData(cvData: UnifiedCVDataStructure | null): SpeedReadData | null {
    if (!cvData) return null;

    const name = cvData.basics?.name || '';
    const currentTitle = cvData.basics?.label || '';

    // Get top 3 skills (flatten skill categories, take first 3 unique)
    const allSkills: string[] = [];
    if (cvData.skills) {
        cvData.skills.forEach(category => {
            const skills = (category as any).skills || (category as any).keywords || [];
            if (Array.isArray(skills)) {
                allSkills.push(...skills.slice(0, 5)); // Take up to 5 from each category
            }
        });
    }
    const topSkills = Array.from(new Set(allSkills)).slice(0, 3);

    // Get most recent achievement (first highlight from most recent job)
    let recentAchievement = '';
    if (cvData.work && cvData.work.length > 0) {
        const recentJob = cvData.work[0];
        if (recentJob.highlights && recentJob.highlights.length > 0) {
            recentAchievement = recentJob.highlights[0];
        } else if (recentJob.summary) {
            // Fallback to first sentence of summary
            recentAchievement = recentJob.summary.split(/[.!?]/)[0] + '.';
        }
    }

    return { name, currentTitle, topSkills, recentAchievement };
}

// ============================================================================
// ATS Plain Text Parsing
// ============================================================================

/**
 * Convert CV to plain text as ATS would parse it
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
            if (job.highlights) {
                job.highlights.forEach(h => lines.push(`* ${stripHtml(h)}`));
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
        });
        lines.push('');
    }

    return lines.join('\n');
}

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

// ============================================================================
// Unparseable Element Detection
// ============================================================================

/**
 * Detect elements that may cause ATS parsing issues
 */
export function detectUnparseableElements(
    templateName: string | undefined,
    cvData: UnifiedCVDataStructure | null
): ParseableIssue[] {
    const issues: ParseableIssue[] = [];

    // Check template for known problematic layouts
    if (templateName) {
        const name = templateName.toLowerCase();

        // Two-column layouts can confuse ATS
        if (name.includes('sidebar') || name.includes('two-column') || name.includes('split')) {
            issues.push({
                type: 'column',
                description: 'Two-column layout may be parsed incorrectly by some ATS systems',
                severity: 'warning',
                location: 'Template Layout',
            });
        }

        // Graphics-heavy templates
        if (name.includes('creative') || name.includes('modern') || name.includes('designer')) {
            issues.push({
                type: 'graphic',
                description: 'Creative/graphic templates may not parse well in older ATS systems',
                severity: 'warning',
                location: 'Template Style',
            });
        }
    }

    // Check for potential icons in text (Unicode symbols - basic range)
    if (cvData) {
        const allText = JSON.stringify(cvData);
        // removing extended unicode range to avoid TS issues without u flag
        const iconPatterns = /[\u2600-\u26FF\u2700-\u27BF]/g;
        if (iconPatterns.test(allText)) {
            issues.push({
                type: 'icon',
                description: 'Unicode icons/emojis detected - these may not be parsed correctly',
                severity: 'warning',
                location: 'Various sections',
            });
        }

        // Check for tables in text (unlikely in structured data, but check for HTML tables)
        if (/<table/i.test(allText)) {
            issues.push({
                type: 'table',
                description: 'HTML tables detected - table content may be garbled by ATS',
                severity: 'error',
                location: 'Content sections',
            });
        }
    }

    return issues;
}

/**
 * Calculate parsing confidence score based on detected issues
 */
export function calculateParsingConfidence(issues: ParseableIssue[]): number {
    if (issues.length === 0) return 100;

    let score = 100;

    issues.forEach(issue => {
        if (issue.severity === 'error') {
            score -= 15;
        } else if (issue.severity === 'warning') {
            score -= 8;
        }
    });

    return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Keyword Matching for ATS
// ============================================================================

export interface KeywordMatch {
    keyword: string;
    found: boolean;
    locations: string[]; // Which sections contain this keyword
    frequency: number;
}

/**
 * Match JD keywords against CV content
 */
export function matchKeywordsAgainstCV(
    cvData: UnifiedCVDataStructure | null,
    keywords: string[]
): KeywordMatch[] {
    if (!cvData || !keywords.length) return [];

    const cvText = getPlainTextCV(cvData).toLowerCase();

    return keywords.map(keyword => {
        const normalizedKeyword = keyword.toLowerCase().trim();
        const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = cvText.match(regex);

        // Find which sections contain the keyword
        const locations: string[] = [];
        if (cvData.basics?.summary?.toLowerCase().includes(normalizedKeyword)) locations.push('Summary');
        if (cvData.work?.some(w => JSON.stringify(w).toLowerCase().includes(normalizedKeyword))) locations.push('Work');
        if (cvData.skills?.some(s => JSON.stringify(s).toLowerCase().includes(normalizedKeyword))) locations.push('Skills');
        if (cvData.projects?.some(p => JSON.stringify(p).toLowerCase().includes(normalizedKeyword))) locations.push('Projects');
        if (cvData.education?.some(e => JSON.stringify(e).toLowerCase().includes(normalizedKeyword))) locations.push('Education');

        return {
            keyword,
            found: matches !== null && matches.length > 0,
            locations,
            frequency: matches?.length || 0,
        };
    });
}

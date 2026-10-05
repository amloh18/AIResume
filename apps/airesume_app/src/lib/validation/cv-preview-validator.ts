/**
 * CV Preview Validator
 *
 * Real-time validation engine that checks CV content against layout rules.
 * Returns warnings, suggestions, and a quality score.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { startsWithActionVerb, suggestActionVerbs } from './action-verbs';
import {
  CVLayoutRules,
  SectionFormatRule,
} from './cv-layout-rules';
import { DEFAULT_CV_LAYOUT_RULES } from './default-rules';

// ─── TYPES ────────────────────────────────────────────────

export type WarningSeverity = 'error' | 'warning' | 'info' | 'suggestion';

export interface ValidationWarning {
  id: string;
  field: string;
  section: string;
  type: WarningSeverity;
  message: string;
  rule: string;
  autoFixLabel?: string;
}

export interface ValidationResult {
  warnings: ValidationWarning[];
  score: number;
  sectionScores: Record<string, number>;
}

// ─── MAIN VALIDATION FUNCTION ────────────────────────────

export function validateCVPreview(
  cvData: UnifiedCVDataStructure,
  rules?: Partial<CVLayoutRules>
): ValidationResult {
  const layoutRules = rules?.layout ?? DEFAULT_CV_LAYOUT_RULES.layout;
  const sectionFormats = rules?.sectionFormats ?? DEFAULT_CV_LAYOUT_RULES.sectionFormats;
  const edgeCases = rules?.edgeCases ?? DEFAULT_CV_LAYOUT_RULES.edgeCases;

  const warnings: ValidationWarning[] = [];
  const sectionScores: Record<string, number> = {};

  // Validate each section
  validateBasics(cvData, warnings, edgeCases);
  validateWorkExperience(cvData, warnings, sectionFormats);
  validateEducation(cvData, warnings, edgeCases);
  validateSkills(cvData, warnings, edgeCases);
  validateProjects(cvData, warnings, sectionFormats);

  // Calculate scores
  const score = calculateQualityScore(cvData, warnings, sectionScores);

  return { warnings, score, sectionScores };
}

// ─── BASICS / PROFILE VALIDATION ─────────────────────────

function validateBasics(
  cvData: UnifiedCVDataStructure,
  warnings: ValidationWarning[],
  edgeCases: CVLayoutRules['edgeCases']
): void {
  const basics = cvData.basics;
  if (!basics) return;

  // Profile summary max lines
  if (basics.summary) {
    const lineCount = basics.summary.split('\n').filter(l => l.trim()).length;
    if (lineCount > 5) {
      warnings.push({
        id: 'profile-max-lines',
        field: 'basics.summary',
        section: 'profile',
        type: 'warning',
        message: `Profile summary is ${lineCount} lines. Recommended: 3-5 lines for best impact.`,
        rule: 'profile-max-lines',
      });
    }

    // Check character count
    if (basics.summary.length > 500) {
      warnings.push({
        id: 'profile-max-chars',
        field: 'basics.summary',
        section: 'profile',
        type: 'warning',
        message: `Profile summary is ${basics.summary.length} characters. Keep under 500 for scannability.`,
        rule: 'profile-max-chars',
      });
    }
  }

  // Missing name
  if (!basics.name?.trim()) {
    warnings.push({
      id: 'missing-name',
      field: 'basics.name',
      section: 'personal_header',
      type: 'error',
      message: 'Name is required on your CV.',
      rule: 'required-fields',
    });
  }

  // Missing email
  if (!basics.email?.trim()) {
    warnings.push({
      id: 'missing-email',
      field: 'basics.email',
      section: 'personal_header',
      type: 'error',
      message: 'Email address is required for employers to contact you.',
      rule: 'required-fields',
    });
  }

  // Empty summary
  if (!basics.summary?.trim()) {
    warnings.push({
      id: 'missing-summary',
      field: 'basics.summary',
      section: 'profile',
      type: 'info',
      message: 'Add a professional summary to make a strong first impression.',
      rule: 'recommended-fields',
    });
  }

  // URL handling
  if (edgeCases.urlHandling.shortenLongURLs && basics.url) {
    if (basics.url.length > edgeCases.urlHandling.maxDisplayLength) {
      warnings.push({
        id: 'long-url',
        field: 'basics.url',
        section: 'personal_header',
        type: 'info',
        message: `URL is ${basics.url.length} characters. It will be truncated in the template.`,
        rule: 'url-max-display',
      });
    }
  }
}

// ─── WORK EXPERIENCE VALIDATION ──────────────────────────

function validateWorkExperience(
  cvData: UnifiedCVDataStructure,
  warnings: ValidationWarning[],
  sectionFormats: Record<string, SectionFormatRule>
): void {
  const work = cvData.work;
  if (!Array.isArray(work) || !work.length) return;

  const formatRule = sectionFormats.work_experience;

  work.forEach((job, i) => {
    const prefix = `work[${i}]`;

    // Check if highlights should be used instead of summary
    if (job.summary && job.summary.length > 200 && !job.highlights?.length) {
      warnings.push({
        id: `work-summary-to-bullets-${i}`,
        field: `${prefix}.summary`,
        section: 'work_experience',
        type: 'suggestion',
        message: 'Work experiences look better as bullet points. Consider breaking this into highlights.',
        rule: 'job-description-format',
        autoFixLabel: 'Convert to bullets',
      });
    }

    // Action verb check on highlights
    if (formatRule?.constraints.requireActionVerb && Array.isArray(job.highlights)) {
      job.highlights.forEach((highlight, j) => {
        if (highlight.trim() && !startsWithActionVerb(highlight)) {
          const firstWord = highlight.trim().split(/\s+/)[0];
          const suggestions = suggestActionVerbs(firstWord);
          warnings.push({
            id: `work-highlight-verb-${i}-${j}`,
            field: `${prefix}.highlights[${j}]`,
            section: 'work_experience',
            type: 'info',
            message: `"${firstWord}" is not a strong action verb. Consider starting with ${suggestions.slice(0, 3).map(s => `"${s}"`).join(', ')}.`,
            rule: 'bullet-action-verb',
          });
        }
      });
    }

    // Max bullets check
    if (formatRule?.constraints.maxBullets && Array.isArray(job.highlights)) {
      if (job.highlights.length > formatRule.constraints.maxBullets) {
        warnings.push({
          id: `work-max-bullets-${i}`,
          field: `${prefix}.highlights`,
          section: 'work_experience',
          type: 'warning',
          message: `${job.highlights.length} bullet points. Recommended maximum: ${formatRule.constraints.maxBullets}.`,
          rule: 'max-bullets',
        });
      }
    }

    // Missing dates
    if (!job.startDate?.trim()) {
      warnings.push({
        id: `work-missing-start-${i}`,
        field: `${prefix}.startDate`,
        section: 'work_experience',
        type: 'warning',
        message: 'Start date is missing. Dates help recruiters understand your experience timeline.',
        rule: 'required-dates',
      });
    }
  });
}

// ─── EDUCATION VALIDATION ────────────────────────────────

function validateEducation(
  cvData: UnifiedCVDataStructure,
  warnings: ValidationWarning[],
  edgeCases: CVLayoutRules['edgeCases']
): void {
  const education = cvData.education;
  if (!Array.isArray(education) || !education.length) return;

  education.forEach((edu, i) => {
    const prefix = `education[${i}]`;

    // Missing institution
    if (!edu.institution?.trim()) {
      warnings.push({
        id: `edu-missing-institution-${i}`,
        field: `${prefix}.institution`,
        section: 'education',
        type: 'error',
        message: 'Institution name is required.',
        rule: 'required-fields',
      });
    }

    // Empty GPA hiding
    if (edgeCases.emptyStates.hideEmptyGPA && !edu.score?.trim()) {
      // This is fine - GPA will be hidden. Just informational.
    }
  });
}

// ─── SKILLS VALIDATION ───────────────────────────────────

function validateSkills(
  cvData: UnifiedCVDataStructure,
  warnings: ValidationWarning[],
  edgeCases: CVLayoutRules['edgeCases']
): void {
  const skills = cvData.skills;
  if (!Array.isArray(skills) || !skills.length) return;

  const maxWords = edgeCases.skillsFormatting.maxWordsPerSkill;

  skills.forEach((group: any, i) => {
    const skillList = group.keywords || group.skills;
    if (Array.isArray(skillList)) {
      skillList.forEach((skill, j) => {
        if (typeof skill !== 'string') return;
        const wordCount = skill.trim().split(/\s+/).length;
        if (wordCount > maxWords) {
          warnings.push({
            id: `skill-max-words-${i}-${j}`,
            field: `skills[${i}].keywords[${j}]`,
            section: 'skills',
            type: 'warning',
            message: `"${skill}" is ${wordCount} words. Keep skill tags to ${maxWords} words or fewer for ATS scanning.`,
            rule: 'skill-max-words',
          });
        }
      });
    }
  });
}

// ─── PROJECTS VALIDATION ─────────────────────────────────

function validateProjects(
  cvData: UnifiedCVDataStructure,
  warnings: ValidationWarning[],
  sectionFormats: Record<string, SectionFormatRule>
): void {
  const projects = cvData.projects;
  if (!Array.isArray(projects) || !projects.length) return;

  const formatRule = sectionFormats.projects;

  projects.forEach((project, i) => {
    const prefix = `projects[${i}]`;

    // Missing name
    if (!project.name?.trim()) {
      warnings.push({
        id: `project-missing-name-${i}`,
        field: `${prefix}.name`,
        section: 'projects',
        type: 'error',
        message: 'Project name is required.',
        rule: 'required-fields',
      });
    }

    // Action verb check on highlights
    if (formatRule?.constraints.requireActionVerb && Array.isArray(project.highlights)) {
      project.highlights.forEach((highlight, j) => {
        if (highlight.trim() && !startsWithActionVerb(highlight)) {
          const firstWord = highlight.trim().split(/\s+/)[0];
          warnings.push({
            id: `project-highlight-verb-${i}-${j}`,
            field: `${prefix}.highlights[${j}]`,
            section: 'projects',
            type: 'info',
            message: `"${firstWord}" is not a strong action verb. Consider starting with a stronger verb.`,
            rule: 'bullet-action-verb',
          });
        }
      });
    }
  });
}

// ─── QUALITY SCORE CALCULATION ───────────────────────────

function calculateQualityScore(
  cvData: UnifiedCVDataStructure,
  warnings: ValidationWarning[],
  sectionScores: Record<string, number>
): number {
  let totalScore = 100;
  const deductions: Record<string, number> = {
    error: 10,
    warning: 5,
    info: 2,
    suggestion: 1,
  };

  // Deduct points per warning
  for (const warning of warnings) {
    totalScore -= deductions[warning.type] ?? 0;
  }

  // Section-specific scoring
  const sections = ['personal_header', 'profile', 'work_experience', 'education', 'skills', 'projects'];

  for (const section of sections) {
    let sectionScore = 100;
    const sectionWarnings = warnings.filter(w => w.section === section);
    for (const w of sectionWarnings) {
      sectionScore -= deductions[w.type] ?? 0;
    }
    sectionScores[section] = Math.max(0, sectionScore);
  }

  // Bonus for completeness
  if (cvData.basics?.name && cvData.basics?.email && cvData.basics?.summary) {
    totalScore = Math.min(100, totalScore + 5);
  }
  if (cvData.work?.length && cvData.education?.length && cvData.skills?.length) {
    totalScore = Math.min(100, totalScore + 5);
  }

  return Math.max(0, Math.min(100, totalScore));
}

/**
 * Evidence Profile Service
 *
 * Extracts structured candidate evidence from the Master CV.
 * Each fact has provenance — we know exactly where it came from.
 *
 * This is the "what does the candidate actually have" intelligence layer.
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import {
  EvidenceProfile,
  EvidenceItem,
  EvidenceSource,
  EvidenceType,
} from './types';

// ─── Evidence Extraction ──────────────────────────────────────────────

function extractWorkExperience(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!cvData.work || !Array.isArray(cvData.work)) return items;

  for (let i = 0; i < cvData.work.length; i++) {
    const work = cvData.work[i];
    const company = work.name || 'Unknown Company';
    const position = work.position || 'Unknown Role';

    // Role evidence
    items.push({
      fact: `${position} at ${company}`,
      source: {
        section: 'work',
        index: i,
        field: 'position',
        originalText: `${position} at ${company}`,
      },
      confidence: 1.0,
      evidenceType: 'work-experience',
      keywords: extractKeywordsFromText(`${position} ${company} ${work.summary || ''}`),
    });

    // Summary evidence
    if (work.summary) {
      items.push({
        fact: work.summary,
        source: {
          section: 'work',
          index: i,
          field: 'summary',
          originalText: work.summary,
        },
        confidence: 0.9,
        evidenceType: 'work-experience',
        keywords: extractKeywordsFromText(work.summary),
      });
    }

    // Highlight evidence (each bullet is a separate fact)
    if (work.highlights && Array.isArray(work.highlights)) {
      for (let j = 0; j < work.highlights.length; j++) {
        const highlight = work.highlights[j];
        if (typeof highlight === 'string' && highlight.trim()) {
          items.push({
            fact: highlight.trim(),
            source: {
              section: 'work',
              index: i,
              field: `highlights[${j}]`,
              originalText: highlight.trim(),
            },
            confidence: 0.95,
            evidenceType: 'achievement',
            keywords: extractKeywordsFromText(highlight),
          });
        }
      }
    }
  }

  return items;
}

function extractSkills(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!cvData.skills || !Array.isArray(cvData.skills)) return items;

  for (let i = 0; i < cvData.skills.length; i++) {
    const skillGroup = cvData.skills[i];
    const category = skillGroup.category || 'General';

    if (skillGroup.skills && Array.isArray(skillGroup.skills)) {
      for (const skill of skillGroup.skills) {
        const skillName = typeof skill === 'string' ? skill : String(skill);
        items.push({
          fact: skillName,
          source: {
            section: 'skills',
            index: i,
            field: 'skills',
            originalText: `${category}: ${skillName}`,
          },
          confidence: 1.0,
          evidenceType: 'skill',
          keywords: extractKeywordsFromText(skillName),
        });
      }
    }
  }

  return items;
}

function extractProjects(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!cvData.projects || !Array.isArray(cvData.projects)) return items;

  for (let i = 0; i < cvData.projects.length; i++) {
    const project = cvData.projects[i];

    items.push({
      fact: project.name || 'Unnamed Project',
      source: {
        section: 'projects',
        index: i,
        field: 'name',
        originalText: project.name || 'Unnamed Project',
      },
      confidence: 1.0,
      evidenceType: 'project',
      keywords: [
        ...extractKeywordsFromText(project.name || ''),
        ...extractKeywordsFromText(project.description || ''),
        ...(project.keywords || []),
      ],
    });

    if (project.description) {
      items.push({
        fact: project.description,
        source: {
          section: 'projects',
          index: i,
          field: 'description',
          originalText: project.description,
        },
        confidence: 0.9,
        evidenceType: 'project',
        keywords: extractKeywordsFromText(project.description),
      });
    }

    if (project.highlights && Array.isArray(project.highlights)) {
      for (let j = 0; j < project.highlights.length; j++) {
        const highlight = project.highlights[j];
        if (typeof highlight === 'string' && highlight.trim()) {
          items.push({
            fact: highlight.trim(),
            source: {
              section: 'projects',
              index: i,
              field: `highlights[${j}]`,
              originalText: highlight.trim(),
            },
            confidence: 0.9,
            evidenceType: 'achievement',
            keywords: extractKeywordsFromText(highlight),
          });
        }
      }
    }
  }

  return items;
}

function extractEducation(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!cvData.education || !Array.isArray(cvData.education)) return items;

  for (let i = 0; i < cvData.education.length; i++) {
    const edu = cvData.education[i];
    const degree = edu.studyType ? `${edu.studyType} in ${edu.area || ''}` : edu.area || 'Degree';
    const institution = edu.institution || 'Unknown Institution';

    items.push({
      fact: `${degree} from ${institution}`,
      source: {
        section: 'education',
        index: i,
        field: 'institution',
        originalText: `${degree} from ${institution}`,
      },
      confidence: 1.0,
      evidenceType: 'education',
      keywords: extractKeywordsFromText(`${degree} ${institution} ${edu.courses?.join(' ') || ''}`),
    });
  }

  return items;
}

function extractCertificates(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!cvData.certificates || !Array.isArray(cvData.certificates)) return items;

  for (let i = 0; i < cvData.certificates.length; i++) {
    const cert = cvData.certificates[i];
    items.push({
      fact: `${cert.name}${cert.issuer ? ` from ${cert.issuer}` : ''}`,
      source: {
        section: 'certificates',
        index: i,
        field: 'name',
        originalText: `${cert.name}${cert.issuer ? ` from ${cert.issuer}` : ''}`,
      },
      confidence: 1.0,
      evidenceType: 'certification',
      keywords: extractKeywordsFromText(`${cert.name} ${cert.issuer || ''}`),
    });
  }

  return items;
}

function extractLanguages(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (!cvData.languages || !Array.isArray(cvData.languages)) return items;

  for (let i = 0; i < cvData.languages.length; i++) {
    const lang = cvData.languages[i];
    items.push({
      fact: `${lang.language}${lang.fluency ? ` (${lang.fluency})` : ''}`,
      source: {
        section: 'languages',
        index: i,
        field: 'language',
        originalText: `${lang.language}${lang.fluency ? ` (${lang.fluency})` : ''}`,
      },
      confidence: 1.0,
      evidenceType: 'language',
      keywords: [lang.language?.toLowerCase()].filter(Boolean),
    });
  }

  return items;
}

function extractSummary(cvData: UnifiedCVDataStructure): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  if (cvData.basics?.summary) {
    items.push({
      fact: cvData.basics.summary,
      source: {
        section: 'basics',
        field: 'summary',
        originalText: cvData.basics.summary,
      },
      confidence: 0.9,
      evidenceType: 'work-experience',
      keywords: extractKeywordsFromText(cvData.basics.summary),
    });
  }

  return items;
}

// ─── Keyword Extraction Helper ────────────────────────────────────────

function extractKeywordsFromText(text: string): string[] {
  if (!text) return [];

  const lower = text.toLowerCase();
  const keywords: string[] = [];

  // Common tech keywords to look for
  const techPatterns = [
    'javascript', 'typescript', 'python', 'java', 'react', 'vue', 'angular',
    'node', 'express', 'django', 'flask', 'fastapi', 'aws', 'gcp', 'azure',
    'docker', 'kubernetes', 'postgresql', 'mysql', 'mongodb', 'redis',
    'graphql', 'rest', 'api', 'microservices', 'serverless',
    'machine learning', 'deep learning', 'nlp', 'ai',
    'ci/cd', 'devops', 'terraform', 'ansible',
    'git', 'github', 'gitlab',
    'agile', 'scrum', 'kanban',
    'figma', 'sketch', 'adobe',
    'html', 'css', 'sass', 'tailwind',
    'webpack', 'vite', 'esbuild',
    'testing', 'jest', 'cypress', 'playwright',
    'oauth', 'jwt', 'security',
    'database', 'sql', 'nosql',
    'cloud', 'linux', 'unix',
    'leadership', 'mentoring', 'communication',
    'problem solving', 'analytical', 'creative',
  ];

  for (const pattern of techPatterns) {
    if (lower.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  // Also extract capitalized words (likely proper nouns / technologies)
  const words = text.split(/\s+/);
  for (const word of words) {
    if (/^[A-Z][a-z]+[A-Z]/.test(word) || /^[A-Z]{2,}$/.test(word)) {
      keywords.push(word.toLowerCase());
    }
  }

  return [...new Set(keywords)];
}

// ─── Main Service ─────────────────────────────────────────────────────

/**
 * Build a structured EvidenceProfile from Master CV data.
 * Every fact has provenance — source section, index, and original text.
 */
export function buildEvidenceProfile(params: {
  cvData: UnifiedCVDataStructure;
  masterCvId: string;
}): EvidenceProfile {
  const { cvData, masterCvId } = params;

  const experience = extractWorkExperience(cvData);
  const skills = extractSkills(cvData);
  const projects = extractProjects(cvData);
  const education = extractEducation(cvData);
  const certifications = extractCertificates(cvData);
  const languages = extractLanguages(cvData);
  const summary = extractSummary(cvData);

  // Derive achievements from work highlights and project highlights
  const achievements = [
    ...experience.filter(e => e.evidenceType === 'achievement'),
    ...projects.filter(p => p.evidenceType === 'achievement'),
  ];

  // Derive tools and technologies from skills and projects
  const tools = skills.filter(s =>
    isToolKeyword(s.fact)
  );
  const technologies = skills.filter(s =>
    !isToolKeyword(s.fact) && s.evidenceType === 'skill'
  );

  // Derive leadership from work experience
  const leadership = experience.filter(e =>
    /lead|manager|director|head|mentor|supervisor/i.test(e.fact)
  );

  // Derive industry experience from work summaries
  const industryExperience = experience.filter(e =>
    /industry|sector|domain|field/i.test(e.fact)
  );

  const allItems = [
    ...experience, ...skills, ...achievements, ...projects,
    ...education, ...certifications, ...languages, ...tools,
    ...technologies, ...leadership, ...industryExperience, ...summary,
  ];

  const verifiedFacts = allItems.filter(i => i.confidence >= 0.9).length;

  return {
    experience,
    skills,
    achievements,
    projects,
    education,
    certifications,
    tools,
    technologies,
    languages,
    leadership,
    industryExperience,
    totalFacts: allItems.length,
    verifiedFacts,
    confidence: allItems.length > 0 ? verifiedFacts / allItems.length : 0,
    masterCvId,
    extractedAt: new Date(),
  };
}

function isToolKeyword(name: string): boolean {
  const toolKeywords = [
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
    'github actions', 'circleci', 'travis', 'git', 'github', 'gitlab',
    'jira', 'confluence', 'notion', 'slack', 'figma', 'sketch',
    'webpack', 'vite', 'esbuild', 'rollup',
    'aws', 'gcp', 'azure',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'kafka', 'rabbitmq', 'celery',
    'jest', 'mocha', 'cypress', 'selenium', 'playwright',
    'nginx', 'apache', 'linux', 'unix',
  ];
  return toolKeywords.includes(name.toLowerCase());
}

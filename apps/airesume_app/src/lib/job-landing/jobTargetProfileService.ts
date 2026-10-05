/**
 * Job Target Profile Service
 *
 * Analyzes a job description and produces a structured JobTargetProfile.
 * This is the "what does this job need" intelligence layer.
 *
 * Uses deterministic extraction first, AI enhancement second.
 */

import { callAIWithFallback } from '@/lib/utils/ai-api-helper';
import {
  JobTargetProfile,
  SeniorityLevel,
  RemoteType,
  Requirement,
  RequirementCategory,
  ContextualSignal,
  KeywordTier,
} from './types';

// ─── Seniority Detection ──────────────────────────────────────────────

const SENIORITY_KEYWORDS: Record<SeniorityLevel, string[]> = {
  intern: ['intern', 'internship', 'student'],
  junior: ['junior', 'jr', 'entry level', 'entry-level', 'graduate', 'fresh'],
  mid: ['mid level', 'mid-level', 'intermediate', '2-4 years', '3-5 years'],
  senior: ['senior', 'sr', 'lead', '5+ years', '7+ years', 'experienced'],
  staff: ['staff', 'principal', '8+ years', '10+ years'],
  principal: ['principal', 'distinguished', 'fellow'],
  lead: ['lead', 'tech lead', 'team lead', 'engineering lead'],
  manager: ['manager', 'management', 'team manager'],
  director: ['director', 'head of'],
  vp: ['vp', 'vice president', 'vice-president'],
  'c-level': ['cto', 'ceo', 'cfo', 'coo', 'cmo', 'chief'],
  unknown: [],
};

function detectSeniority(jd: string): SeniorityLevel {
  const lower = jd.toLowerCase();
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return level as SeniorityLevel;
    }
  }
  return 'unknown';
}

// ─── Remote Type Detection ────────────────────────────────────────────

function detectRemoteType(jd: string): RemoteType {
  const lower = jd.toLowerCase();
  if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) {
    if (lower.includes('hybrid') || lower.includes('partially remote')) return 'hybrid';
    return 'remote';
  }
  if (lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('onsite') || lower.includes('on-site') || lower.includes('in-office')) return 'onsite';
  return 'unknown';
}

// ─── Requirement Extraction ───────────────────────────────────────────

const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'nosql', 'graphql', 'rest', 'grpc',
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'nuxt', 'node', 'nodejs', 'express',
  'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel', 'asp.net',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
  'kafka', 'rabbitmq', 'celery', 'jenkins', 'github actions', 'circleci', 'travis',
  'git', 'github', 'gitlab', 'bitbucket',
  'machine learning', 'ml', 'deep learning', 'nlp', 'computer vision', 'ai', 'artificial intelligence',
  'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
  'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
  'jira', 'confluence', 'notion', 'slack', 'teams',
  'agile', 'scrum', 'kanban', 'lean',
  'ci/cd', 'devops', 'sre', 'infrastructure',
  'microservices', 'serverless', 'lambda', 'api gateway',
  'security', 'oauth', 'jwt', 'encryption', 'authentication',
  'testing', 'jest', 'mocha', 'cypress', 'selenium', 'playwright',
  'webpack', 'vite', 'esbuild', 'rollup',
];

const SOFT_SKILLS = [
  'communication', 'leadership', 'teamwork', 'collaboration', 'problem solving',
  'analytical', 'creative', 'adaptable', 'flexible', 'self-motivated',
  'detail-oriented', 'attention to detail', 'time management', 'organizational',
  'critical thinking', 'decision making', 'conflict resolution', 'mentoring',
  'stakeholder management', 'cross-functional', 'client-facing',
];

function extractRequirements(jd: string): {
  hard: Requirement[];
  preferred: Requirement[];
  contextual: ContextualSignal[];
} {
  const lower = jd.toLowerCase();
  const hard: Requirement[] = [];
  const preferred: Requirement[] = [];
  const contextual: ContextualSignal[] = [];

  // Extract sections from JD
  const sections = extractJDSections(jd);

  // Process requirements section
  const reqSection = sections.requirements || sections.qualifications || '';
  const reqLines = reqSection.split('\n').filter(l => l.trim());

  for (const line of reqLines) {
    const trimmed = line.replace(/^[-•*]\s*/, '').trim();
    if (!trimmed) continue;

    const isPreferred = /preferred|nice.to.have|bonus|plus|ideal|desirable/i.test(trimmed);
    const category = categorizeRequirement(trimmed);
    const priority = isPreferred ? 'preferred' : 'mandatory';

    // Extract specific skills/tools from the requirement text
    const extractedItems = extractSkillsFromText(trimmed);

    for (const item of extractedItems) {
      const req: Requirement = {
        text: item,
        category,
        priority,
        evidenceType: categoryToEvidenceType(category),
      };
      if (isPreferred) {
        preferred.push(req);
      } else {
        hard.push(req);
      }
    }
  }

  // Extract skills from the entire JD
  for (const skill of TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(lower)) {
      // Check if already captured
      const exists = hard.some(r => r.text.toLowerCase() === skill) ||
                     preferred.some(r => r.text.toLowerCase() === skill);
      if (!exists) {
        // Determine priority based on context
        const isRequired = /required|must have|essential|necessary/i.test(
          jd.substring(Math.max(0, lower.indexOf(skill) - 100), lower.indexOf(skill) + skill.length + 100)
        );
        hard.push({
          text: skill,
          category: 'technical-skill',
          priority: isRequired ? 'mandatory' : 'preferred',
          evidenceType: 'skill',
        });
      }
    }
  }

  // Extract soft skills
  for (const skill of SOFT_SKILLS) {
    if (lower.includes(skill)) {
      preferred.push({
        text: skill,
        category: 'soft-skill',
        priority: 'preferred',
        evidenceType: 'soft-skill',
      });
    }
  }

  // Extract contextual signals
  const cultureKeywords = ['culture', 'values', 'mission', 'diversity', 'inclusion', 'equity'];
  for (const kw of cultureKeywords) {
    if (lower.includes(kw)) {
      contextual.push({
        text: extractSentenceContaining(jd, kw),
        signalType: 'culture',
        relevance: 'medium',
      });
    }
  }

  return { hard, preferred, contextual };
}

// ─── JD Section Extraction ────────────────────────────────────────────

function extractJDSections(jd: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = jd.split('\n');
  let currentSection = 'general';
  let currentContent: string[] = [];

  const sectionPatterns = [
    { pattern: /requirements|qualifications|what you.need|you.need/i, name: 'requirements' },
    { pattern: /responsibilities|what you.ll.do|about.the.role|the.role/i, name: 'responsibilities' },
    { pattern: /preferred|nice.to.have|bonus|plus/i, name: 'preferred' },
    { pattern: /about.us|about.the.company|who.we.are|our.company/i, name: 'about' },
    { pattern: /benefits|perks|what.we.offer|compensation/i, name: 'benefits' },
    { pattern: /qualifications|education/i, name: 'qualifications' },
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    const isSectionHeader = sectionPatterns.some(p => p.pattern.test(trimmed));

    if (isSectionHeader) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n');
      }
      const matched = sectionPatterns.find(p => p.pattern.test(trimmed));
      currentSection = matched?.name || 'general';
      currentContent = [];
    } else {
      currentContent.push(trimmed);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n');
  }

  return sections;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function categorizeRequirement(text: string): RequirementCategory {
  const lower = text.toLowerCase();
  if (/python|java|javascript|typescript|go|rust|c\+\+|ruby|php|sql|react|vue|angular|node|django|flask|spring/i.test(lower)) {
    return 'technical-skill';
  }
  if (/experience|years|background/i.test(lower)) return 'experience';
  if (/degree|bachelor|master|phd|university|college/i.test(lower)) return 'education';
  if (/certification|certified|certificate/i.test(lower)) return 'certification';
  if (/tool|platform|software|aws|gcp|azure|docker|kubernetes/i.test(lower)) return 'tool';
  if (/communication|leadership|teamwork|collaboration/i.test(lower)) return 'soft-skill';
  if (/english|spanish|french|mandarin|language/i.test(lower)) return 'language';
  return 'technical-skill';
}

function categoryToEvidenceType(cat: RequirementCategory): EvidenceType {
  const map: Record<RequirementCategory, EvidenceType> = {
    'technical-skill': 'skill',
    experience: 'work-experience',
    education: 'education',
    certification: 'certification',
    tool: 'tool',
    'soft-skill': 'soft-skill',
    language: 'language',
    'domain-knowledge': 'industry',
  };
  return map[cat] || 'skill';
}

function extractSkillsFromText(text: string): string[] {
  const skills: string[] = [];
  const lower = text.toLowerCase();

  for (const skill of TECH_SKILLS) {
    if (lower.includes(skill)) {
      skills.push(skill);
    }
  }

  if (skills.length === 0) {
    // Fall back to the whole text as a single requirement
    skills.push(text);
  }

  return skills;
}

function extractSentenceContaining(text: string, keyword: string): string {
  const sentences = text.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(keyword)) {
      return sentence.trim();
    }
  }
  return keyword;
}

// ─── Main Service ─────────────────────────────────────────────────────

/**
 * Build a structured JobTargetProfile from a job description.
 * Uses deterministic extraction; optionally enhances with AI.
 */
export async function buildJobTargetProfile(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  location?: string;
  useAI?: boolean;
}): Promise<JobTargetProfile> {
  const { jobTitle, company, jobDescription, location, useAI = false } = params;

  // Deterministic extraction
  const seniority = detectSeniority(jobDescription);
  const remoteType = detectRemoteType(jobDescription);
  const { hard, preferred, contextual } = extractRequirements(jobDescription);

  // Extract technologies and tools
  const technologies = TECH_SKILLS.filter(s =>
    jobDescription.toLowerCase().includes(s)
  );

  // Build initial profile
  const profile: JobTargetProfile = {
    targetRole: jobTitle,
    company,
    seniority,
    location: location || extractLocation(jobDescription),
    remoteType,
    hardRequirements: hard,
    preferredRequirements: preferred,
    contextualSignals: contextual,
    keywords: [], // Will be filled by keyword strategy service
    importantPhrases: extractImportantPhrases(jobDescription),
    likelyATSKeywords: extractATSCandidates(jobDescription),
    responsibilities: extractResponsibilities(jobDescription),
    qualifications: extractQualifications(jobDescription),
    industry: detectIndustry(jobDescription),
    tools: technologies.filter(t => isTool(t)),
    technologies: technologies.filter(t => !isTool(t)),
    certifications: extractCertifications(jobDescription),
    candidateGaps: [],
    candidateStrengths: [],
    rawJobDescription: jobDescription,
    extractedAt: new Date(),
    confidence: 0.8,
  };

  return profile;
}

// ─── Additional Extractors ────────────────────────────────────────────

function extractLocation(jd: string): string {
  const locationMatch = jd.match(/(?:location|based in|located in|office)\s*[:\-]?\s*([A-Z][a-zA-Z\s,]+)/i);
  return locationMatch?.[1]?.trim() || 'Not specified';
}

function extractImportantPhrases(jd: string): string[] {
  const phrases: string[] = [];
  const sentences = jd.split(/[.!?\n]+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10 || trimmed.length > 200) continue;

    // Look for phrases that indicate importance
    if (/must|essential|critical|key|important|required/i.test(trimmed)) {
      phrases.push(trimmed);
    }
  }

  return phrases.slice(0, 10);
}

function extractATSCandidates(jd: string): string[] {
  const candidates: string[] = [];
  const lower = jd.toLowerCase();

  // Technical terms that ATS systems commonly search for
  const atsTerms = [
    ...TECH_SKILLS,
    'agile', 'scrum', 'kanban', 'ci/cd', 'devops', 'microservices',
    'restful', 'api', 'database', 'cloud', 'linux', 'unix',
    'version control', 'code review', 'pair programming',
    'test driven', 'tdd', 'bdd',
  ];

  for (const term of atsTerms) {
    if (lower.includes(term)) {
      candidates.push(term);
    }
  }

  return candidates;
}

function extractResponsibilities(jd: string): string[] {
  const sections = extractJDSections(jd);
  const respSection = sections.responsibilities || sections.general || '';
  return respSection
    .split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(l => l.length > 10 && l.length < 300)
    .slice(0, 15);
}

function extractQualifications(jd: string): string[] {
  const sections = extractJDSections(jd);
  const qualSection = sections.requirements || sections.qualifications || '';
  return qualSection
    .split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(l => l.length > 10 && l.length < 300)
    .slice(0, 15);
}

function detectIndustry(jd: string): string {
  const lower = jd.toLowerCase();
  const industries: Record<string, string[]> = {
    fintech: ['fintech', 'financial', 'banking', 'payments', 'insurance'],
    healthtech: ['healthcare', 'health', 'medical', 'clinical', 'biotech'],
    edtech: ['education', 'edtech', 'learning', 'training'],
    saas: ['saas', 'software as a service', 'b2b', 'enterprise software'],
    ecommerce: ['ecommerce', 'e-commerce', 'retail', 'marketplace'],
    gaming: ['gaming', 'game', 'interactive entertainment'],
    ai: ['artificial intelligence', 'machine learning', 'ai', 'ml', 'deep learning'],
    cybersecurity: ['security', 'cybersecurity', 'infosec', 'information security'],
    data: ['data', 'analytics', 'business intelligence', 'bi'],
    consulting: ['consulting', 'professional services', 'advisory'],
  };

  for (const [industry, keywords] of Object.entries(industries)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return industry;
    }
  }
  return 'technology';
}

function extractCertifications(jd: string): string[] {
  const certs: string[] = [];
  const certPatterns = [
    /aws certified[\w\s]+/gi,
    /gcp certified[\w\s]+/gi,
    /azure certified[\w\s]+/gi,
    /pmp/gi,
    /certified scrum[\w\s]+/gi,
    /certified kubernetes[\w\s]+/gi,
    /comp tia[\w\s]+/gi,
    /cis[\w\s]*certified/gi,
    /phd|master|bachelor/gi,
  ];

  for (const pattern of certPatterns) {
    const matches = jd.match(pattern);
    if (matches) {
      certs.push(...matches.map(m => m.trim()));
    }
  }

  return [...new Set(certs)];
}

function isTool(name: string): boolean {
  const tools = [
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
    'github actions', 'circleci', 'travis', 'git', 'github', 'gitlab',
    'jira', 'confluence', 'notion', 'slack', 'figma', 'sketch',
    'webpack', 'vite', 'esbuild', 'rollup',
    'aws', 'gcp', 'azure',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'kafka', 'rabbitmq',
  ];
  return tools.includes(name.toLowerCase());
}

// Re-export the type
import type { EvidenceType } from './types';

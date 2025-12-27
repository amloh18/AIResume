/**
 * CV Scoring Service
 * 
 * Provides dual scoring systems for the Resume Enhancer:
 * - CV Score: Quality assessment for Master/Standalone CVs
 * - ATS Score: JD match assessment for Journey CVs
 */

import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { KeywordGapAnalysisResult } from '@/types/keyword-gap';

/**
 * CV Score breakdown for quality assessment
 * Formula: (C + I + Q + F + R) × V
 */
export interface CVScoreBreakdown {
  completeness: number;         // C: 0-25 (sections filled)
  impactVerbs: number;          // I: 0-20 (action verbs usage)
  quantification: number;       // Q: 0-20 (metrics/numbers)
  formatting: number;           // F: 0-15 (consistency)
  readability: number;          // R: 0-20 (sentence structure)
  total: number;                // 0-100 (after multiplier)
  rawTotal: number;             // 0-100 (before multiplier)
  validityMultiplier: number;   // V: 0.2 if words < 100, else 1.0
  penaltyReasons: string[];     // Reasons for any score penalties
}

/**
 * ATS Score breakdown for JD match assessment
 * Formula: [(K × 0.4) + (F × 0.2) + (S × 0.15) + (R × 0.15) + (C × 0.1)] × P
 */
export interface ATSScoreBreakdown {
  keywordMatch: number;          // K: 0-40 (JD keywords found)
  formatting: number;            // F: 0-20 (parsability/layout)
  sectionAlignment: number;      // S: 0-15 (header mapping)
  recency: number;               // R: 0-15 (recent skills weighting)
  contactability: number;        // C: 0-10 (contact info presence)
  total: number;                 // 0-100 (after multiplier)
  rawTotal: number;              // 0-100 (before multiplier)
  parsabilityMultiplier: number; // P: 0.1 if unreadable/<50 words, else 1.0
  context: 'jd-specific' | 'industry-general'; // Scoring context
  // Legacy fields for backward compatibility
  experienceAlign?: number;
  skillsCoverage?: number;
  parseability?: number;
}

/**
 * Combined score result
 */
export interface ScoreResult {
  cvScore: CVScoreBreakdown;
  atsScore?: ATSScoreBreakdown;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

/**
 * Impact verbs for analysis
 */
const IMPACT_VERBS = [
  'led', 'managed', 'developed', 'created', 'implemented', 'improved',
  'increased', 'reduced', 'optimized', 'designed', 'built', 'established',
  'coordinated', 'supervised', 'analyzed', 'resolved', 'delivered',
  'achieved', 'generated', 'streamlined', 'spearheaded', 'orchestrated',
  'pioneered', 'transformed', 'accelerated', 'launched', 'executed',
  'negotiated', 'mentored', 'facilitated', 'automated', 'consolidated'
];

/**
 * Quantifier patterns for detecting metrics
 */
const QUANTIFIER_PATTERNS = [
  /\d+%/g,                           // Percentages
  /\$[\d,]+/g,                       // Dollar amounts
  /\d+[xX]/g,                        // Multipliers (2x, 10X)
  /\d+\s*(million|billion|k|K)/gi,   // Large numbers
  /\d+\s*(users|customers|clients)/gi, // User counts
  /\d+\s*(projects?|teams?|members?)/gi, // Team/project counts
  /\d+\s*(years?|months?)/gi,        // Time periods
  /\d+-\d+%/g,                       // Ranges
  /top\s*\d+/gi,                     // Rankings
  /\d+\+/g                           // "5+ years"
];

/**
 * Industry Standard Keywords Map
 * Used for Master CV scoring when no JD is provided.
 * Maps roles to their industry-standard keywords for "Market Readiness" scoring.
 */
type IndustryRole =
  | 'software_engineer'
  | 'product_manager'
  | 'data_scientist'
  | 'designer'
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'operations'
  | 'human_resources'
  | 'project_manager'
  | 'executive'
  | 'consultant'
  | 'generic';

interface IndustryKeywordSet {
  technicalSkills: string[];
  softSkills: string[];
  competencies: string[];
  tools: string[];
  certifications: string[];
}

const INDUSTRY_STANDARD_KEYWORDS: Record<IndustryRole, IndustryKeywordSet> = {
  software_engineer: {
    technicalSkills: [
      'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'aws', 'docker',
      'kubernetes', 'sql', 'nosql', 'mongodb', 'postgresql', 'git', 'ci/cd', 'rest api',
      'graphql', 'microservices', 'agile', 'scrum', 'testing', 'debugging', 'optimization'
    ],
    softSkills: ['problem-solving', 'collaboration', 'communication', 'attention to detail'],
    competencies: ['software development', 'code review', 'system design', 'architecture', 'performance optimization'],
    tools: ['github', 'jira', 'jenkins', 'vs code', 'postman', 'terraform', 'datadog'],
    certifications: ['aws certified', 'azure certified', 'google cloud', 'kubernetes certified']
  },
  product_manager: {
    technicalSkills: [
      'product strategy', 'roadmap', 'user research', 'a/b testing', 'analytics',
      'market analysis', 'competitor analysis', 'pricing strategy', 'go-to-market'
    ],
    softSkills: ['stakeholder management', 'cross-functional leadership', 'decision making', 'prioritization'],
    competencies: ['product lifecycle', 'feature planning', 'customer discovery', 'metrics-driven', 'okrs'],
    tools: ['jira', 'productboard', 'amplitude', 'mixpanel', 'figma', 'notion', 'confluence'],
    certifications: ['product management certified', 'agile certified', 'scrum master']
  },
  data_scientist: {
    technicalSkills: [
      'python', 'r', 'sql', 'machine learning', 'deep learning', 'statistics',
      'data analysis', 'data visualization', 'nlp', 'computer vision', 'tensorflow', 'pytorch'
    ],
    softSkills: ['analytical thinking', 'storytelling', 'critical thinking', 'curiosity'],
    competencies: ['data modeling', 'feature engineering', 'model deployment', 'a/b testing', 'hypothesis testing'],
    tools: ['jupyter', 'pandas', 'numpy', 'scikit-learn', 'tableau', 'power bi', 'spark', 'databricks'],
    certifications: ['google data analytics', 'aws machine learning', 'tensorflow certified']
  },
  designer: {
    technicalSkills: [
      'ui design', 'ux design', 'user research', 'prototyping', 'wireframing',
      'visual design', 'interaction design', 'design systems', 'responsive design'
    ],
    softSkills: ['creativity', 'empathy', 'collaboration', 'attention to detail', 'communication'],
    competencies: ['user-centered design', 'accessibility', 'design thinking', 'usability testing'],
    tools: ['figma', 'sketch', 'adobe xd', 'invision', 'principle', 'framer', 'photoshop', 'illustrator'],
    certifications: ['google ux design', 'interaction design foundation', 'nielsen norman']
  },
  marketing: {
    technicalSkills: [
      'digital marketing', 'seo', 'sem', 'content marketing', 'social media',
      'email marketing', 'marketing automation', 'analytics', 'ppc', 'conversion optimization'
    ],
    softSkills: ['creativity', 'communication', 'strategic thinking', 'adaptability'],
    competencies: ['campaign management', 'brand strategy', 'lead generation', 'customer acquisition'],
    tools: ['hubspot', 'mailchimp', 'google analytics', 'google ads', 'facebook ads', 'hootsuite', 'semrush'],
    certifications: ['google ads certified', 'hubspot certified', 'facebook blueprint']
  },
  sales: {
    technicalSkills: [
      'sales strategy', 'lead generation', 'pipeline management', 'negotiation',
      'account management', 'cold calling', 'solution selling', 'consultative selling'
    ],
    softSkills: ['persuasion', 'relationship building', 'resilience', 'active listening', 'communication'],
    competencies: ['quota attainment', 'revenue growth', 'customer retention', 'territory management'],
    tools: ['salesforce', 'hubspot', 'linkedin sales navigator', 'outreach', 'gong', 'zoominfo'],
    certifications: ['salesforce certified', 'sandler training', 'challenger sales']
  },
  finance: {
    technicalSkills: [
      'financial analysis', 'budgeting', 'forecasting', 'accounting', 'gaap',
      'financial modeling', 'valuation', 'risk management', 'auditing'
    ],
    softSkills: ['analytical thinking', 'attention to detail', 'integrity', 'communication'],
    competencies: ['financial reporting', 'cost analysis', 'investment analysis', 'compliance'],
    tools: ['excel', 'sap', 'oracle', 'quickbooks', 'bloomberg', 'tableau', 'power bi'],
    certifications: ['cpa', 'cfa', 'cma', 'acca', 'fmva']
  },
  operations: {
    technicalSkills: [
      'process improvement', 'supply chain', 'inventory management', 'logistics',
      'quality control', 'lean', 'six sigma', 'operations management'
    ],
    softSkills: ['problem-solving', 'organization', 'leadership', 'adaptability'],
    competencies: ['efficiency optimization', 'vendor management', 'capacity planning', 'kpi management'],
    tools: ['sap', 'oracle', 'microsoft project', 'asana', 'monday.com', 'smartsheet'],
    certifications: ['pmp', 'six sigma green belt', 'six sigma black belt', 'lean certified']
  },
  human_resources: {
    technicalSkills: [
      'recruiting', 'talent acquisition', 'employee relations', 'performance management',
      'compensation', 'benefits administration', 'hris', 'onboarding', 'offboarding'
    ],
    softSkills: ['empathy', 'communication', 'conflict resolution', 'confidentiality', 'discretion'],
    competencies: ['workforce planning', 'employee engagement', 'compliance', 'culture building'],
    tools: ['workday', 'bamboohr', 'greenhouse', 'lever', 'adp', 'linkedin recruiter'],
    certifications: ['phr', 'sphr', 'shrm-cp', 'shrm-scp']
  },
  project_manager: {
    technicalSkills: [
      'project planning', 'risk management', 'scope management', 'budget management',
      'resource allocation', 'stakeholder management', 'agile', 'waterfall', 'kanban'
    ],
    softSkills: ['leadership', 'communication', 'problem-solving', 'negotiation', 'time management'],
    competencies: ['project delivery', 'milestone tracking', 'team coordination', 'change management'],
    tools: ['jira', 'asana', 'microsoft project', 'trello', 'monday.com', 'confluence', 'smartsheet'],
    certifications: ['pmp', 'prince2', 'agile certified', 'scrum master', 'safe']
  },
  executive: {
    technicalSkills: [
      'strategic planning', 'business development', 'p&l management', 'board relations',
      'investor relations', 'mergers and acquisitions', 'organizational design'
    ],
    softSkills: ['vision', 'leadership', 'executive presence', 'decision making', 'influence'],
    competencies: ['corporate strategy', 'turnaround management', 'growth strategy', 'governance'],
    tools: ['bloomberg', 'salesforce', 'power bi', 'board reporting tools'],
    certifications: ['mba', 'executive education', 'board director certification']
  },
  consultant: {
    technicalSkills: [
      'strategy consulting', 'business analysis', 'process improvement', 'change management',
      'client management', 'research', 'presentation', 'stakeholder engagement'
    ],
    softSkills: ['analytical thinking', 'communication', 'adaptability', 'problem-solving', 'client focus'],
    competencies: ['project delivery', 'solution design', 'industry expertise', 'thought leadership'],
    tools: ['powerpoint', 'excel', 'tableau', 'alteryx', 'miro', 'lucidchart'],
    certifications: ['management consulting certified', 'cmb certified']
  },
  generic: {
    technicalSkills: [
      'microsoft office', 'excel', 'communication', 'project management', 'data analysis'
    ],
    softSkills: ['teamwork', 'communication', 'problem-solving', 'time management', 'adaptability'],
    competencies: ['leadership', 'critical thinking', 'organization', 'attention to detail'],
    tools: ['microsoft office', 'google workspace', 'slack', 'zoom'],
    certifications: []
  }
};

/**
 * Role detection patterns for mapping job titles to industry roles
 */
const ROLE_DETECTION_PATTERNS: Array<{ patterns: RegExp[]; role: IndustryRole }> = [
  {
    patterns: [/software|developer|engineer|programmer|full.?stack|front.?end|back.?end|devops|sre|swe/i],
    role: 'software_engineer'
  },
  {
    patterns: [/product\s*manager|product\s*owner|pm\b/i],
    role: 'product_manager'
  },
  {
    patterns: [/data\s*scientist|machine\s*learning|ml\s*engineer|ai\s*engineer|data\s*analyst/i],
    role: 'data_scientist'
  },
  {
    patterns: [/designer|ux|ui|user\s*experience|user\s*interface|creative|graphic/i],
    role: 'designer'
  },
  {
    patterns: [/marketing|growth|brand|content|seo|digital\s*marketing|social\s*media/i],
    role: 'marketing'
  },
  {
    patterns: [/sales|account\s*executive|business\s*development|bdr|sdr|ae\b/i],
    role: 'sales'
  },
  {
    patterns: [/finance|accountant|accounting|cfo|financial|controller|treasurer/i],
    role: 'finance'
  },
  {
    patterns: [/operations|supply\s*chain|logistics|procurement|ops\s*manager/i],
    role: 'operations'
  },
  {
    patterns: [/hr|human\s*resources|recruiter|talent|people\s*ops|hrbp/i],
    role: 'human_resources'
  },
  {
    patterns: [/project\s*manager|program\s*manager|pmo|scrum\s*master/i],
    role: 'project_manager'
  },
  {
    patterns: [/ceo|cto|coo|cfo|cmo|vp|vice\s*president|director|head\s*of|chief/i],
    role: 'executive'
  },
  {
    patterns: [/consultant|advisor|analyst|strategy/i],
    role: 'consultant'
  }
];

export class CVScoringService {
  /**
   * Calculate word count from CV data for V multiplier
   */
  private static getWordCount(cvData: UnifiedCVDataStructure): number {
    return JSON.stringify(cvData).split(/\s+/).length;
  }

  /**
   * Calculate Validity Multiplier (V)
   * V = 0.2 if word count < 100 or placeholder-only, else 1.0
   */
  private static calculateValidityMultiplier(cvData: UnifiedCVDataStructure): { multiplier: number; reasons: string[] } {
    const wordCount = this.getWordCount(cvData);
    const reasons: string[] = [];

    // Check for low word count
    if (wordCount < 100) {
      reasons.push(`Low content density (${wordCount} words, minimum 100)`);
      return { multiplier: 0.2, reasons };
    }

    // Check for placeholder-only content
    const cvText = JSON.stringify(cvData).toLowerCase();
    const placeholderPatterns = ['lorem ipsum', 'placeholder', '[your name]', 'example.com', 'xxx', 'n/a'];
    const hasPlaceholders = placeholderPatterns.some(p => cvText.includes(p));
    if (hasPlaceholders) {
      reasons.push('Placeholder content detected');
      return { multiplier: 0.2, reasons };
    }

    // Check for missing critical sections
    const hasSummary = cvData.basics?.summary && cvData.basics.summary.length > 20;
    const hasWork = cvData.work && cvData.work.length > 0;
    const hasSkills = cvData.skills && cvData.skills.length > 0;

    if (!hasSummary && !hasWork) {
      reasons.push('Missing summary and work experience');
      return { multiplier: 0.2, reasons };
    }

    return { multiplier: 1.0, reasons: [] };
  }

  /**
   * Calculate complete CV Score (for Master/Standalone CVs)
   * Formula: (C + I + Q + F + R) × V
   */
  static calculateCVScore(cvData: UnifiedCVDataStructure): CVScoreBreakdown {
    const completeness = this.calculateCompletenessScore(cvData);
    const impactVerbs = this.calculateImpactVerbsScore(cvData);
    const quantification = this.calculateQuantificationScore(cvData);
    const formatting = this.calculateFormattingScore(cvData);
    const readability = this.calculateReadabilityScore(cvData);

    const rawTotal = Math.min(completeness + impactVerbs + quantification + formatting + readability, 100);

    // Apply Validity Multiplier
    const { multiplier: validityMultiplier, reasons: penaltyReasons } = this.calculateValidityMultiplier(cvData);
    const total = Math.round(rawTotal * validityMultiplier);

    return {
      completeness,
      impactVerbs,
      quantification,
      formatting,
      readability,
      rawTotal,
      total,
      validityMultiplier,
      penaltyReasons
    };
  }

  /**
   * Calculate Parsability Multiplier (P)
   * P = 0.1 if unreadable/<50 words or no work experience, else 1.0
   */
  private static calculateParsabilityMultiplier(cvData: UnifiedCVDataStructure): number {
    const wordCount = this.getWordCount(cvData);

    // Crash if word count < 50
    if (wordCount < 50) {
      return 0.1;
    }

    // Crash if no work experience (unreadable history)
    if (!cvData.work || cvData.work.length === 0) {
      return 0.1;
    }

    // Keyword stuffer penalty: many skills but no work
    const skillsCount = cvData.skills?.length || 0;
    const workCount = cvData.work?.length || 0;
    if (skillsCount > 20 && workCount < 2) {
      return 0.2;
    }

    return 1.0;
  }

  /**
   * Calculate ATS Section Alignment Score (S)
   */
  private static calculateSectionAlignmentScore(cvData: UnifiedCVDataStructure): number {
    let score = 0;

    // Check for standard headers/sections
    if (cvData.basics?.name) score += 3;
    if (cvData.education && cvData.education.length > 0) score += 4;
    if (cvData.work && cvData.work.length > 0) score += 5;
    if (cvData.skills && cvData.skills.length > 0) score += 3;

    return Math.min(score, 15);
  }

  /**
   * Calculate ATS Recency Score (R) - weighting skills in last 3 years
   */
  private static calculateRecencyScore(cvData: UnifiedCVDataStructure): number {
    if (!cvData.work || cvData.work.length === 0) return 5;

    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());

    const recentJobs = cvData.work.filter((job: any) => {
      if (!job.startDate) return false;
      const startDate = new Date(job.startDate);
      return startDate >= threeYearsAgo || job.endDate === '' || job.endDate === 'Present';
    });

    if (recentJobs.length === 0) return 5;
    if (recentJobs.length === 1) return 10;
    return 15;
  }

  /**
   * Calculate ATS Contactability Score (C)
   */
  private static calculateContactabilityScore(cvData: UnifiedCVDataStructure): number {
    let score = 0;

    if (cvData.basics?.email) score += 4;
    if (cvData.basics?.phone) score += 3;
    if (cvData.basics?.url || cvData.basics?.profiles?.some((p: any) => p.network?.toLowerCase() === 'linkedin')) score += 3;

    return Math.min(score, 10);
  }

  /**
   * Calculate ATS Formatting Score (F) for parsability
   */
  private static calculateATSFormattingScore(cvData: UnifiedCVDataStructure): number {
    let score = 20; // Start with max

    // Deduct for long bullet points (hard to parse)
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights) {
          job.highlights.forEach((h: string) => {
            if (h.length > 200) score -= 2;
          });
        }
      });
    }

    return Math.max(score, 0);
  }

  /**
   * Detect the industry role from CV based on most recent job title
   */
  static detectRoleFromCV(cvData: UnifiedCVDataStructure): { role: IndustryRole; detectedTitle: string | null } {
    // Try to get the most recent job title
    let detectedTitle: string | null = null;

    if (cvData.work && cvData.work.length > 0) {
      // Sort by end date (most recent first), treating "Present" as most recent
      const sortedWork = [...cvData.work].sort((a: any, b: any) => {
        const aEnd = a.endDate?.toLowerCase() === 'present' ? '9999-12' : a.endDate || '0000-00';
        const bEnd = b.endDate?.toLowerCase() === 'present' ? '9999-12' : b.endDate || '0000-00';
        return bEnd.localeCompare(aEnd);
      });

      detectedTitle = sortedWork[0]?.position || null;
    }

    // Also check basics.label as a fallback
    if (!detectedTitle && cvData.basics?.label) {
      detectedTitle = cvData.basics.label;
    }

    if (!detectedTitle) {
      return { role: 'generic', detectedTitle: null };
    }

    // Match against role patterns
    for (const { patterns, role } of ROLE_DETECTION_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(detectedTitle)) {
          return { role, detectedTitle };
        }
      }
    }

    return { role: 'generic', detectedTitle };
  }

  /**
   * Calculate industry standard keyword match score (0-40)
   * Used for Master CVs when no JD is provided
   */
  static calculateIndustryKeywordMatch(cvData: UnifiedCVDataStructure): { score: number; matchedKeywords: string[]; totalKeywords: number; detectedRole: IndustryRole } {
    const { role } = this.detectRoleFromCV(cvData);
    const industryKeywords = INDUSTRY_STANDARD_KEYWORDS[role];

    // Combine all keywords for matching
    const allKeywords = [
      ...industryKeywords.technicalSkills,
      ...industryKeywords.softSkills,
      ...industryKeywords.competencies,
      ...industryKeywords.tools,
      ...industryKeywords.certifications
    ];

    // Get all CV text for matching
    const cvText = this.getAllText(cvData).toLowerCase();

    // Find matches
    const matchedKeywords: string[] = [];
    allKeywords.forEach(keyword => {
      // Use word boundary matching for accurate detection
      const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(cvText)) {
        matchedKeywords.push(keyword);
      }
    });

    // Calculate score (0-40 scale, same as JD keyword match)
    const matchRatio = allKeywords.length > 0 ? matchedKeywords.length / allKeywords.length : 0;
    const score = Math.round(matchRatio * 40);

    return {
      score: Math.min(score, 40),
      matchedKeywords,
      totalKeywords: allKeywords.length,
      detectedRole: role
    };
  }

  /**
   * Calculate ATS Score (for Journey CVs) or Industry Readiness Score (for Master CVs)
   * Formula: [(K × 0.4) + (F × 0.2) + (S × 0.15) + (R × 0.15) + (C × 0.1)] × P
   * 
   * When no JD is provided (keywordAnalysis is null), switches to Industry Standard mode
   * using the user's detected role for keyword matching.
   */
  static calculateATSScore(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis: KeywordGapAnalysisResult | null,
    atsScoreCap: number = 100,
    context: 'jd-specific' | 'industry-general' = 'jd-specific'
  ): ATSScoreBreakdown {
    // Calculate individual factors
    let keywordMatch: number;
    let actualContext: 'jd-specific' | 'industry-general';

    if (keywordAnalysis) {
      // JD-specific matching
      keywordMatch = this.calculateKeywordMatchScore(keywordAnalysis);
      actualContext = 'jd-specific';
    } else {
      // Industry-general matching (Master CV mode)
      const industryMatch = this.calculateIndustryKeywordMatch(cvData);
      keywordMatch = industryMatch.score;
      actualContext = 'industry-general';
    }

    const formatting = this.calculateATSFormattingScore(cvData);
    const sectionAlignment = this.calculateSectionAlignmentScore(cvData);
    const recency = this.calculateRecencyScore(cvData);
    const contactability = this.calculateContactabilityScore(cvData);

    // Apply weighted formula
    const weightedScore = (keywordMatch * 0.4) + (formatting * 0.2) + (sectionAlignment * 0.15) + (recency * 0.15) + (contactability * 0.1);
    const rawTotal = Math.min(Math.round(weightedScore * 100 / 40), 100); // Normalize to 0-100

    // Apply Parsability Multiplier
    const parsabilityMultiplier = this.calculateParsabilityMultiplier(cvData);
    const total = Math.min(Math.round(rawTotal * parsabilityMultiplier), atsScoreCap);

    return {
      keywordMatch,
      formatting,
      sectionAlignment,
      recency,
      contactability,
      rawTotal,
      total,
      parsabilityMultiplier,
      context: actualContext,
      // Legacy fields for backward compatibility
      experienceAlign: Math.round(sectionAlignment + recency),
      skillsCoverage: keywordMatch,
      parseability: formatting
    };
  }

  /**
   * Get full score result with recommendations
   */
  static getFullScoreResult(
    cvData: UnifiedCVDataStructure,
    keywordAnalysis?: KeywordGapAnalysisResult,
    atsScoreCap: number = 100
  ): ScoreResult {
    const cvScore = this.calculateCVScore(cvData);

    let atsScore: ATSScoreBreakdown | undefined;
    if (keywordAnalysis) {
      atsScore = this.calculateATSScore(cvData, keywordAnalysis, atsScoreCap);
    }

    const primaryScore = atsScore?.total ?? cvScore.total;
    const overallGrade = this.getGrade(primaryScore);
    const recommendations = this.generateRecommendations(cvScore, atsScore, cvData);

    return {
      cvScore,
      atsScore,
      overallGrade,
      recommendations
    };
  }

  /**
   * Completeness score (0-25)
   */
  private static calculateCompletenessScore(cvData: UnifiedCVDataStructure): number {
    let score = 0;

    // Personal info (7 points)
    if (cvData.basics?.name) score += 2;
    if (cvData.basics?.email) score += 2;
    if (cvData.basics?.phone) score += 1;
    if (cvData.basics?.location) score += 1;
    if (cvData.basics?.summary && cvData.basics.summary.length > 100) score += 1;

    // Work experience (8 points)
    if (cvData.work && cvData.work.length > 0) {
      score += 3;
      const hasHighlights = cvData.work.some((w: any) =>
        w.highlights && w.highlights.length > 0
      );
      if (hasHighlights) score += 3;
      if (cvData.work.length >= 2) score += 2;
    }

    // Skills (4 points)
    if (cvData.skills && cvData.skills.length > 0) {
      score += 2;
      if (cvData.skills.length >= 5) score += 2;
    }

    // Education (3 points)
    if (cvData.education && cvData.education.length > 0) score += 3;

    // Bonus: Projects/Certificates (3 points)
    if (cvData.projects && cvData.projects.length > 0) score += 1.5;
    if (cvData.certificates && cvData.certificates.length > 0) score += 1.5;

    return Math.min(score, 25);
  }

  /**
   * Impact verbs score (0-20)
   */
  private static calculateImpactVerbsScore(cvData: UnifiedCVDataStructure): number {
    let verbCount = 0;
    let totalBullets = 0;

    // Check work highlights
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: string) => {
            totalBullets++;
            const lowerHighlight = highlight.toLowerCase().trim();
            const firstWord = lowerHighlight.split(/\s+/)[0];
            if (IMPACT_VERBS.includes(firstWord)) {
              verbCount++;
            }
          });
        }
      });
    }

    // Check project descriptions
    if (cvData.projects) {
      cvData.projects.forEach((project: any) => {
        if (project.description) {
          totalBullets++;
          const lowerDesc = project.description.toLowerCase().trim();
          const firstWord = lowerDesc.split(/\s+/)[0];
          if (IMPACT_VERBS.includes(firstWord)) {
            verbCount++;
          }
        }
      });
    }

    if (totalBullets === 0) return 10; // Default if no content

    const ratio = verbCount / totalBullets;
    return Math.round(ratio * 20);
  }

  /**
   * Quantification score (0-20)
   */
  private static calculateQuantificationScore(cvData: UnifiedCVDataStructure): number {
    let quantCount = 0;
    let totalBullets = 0;

    const countQuantifiers = (text: string): number => {
      let count = 0;
      QUANTIFIER_PATTERNS.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) count += matches.length;
      });
      return count;
    };

    // Check work highlights
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: string) => {
            totalBullets++;
            if (countQuantifiers(highlight) > 0) {
              quantCount++;
            }
          });
        }
      });
    }

    // Check summary
    if (cvData.basics?.summary) {
      if (countQuantifiers(cvData.basics.summary) > 0) {
        quantCount += 2; // Bonus for quantified summary
      }
    }

    if (totalBullets === 0) return 10; // Default if no content

    const ratio = quantCount / totalBullets;
    return Math.round(ratio * 20);
  }

  /**
   * Formatting score (0-15)
   */
  private static calculateFormattingScore(cvData: UnifiedCVDataStructure): number {
    let score = 15; // Start with perfect, deduct for issues

    // Check for consistent date formats
    let dateFormats = new Set<string>();
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.startDate) {
          dateFormats.add(this.getDateFormat(job.startDate));
        }
      });
    }
    if (dateFormats.size > 1) score -= 3;

    // Check for overly long bullets
    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.highlights) {
          job.highlights.forEach((h: string) => {
            if (h.length > 200) score -= 1;
          });
        }
      });
    }

    // Check summary length
    if (cvData.basics?.summary) {
      if (cvData.basics.summary.length < 50) score -= 2;
      if (cvData.basics.summary.length > 500) score -= 2;
    }

    return Math.max(score, 0);
  }

  /**
   * Readability score (0-20)
   */
  private static calculateReadabilityScore(cvData: UnifiedCVDataStructure): number {
    let score = 20;
    const issues: string[] = [];

    // Check for common readability issues
    const allText = this.getAllText(cvData);

    // Passive voice detection (basic)
    const passivePatterns = /\b(was|were|been|being|is|are)\s+\w+ed\b/gi;
    const passiveCount = (allText.match(passivePatterns) || []).length;
    if (passiveCount > 5) score -= 3;

    // Overly complex sentences (basic check)
    const sentences = allText.split(/[.!?]+/);
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 30).length;
    if (longSentences > 3) score -= 3;

    // Repeated words/phrases
    const words = allText.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      if (w.length > 5) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    const overusedWords = Object.values(wordFreq).filter(f => f > 5).length;
    if (overusedWords > 3) score -= 2;

    // Clichés
    const cliches = [
      'team player', 'hard worker', 'go-getter', 'think outside the box',
      'synergy', 'leverage', 'results-driven', 'self-starter'
    ];
    cliches.forEach(cliche => {
      if (allText.toLowerCase().includes(cliche)) score -= 1;
    });

    return Math.max(score, 0);
  }

  /**
   * Keyword match score for ATS (0-40)
   */
  private static calculateKeywordMatchScore(analysis: KeywordGapAnalysisResult): number {
    const { stats } = analysis;
    if (stats.totalJDKeywords === 0) return 20;

    const matchRatio = stats.matchedCount / stats.totalJDKeywords;
    return Math.round(matchRatio * 40);
  }

  /**
   * Experience alignment score for ATS (0-25)
   */
  private static calculateExperienceAlignScore(
    cvData: UnifiedCVDataStructure,
    analysis: KeywordGapAnalysisResult
  ): number {
    // Check if experience-related gaps exist
    const experienceGaps = analysis.gaps.filter(g => g.category === 'experience');
    const hasCriticalExpGaps = experienceGaps.some(g => g.importance === 'critical');

    let score = 25;
    if (hasCriticalExpGaps) score -= 15;
    else if (experienceGaps.length > 0) score -= 5;

    // Check for work experience presence
    if (!cvData.work || cvData.work.length === 0) score -= 10;

    return Math.max(score, 0);
  }

  /**
   * Skills coverage score for ATS (0-20)
   */
  private static calculateSkillsCoverageScore(
    cvData: UnifiedCVDataStructure,
    analysis: KeywordGapAnalysisResult
  ): number {
    const skillGaps = analysis.gaps.filter(g =>
      g.category === 'skill' || g.category === 'tool'
    );
    const criticalSkillGaps = skillGaps.filter(g => g.importance === 'critical');

    let score = 20;
    score -= criticalSkillGaps.length * 3;
    score -= (skillGaps.length - criticalSkillGaps.length) * 1;

    return Math.max(score, 0);
  }

  /**
   * Parseability score based on template (0-15)
   */
  private static calculateParseabilityScore(atsScoreCap: number): number {
    // Convert cap to parseability score
    // Cap of 100 = 15 points, Cap of 60 = 9 points
    return Math.round((atsScoreCap / 100) * 15);
  }

  /**
   * Get letter grade from score
   */
  private static getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on scores
   */
  private static generateRecommendations(
    cvScore: CVScoreBreakdown,
    atsScore?: ATSScoreBreakdown,
    cvData?: UnifiedCVDataStructure
  ): string[] {
    const recommendations: string[] = [];

    // CV Score recommendations
    if (cvScore.completeness < 15) {
      recommendations.push('Add more sections to your CV (skills, projects, certificates)');
    }
    if (cvScore.impactVerbs < 12) {
      recommendations.push('Start bullet points with strong action verbs (Led, Developed, Implemented)');
    }
    if (cvScore.quantification < 12) {
      recommendations.push('Add metrics and numbers to demonstrate impact (%, $, counts)');
    }
    if (cvScore.readability < 12) {
      recommendations.push('Simplify sentences and remove clichés');
    }

    // ATS Score recommendations
    if (atsScore) {
      if (atsScore.keywordMatch < 25) {
        recommendations.push('Add missing keywords from the job description to your CV');
      }
      // Use new sectionAlignment or legacy skillsCoverage
      const skillScore = atsScore.sectionAlignment ?? (atsScore.skillsCoverage ?? 0);
      if (skillScore < 12) {
        recommendations.push('Ensure your skills section includes required technologies');
      }
      // Use new formatting or legacy parseability
      const parseScore = atsScore.formatting ?? (atsScore.parseability ?? 0);
      if (parseScore < 10) {
        recommendations.push('Consider using an ATS-friendly template for better parsing');
      }
      // Add multiplier-specific recommendations
      if (atsScore.parsabilityMultiplier < 1.0) {
        recommendations.push('Your CV lacks sufficient content for ATS parsing - add more work experience');
      }
    }

    return recommendations.slice(0, 5); // Max 5 recommendations
  }

  /**
   * Helper: Get date format pattern
   */
  private static getDateFormat(date: string): string {
    if (/^\d{4}-\d{2}$/.test(date)) return 'YYYY-MM';
    if (/^\d{4}$/.test(date)) return 'YYYY';
    if (/^[A-Za-z]+\s+\d{4}$/.test(date)) return 'Month YYYY';
    return 'other';
  }

  /**
   * Helper: Get all text from CV
   */
  private static getAllText(cvData: UnifiedCVDataStructure): string {
    const parts: string[] = [];

    if (cvData.basics?.summary) parts.push(cvData.basics.summary);

    if (cvData.work) {
      cvData.work.forEach((job: any) => {
        if (job.summary) parts.push(job.summary);
        if (job.highlights) parts.push(...job.highlights);
      });
    }

    if (cvData.projects) {
      cvData.projects.forEach((p: any) => {
        if (p.description) parts.push(p.description);
      });
    }

    return parts.join(' ');
  }
}


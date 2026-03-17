import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Issue, ResumeState } from './types';
import { globalRegistry, RuleRegistry } from './registry';
import { KeywordGapAnalysisResult } from '@/types/keyword-gap';

// --- Constants (Centralized Scoring) ---
const IMPACT_VERBS = [
    'led', 'managed', 'developed', 'created', 'implemented', 'improved',
    'increased', 'reduced', 'optimized', 'designed', 'built', 'established',
    'coordinated', 'supervised', 'analyzed', 'resolved', 'delivered',
    'achieved', 'generated', 'streamlined', 'spearheaded', 'orchestrated',
    'pioneered', 'transformed', 'accelerated', 'launched', 'executed',
    'negotiated', 'mentored', 'facilitated', 'automated', 'consolidated'
];

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

// --- Interfaces ---
export interface CVScoreBreakdown {
    completeness: number;         // C: 0-25
    impactVerbs: number;          // I: 0-20
    quantification: number;       // Q: 0-20
    formatting: number;           // F: 0-15
    readability: number;          // R: 0-20
    total: number;                // 0-100 (after multiplier)
    rawTotal: number;             // 0-100 (before multiplier)
    validityMultiplier: number;   // V
    penaltyReasons: string[];
}

export interface ATSScoreBreakdown {
    keywordMatch: number;          // K: 0-40
    formatting: number;            // F: 0-20
    sectionAlignment: number;      // S: 0-15
    recency: number;               // R: 0-15
    contactability: number;        // C: 0-10
    total: number;                 // 0-100
    rawTotal: number;              // 0-100
    parsabilityMultiplier: number; // P
    context: 'jd-specific' | 'industry-general';
    // Legacy fields
    experienceAlign?: number;
    skillsCoverage?: number;
    parseability?: number;
}

export interface ScoreResult {
    cvScore: CVScoreBreakdown;
    atsScore?: ATSScoreBreakdown;
    overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: Issue[]; // Unified issues list
    recommendations: string[]; // High-level advice
}

// Industry Types & Data
export type IndustryRole =
    | 'software_engineer' | 'product_manager' | 'data_scientist' | 'designer'
    | 'marketing' | 'sales' | 'finance' | 'operations' | 'human_resources'
    | 'project_manager' | 'executive' | 'consultant' | 'generic';

const ROLE_DETECTION_PATTERNS: Array<{ patterns: RegExp[]; role: IndustryRole }> = [
    { patterns: [/software|developer|engineer|programmer|full.?stack|front.?end|back.?end|devops|sre|swe/i], role: 'software_engineer' },
    { patterns: [/product\s*manager|product\s*owner|pm\b/i], role: 'product_manager' },
    { patterns: [/data\s*scientist|machine\s*learning|ml\s*engineer|ai\s*engineer|data\s*analyst/i], role: 'data_scientist' },
    { patterns: [/designer|ux|ui|user\s*experience|user\s*interface|creative|graphic/i], role: 'designer' },
    { patterns: [/marketing|growth|brand|content|seo|digital\s*marketing|social\s*media/i], role: 'marketing' },
    { patterns: [/sales|account\s*executive|business\s*development|bdr|sdr|ae\b/i], role: 'sales' },
    { patterns: [/finance|accountant|accounting|cfo|financial|controller|treasurer/i], role: 'finance' },
    { patterns: [/operations|supply\s*chain|logistics|procurement|ops\s*manager/i], role: 'operations' },
    { patterns: [/hr|human\s*resources|recruiter|talent|people\s*ops|hrbp/i], role: 'human_resources' },
    { patterns: [/project\s*manager|program\s*manager|pmo|scrum\s*master/i], role: 'project_manager' },
    { patterns: [/ceo|cto|coo|cfo|cmo|vp|vice\s*president|director|head\s*of|chief/i], role: 'executive' },
    { patterns: [/consultant|advisor|analyst|strategy/i], role: 'consultant' }
];

interface IndustryKeywordSet {
    technicalSkills: string[];
    softSkills: string[];
    competencies: string[];
    tools: string[];
    certifications: string[];
}

const INDUSTRY_STANDARD_KEYWORDS: Record<IndustryRole, IndustryKeywordSet> = {
    software_engineer: {
        technicalSkills: ['javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'aws', 'docker', 'kubernetes', 'sql', 'nosql', 'mongodb', 'postgresql', 'git', 'ci/cd', 'rest api', 'graphql', 'microservices', 'agile', 'scrum', 'testing', 'debugging', 'optimization'],
        softSkills: ['problem-solving', 'collaboration', 'communication', 'attention to detail'],
        competencies: ['software development', 'code review', 'system design', 'architecture', 'performance optimization'],
        tools: ['github', 'jira', 'jenkins', 'vs code', 'postman', 'terraform', 'datadog'],
        certifications: ['aws certified', 'azure certified', 'google cloud', 'kubernetes certified']
    },
    product_manager: {
        technicalSkills: ['product strategy', 'roadmap', 'user research', 'a/b testing', 'analytics', 'market analysis', 'competitor analysis', 'pricing strategy', 'go-to-market'],
        softSkills: ['stakeholder management', 'cross-functional leadership', 'decision making', 'prioritization'],
        competencies: ['product lifecycle', 'feature planning', 'customer discovery', 'metrics-driven', 'okrs'],
        tools: ['jira', 'productboard', 'amplitude', 'mixpanel', 'figma', 'notion', 'confluence'],
        certifications: ['product management certified', 'agile certified', 'scrum master']
    },
    data_scientist: {
        technicalSkills: ['python', 'r', 'sql', 'machine learning', 'deep learning', 'statistics', 'data analysis', 'data visualization', 'nlp', 'computer vision', 'tensorflow', 'pytorch'],
        softSkills: ['analytical thinking', 'storytelling', 'critical thinking', 'curiosity'],
        competencies: ['data modeling', 'feature engineering', 'model deployment', 'a/b testing', 'hypothesis testing'],
        tools: ['jupyter', 'pandas', 'numpy', 'scikit-learn', 'tableau', 'power bi', 'spark', 'databricks'],
        certifications: ['google data analytics', 'aws machine learning', 'tensorflow certified']
    },
    designer: {
        technicalSkills: ['ui design', 'ux design', 'user research', 'prototyping', 'wireframing', 'visual design', 'interaction design', 'design systems', 'responsive design'],
        softSkills: ['creativity', 'empathy', 'collaboration', 'attention to detail', 'communication'],
        competencies: ['user-centered design', 'accessibility', 'design thinking', 'usability testing'],
        tools: ['figma', 'sketch', 'adobe xd', 'invision', 'principle', 'framer', 'photoshop', 'illustrator'],
        certifications: ['google ux design', 'interaction design foundation', 'nielsen norman']
    },
    marketing: {
        technicalSkills: ['digital marketing', 'seo', 'sem', 'content marketing', 'social media', 'email marketing', 'marketing automation', 'analytics', 'ppc', 'conversion optimization'],
        softSkills: ['creativity', 'communication', 'strategic thinking', 'adaptability'],
        competencies: ['campaign management', 'brand strategy', 'lead generation', 'customer acquisition'],
        tools: ['hubspot', 'mailchimp', 'google analytics', 'google ads', 'facebook ads', 'hootsuite', 'semrush'],
        certifications: ['google ads certified', 'hubspot certified', 'facebook blueprint']
    },
    sales: {
        technicalSkills: ['sales strategy', 'lead generation', 'pipeline management', 'negotiation', 'account management', 'cold calling', 'solution selling', 'consultative selling'],
        softSkills: ['persuasion', 'relationship building', 'resilience', 'active listening', 'communication'],
        competencies: ['quota attainment', 'revenue growth', 'customer retention', 'territory management'],
        tools: ['salesforce', 'hubspot', 'linkedin sales navigator', 'outreach', 'gong', 'zoominfo'],
        certifications: ['salesforce certified', 'sandler training', 'challenger sales']
    },
    finance: {
        technicalSkills: ['financial analysis', 'budgeting', 'forecasting', 'accounting', 'gaap', 'financial modeling', 'valuation', 'risk management', 'auditing'],
        softSkills: ['analytical thinking', 'attention to detail', 'integrity', 'communication'],
        competencies: ['financial reporting', 'cost analysis', 'investment analysis', 'compliance'],
        tools: ['excel', 'sap', 'oracle', 'quickbooks', 'bloomberg', 'tableau', 'power bi'],
        certifications: ['cpa', 'cfa', 'cma', 'acca', 'fmva']
    },
    operations: {
        technicalSkills: ['process improvement', 'supply chain', 'inventory management', 'logistics', 'quality control', 'lean', 'six sigma', 'operations management'],
        softSkills: ['problem-solving', 'organization', 'leadership', 'adaptability'],
        competencies: ['efficiency optimization', 'vendor management', 'capacity planning', 'kpi management'],
        tools: ['sap', 'oracle', 'microsoft project', 'asana', 'monday.com', 'smartsheet'],
        certifications: ['pmp', 'six sigma green belt', 'six sigma black belt', 'lean certified']
    },
    human_resources: {
        technicalSkills: ['recruiting', 'talent acquisition', 'employee relations', 'performance management', 'compensation', 'benefits administration', 'hris', 'onboarding', 'offboarding'],
        softSkills: ['empathy', 'communication', 'conflict resolution', 'confidentiality', 'discretion'],
        competencies: ['workforce planning', 'employee engagement', 'compliance', 'culture building'],
        tools: ['workday', 'bamboohr', 'greenhouse', 'lever', 'adp', 'linkedin recruiter'],
        certifications: ['phr', 'sphr', 'shrm-cp', 'shrm-scp']
    },
    project_manager: {
        technicalSkills: ['project planning', 'risk management', 'scope management', 'budget management', 'resource allocation', 'stakeholder management', 'agile', 'waterfall', 'kanban'],
        softSkills: ['leadership', 'communication', 'problem-solving', 'negotiation', 'time management'],
        competencies: ['project delivery', 'milestone tracking', 'team coordination', 'change management'],
        tools: ['jira', 'asana', 'microsoft project', 'trello', 'monday.com', 'confluence', 'smartsheet'],
        certifications: ['pmp', 'prince2', 'agile certified', 'scrum master', 'safe']
    },
    executive: {
        technicalSkills: ['strategic planning', 'business development', 'p&l management', 'board relations', 'investor relations', 'mergers and acquisitions', 'organizational design'],
        softSkills: ['vision', 'leadership', 'executive presence', 'decision making', 'influence'],
        competencies: ['corporate strategy', 'turnaround management', 'growth strategy', 'governance'],
        tools: ['bloomberg', 'salesforce', 'power bi', 'board reporting tools'],
        certifications: ['mba', 'executive education', 'board director certification']
    },
    consultant: {
        technicalSkills: ['strategy consulting', 'business analysis', 'process improvement', 'change management', 'client management', 'research', 'presentation', 'stakeholder engagement'],
        softSkills: ['analytical thinking', 'communication', 'adaptability', 'problem-solving', 'client focus'],
        competencies: ['project delivery', 'solution design', 'industry expertise', 'thought leadership'],
        tools: ['powerpoint', 'excel', 'tableau', 'alteryx', 'miro', 'lucidchart'],
        certifications: ['management consulting certified', 'cmb certified']
    },
    generic: {
        technicalSkills: ['microsoft office', 'excel', 'communication', 'project management', 'data analysis'],
        softSkills: ['teamwork', 'communication', 'problem-solving', 'time management', 'adaptability'],
        competencies: ['leadership', 'critical thinking', 'organization', 'attention to detail'],
        tools: ['microsoft office', 'google workspace', 'slack', 'zoom'],
        certifications: []
    }
};

export class CentralScoreManager {
    private static instance: CentralScoreManager;
    private registry: RuleRegistry;

    private constructor() {
        this.registry = globalRegistry;
    }

    public static getInstance(): CentralScoreManager {
        if (!CentralScoreManager.instance) {
            CentralScoreManager.instance = new CentralScoreManager();
        }
        return CentralScoreManager.instance;
    }

    public getScoreSync(
        cvData: UnifiedCVDataStructure,
        keywordAnalysis?: KeywordGapAnalysisResult | null,
        atsScoreCap: number = 100
    ): ScoreResult {
        // Calculate Core CV Score (Human/Master Factors)
        const cvScore = this.calculateCVScore(cvData);

        // Calculate ATS Score (Robot/Journey Factors)
        let atsScore: ATSScoreBreakdown | undefined;
        if (keywordAnalysis) {
            atsScore = this.calculateATSScore(cvData, keywordAnalysis, atsScoreCap);
        } else {
            atsScore = this.calculateATSScore(cvData, null, atsScoreCap);
        }

        const primaryScore = atsScore?.total ?? cvScore.total;
        const overallGrade = this.getGrade(primaryScore);
        const recommendations = this.generateRecommendations(cvScore, atsScore, cvData);

        // Generate Issues List (for Smart Context Card)
        const issues = this.generateIssues(cvScore, atsScore, recommendations);

        return {
            cvScore,
            atsScore,
            overallGrade,
            recommendations,
            issues
        };
    }



    /**
     * Main entry point to refresh scores.
     * Replaces old scoring logic with CentralScoreManager.
     */
    public async refreshScore(
        cvData: UnifiedCVDataStructure,
        cvType: 'master' | 'journey' | 'standalone',
        keywordAnalysis?: KeywordGapAnalysisResult | null, // Unified arg
        atsScoreCap: number = 100
    ): Promise<ScoreResult> {
        return Promise.resolve(this.getScoreSync(cvData, keywordAnalysis, atsScoreCap));
    }

    // --- Core Calculation Logic (Unified via CentralScoreManager) ---

    // 1. Human / Master CV Score
    public calculateCVScore(cvData: UnifiedCVDataStructure): CVScoreBreakdown {
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

    // 2. ATS / Journey Score
    public calculateATSScore(
        cvData: UnifiedCVDataStructure,
        keywordAnalysis: KeywordGapAnalysisResult | null,
        atsScoreCap: number = 100
    ): ATSScoreBreakdown {
        let keywordMatch: number;
        let actualContext: 'jd-specific' | 'industry-general';

        if (keywordAnalysis) {
            keywordMatch = this.calculateKeywordMatchScore(keywordAnalysis);
            actualContext = 'jd-specific';
        } else {
            const industryMatch = this.calculateIndustryKeywordMatch(cvData);
            keywordMatch = industryMatch.score;
            actualContext = 'industry-general';
        }

        const formatting = this.calculateATSFormattingScore(cvData);
        const sectionAlignment = this.calculateSectionAlignmentScore(cvData);
        const recency = this.calculateRecencyScore(cvData);
        const contactability = this.calculateContactabilityScore(cvData);

        const weightedScore = (keywordMatch * 0.4) + (formatting * 0.2) + (sectionAlignment * 0.15) + (recency * 0.15) + (contactability * 0.1);
        const rawTotal = Math.min(Math.round(weightedScore * 100 / 40), 100);

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
            // Backwards compat values
            experienceAlign: Math.round(sectionAlignment + recency),
            skillsCoverage: keywordMatch,
            parseability: formatting
        };
    }

    // --- Private Helper Methods ---

    private getWordCount(cvData: UnifiedCVDataStructure): number {
        return JSON.stringify(cvData).split(/\s+/).length;
    }

    private getAllText(cvData: UnifiedCVDataStructure): string {
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

    private getDateFormat(date: string): string {
        if (/^\d{4}-\d{2}$/.test(date)) return 'YYYY-MM';
        if (/^\d{4}$/.test(date)) return 'YYYY';
        if (/^[A-Za-z]+\s+\d{4}$/.test(date)) return 'Month YYYY';
        return 'other';
    }

    private calculateValidityMultiplier(cvData: UnifiedCVDataStructure): { multiplier: number; reasons: string[] } {
        const wordCount = this.getWordCount(cvData);
        const reasons: string[] = [];
        if (wordCount < 100) {
            reasons.push(`Low content density (${wordCount} words, minimum 100)`);
            return { multiplier: 0.2, reasons };
        }
        const cvText = JSON.stringify(cvData).toLowerCase();
        const placeholderPatterns = ['lorem ipsum', 'placeholder', '[your name]', 'example.com', 'xxx', 'n/a'];
        if (placeholderPatterns.some(p => cvText.includes(p))) {
            reasons.push('Placeholder content detected');
            return { multiplier: 0.2, reasons };
        }
        const hasSummary = cvData.basics?.summary && cvData.basics.summary.length > 20;
        const hasWork = cvData.work && cvData.work.length > 0;
        if (!hasSummary && !hasWork) {
            reasons.push('Missing summary and work experience');
            return { multiplier: 0.2, reasons };
        }
        return { multiplier: 1.0, reasons: [] };
    }

    private calculateCompletenessScore(cvData: UnifiedCVDataStructure): number {
        let score = 0;
        if (cvData.basics?.name) score += 2;
        if (cvData.basics?.email) score += 2;
        if (cvData.basics?.phone) score += 1;
        if (cvData.basics?.location) score += 1;
        if (cvData.basics?.summary && cvData.basics.summary.length > 100) score += 1;
        if (cvData.work && cvData.work.length > 0) {
            score += 3;
            if (cvData.work.some((w: any) => w.highlights?.length > 0)) score += 3;
            if (cvData.work.length >= 2) score += 2;
        }
        if (cvData.skills && cvData.skills.length > 0) {
            score += 2;
            if (cvData.skills.length >= 5) score += 2;
        }
        if (cvData.education && cvData.education.length > 0) score += 3;
        if (cvData.projects && cvData.projects.length > 0) score += 1.5;
        if (cvData.certificates && cvData.certificates.length > 0) score += 1.5;
        return Math.min(score, 25);
    }

    private calculateImpactVerbsScore(cvData: UnifiedCVDataStructure): number {
        let verbCount = 0;
        let totalBullets = 0;
        const checkBullets = (bullets: string[]) => {
            bullets.forEach((highlight: string) => {
                totalBullets++;
                const firstWord = highlight.toLowerCase().trim().split(/\s+/)[0];
                if (IMPACT_VERBS.includes(firstWord)) verbCount++;
            });
        };
        cvData.work?.forEach((job: any) => { if (job.highlights) checkBullets(job.highlights); });
        cvData.projects?.forEach((p: any) => { if (p.description) checkBullets([p.description]); });
        if (totalBullets === 0) return 10;
        return Math.round((verbCount / totalBullets) * 20);
    }

    private calculateQuantificationScore(cvData: UnifiedCVDataStructure): number {
        let quantCount = 0;
        let totalBullets = 0;
        const countQuantifiers = (text: string) => {
            let c = 0;
            QUANTIFIER_PATTERNS.forEach(p => { if (text.match(p)) c++; });
            return c;
        };
        cvData.work?.forEach((job: any) => {
            if (job.highlights) {
                job.highlights.forEach((h: string) => {
                    totalBullets++;
                    if (countQuantifiers(h) > 0) quantCount++;
                });
            }
        });
        if (cvData.basics?.summary && countQuantifiers(cvData.basics.summary) > 0) quantCount += 2;
        if (totalBullets === 0) return 10;
        return Math.round((quantCount / totalBullets) * 20);
    }

    private calculateFormattingScore(cvData: UnifiedCVDataStructure): number {
        let score = 15;
        const dateFormats = new Set<string>();
        cvData.work?.forEach((job: any) => { if (job.startDate) dateFormats.add(this.getDateFormat(job.startDate)); });
        if (dateFormats.size > 1) score -= 3;
        cvData.work?.forEach((job: any) => {
            job.highlights?.forEach((h: string) => { if (h.length > 200) score -= 1; });
        });
        if (cvData.basics?.summary) {
            if (cvData.basics.summary.length < 50) score -= 2;
            if (cvData.basics.summary.length > 500) score -= 2;
        }
        return Math.max(score, 0);
    }

    private calculateReadabilityScore(cvData: UnifiedCVDataStructure): number {
        let score = 20;
        const allText = this.getAllText(cvData);
        const passiveCount = (allText.match(/\b(was|were|been|being|is|are)\s+\w+ed\b/gi) || []).length;
        if (passiveCount > 5) score -= 3;
        const sentences = allText.split(/[.!?]+/);
        const longSentences = sentences.filter(s => s.split(/\s+/).length > 30).length;
        if (longSentences > 3) score -= 3;
        return Math.max(score, 0);
    }

    private calculateKeywordMatchScore(analysis: KeywordGapAnalysisResult): number {
        const { stats } = analysis;
        if (stats.totalJDKeywords === 0) return 20;
        return Math.round((stats.matchedCount / stats.totalJDKeywords) * 40);
    }

    private calculateParsabilityMultiplier(cvData: UnifiedCVDataStructure): number {
        const wordCount = this.getWordCount(cvData);
        if (wordCount < 50) return 0.1;
        if (!cvData.work || cvData.work.length === 0) return 0.1;
        const skillsCount = cvData.skills?.length || 0;
        const workCount = cvData.work?.length || 0;
        if (skillsCount > 20 && workCount < 2) return 0.2;
        return 1.0;
    }

    private calculateSectionAlignmentScore(cvData: UnifiedCVDataStructure): number {
        let score = 0;
        if (cvData.basics?.name) score += 3;
        if (cvData.education?.length) score += 4;
        if (cvData.work?.length) score += 5;
        if (cvData.skills?.length) score += 3;
        return Math.min(score, 15);
    }

    private calculateRecencyScore(cvData: UnifiedCVDataStructure): number {
        if (!cvData.work?.length) return 5;
        const now = new Date();
        const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
        const recentJobs = cvData.work.filter((job: any) => {
            if (!job.startDate) return false;
            const startDate = new Date(job.startDate);
            return startDate >= threeYearsAgo || !job.endDate || job.endDate.toLowerCase() === 'present';
        });
        if (recentJobs.length === 0) return 5;
        if (recentJobs.length === 1) return 10;
        return 15;
    }

    private calculateContactabilityScore(cvData: UnifiedCVDataStructure): number {
        let score = 0;
        if (cvData.basics?.email) score += 4;
        if (cvData.basics?.phone) score += 3;
        if (cvData.basics?.url || cvData.basics?.profiles?.some((p: any) => p.network?.toLowerCase() === 'linkedin')) score += 3;
        return Math.min(score, 10);
    }

    private calculateATSFormattingScore(cvData: UnifiedCVDataStructure): number {
        let score = 20;
        cvData.work?.forEach((job: any) => {
            job.highlights?.forEach((h: string) => { if (h.length > 200) score -= 2; });
        });
        return Math.max(score, 0);
    }

    // Role Detection Logic
    public detectRoleFromCV(cvData: UnifiedCVDataStructure): { role: IndustryRole; detectedTitle: string | null } {
        let detectedTitle: string | null = null;
        if (cvData.work && cvData.work.length > 0) {
            const sortedWork = [...cvData.work].sort((a: any, b: any) => {
                const aEnd = b.endDate?.toLowerCase() === 'present' ? '9999-12' : a.endDate || '0000-00';
                const bEnd = b.endDate?.toLowerCase() === 'present' ? '9999-12' : b.endDate || '0000-00';
                return bEnd.localeCompare(aEnd);
            });
            detectedTitle = sortedWork[0]?.position || null;
        }
        if (!detectedTitle && cvData.basics?.label) detectedTitle = cvData.basics.label;
        if (!detectedTitle) return { role: 'generic', detectedTitle: null };

        for (const { patterns, role } of ROLE_DETECTION_PATTERNS) {
            for (const pattern of patterns) {
                if (pattern.test(detectedTitle)) return { role, detectedTitle };
            }
        }
        return { role: 'generic', detectedTitle };
    }

    public calculateIndustryKeywordMatch(cvData: UnifiedCVDataStructure): { score: number; matchedKeywords: string[]; totalKeywords: number; detectedRole: IndustryRole } {
        const { role } = this.detectRoleFromCV(cvData);
        const industryKeywords = INDUSTRY_STANDARD_KEYWORDS[role];
        const allKeywords = [
            ...industryKeywords.technicalSkills,
            ...industryKeywords.softSkills,
            ...industryKeywords.competencies,
            ...industryKeywords.tools,
            ...industryKeywords.certifications
        ];
        const cvText = this.getAllText(cvData).toLowerCase();
        const matchedKeywords = allKeywords.filter(k => {
            const pattern = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            return pattern.test(cvText);
        });
        const matchRatio = allKeywords.length > 0 ? matchedKeywords.length / allKeywords.length : 0;
        return {
            score: Math.min(Math.round(matchRatio * 40), 40),
            matchedKeywords,
            totalKeywords: allKeywords.length,
            detectedRole: role
        };
    }

    private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    private generateRecommendations(cvScore: CVScoreBreakdown, atsScore: ATSScoreBreakdown | undefined, cvData: UnifiedCVDataStructure): string[] {
        const recs: string[] = [];
        if (cvScore.completeness < 15) recs.push('Add more sections: skills, projects, certificates');
        if (cvScore.impactVerbs < 12) recs.push('Start bullet points with strong action verbs (Led, Developed)');
        if (cvScore.quantification < 12) recs.push('Add metrics to demonstrate impact (%, $, counts)');

        if (atsScore) {
            if (atsScore.keywordMatch < 25) recs.push('Add missing keywords from the job description');
            if (atsScore.parsabilityMultiplier < 1.0) recs.push('CV lacks content for parsing - add more experience');
        }
        return recs.slice(0, 5);
    }

    // Convert scores/recommendations into Issue objects for Smart Context
    private generateIssues(cvScore: CVScoreBreakdown, atsScore: ATSScoreBreakdown | undefined, recommendations: string[]): Issue[] {
        const issues: Issue[] = [];

        recommendations.forEach((rec, idx) => {
            issues.push({
                id: `rec-${idx}`,
                type: 'IMPROVEMENT',
                severity: 'warning',
                priority: 'suggestion',
                tier: 2,
                section: 'basics',
                message: rec,
                deepLink: { section: 'summary' }
            });
        });

        if (cvScore.validityMultiplier < 1.0) {
            cvScore.penaltyReasons.forEach((r, i) => {
                issues.push({
                    id: `penalty-${i}`,
                    type: 'CRITICAL',
                    severity: 'critical',
                    priority: 'critical',
                    tier: 1,
                    section: 'basics',
                    message: r,
                    deepLink: { section: 'basics' }
                });
            });
        }

        return issues;
    }
}


/**
 * CV Score Simulator
 * 
 * Offline client-side scoring for instant feedback as users edit their CV.
 * This module mirrors the formulas from CentralScoreManager for offline use.
 * For server-side or full-featured scoring, use CentralScoreManager directly.
 * 
 * CV Score Formula (CentralScoreManager): (C + I + Q + F + R) × V
 * ATS Score Formula (CentralScoreManager): [(K × 0.4) + (F × 0.2) + (S × 0.15) + (R × 0.15) + (C × 0.1)] × P
 * 
 * @see CentralScoreManager for the authoritative scoring implementation
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

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

export interface CVScoreSimulatorResult {
    total: number;
    rawTotal: number;
    breakdown: {
        C: number;  // Completeness (0-25)
        I: number;  // Impact verbs (0-20)
        Q: number;  // Quantification (0-20)
        F: number;  // Formatting (0-15)
        R: number;  // Readability (0-20)
    };
    multiplier: number;        // V factor
    penaltyReasons: string[];  // Why points were deducted
}

export interface ATSScoreSimulatorResult {
    total: number;
    rawTotal: number;
    breakdown: {
        K: number;  // Keyword match (0-40)
        F: number;  // Formatting (0-20)
        S: number;  // Section alignment (0-15)
        R: number;  // Recency (0-15)
        C: number;  // Contactability (0-10)
    };
    matchedKeywords: string[];
    multiplier: number;        // P factor
    context: 'jd-specific' | 'industry-general';
}

export const CV_Simulator = {
    /**
     * Get word count from CV data
     */
    getWordCount(json: UnifiedCVDataStructure): number {
        return JSON.stringify(json).split(/\s+/).length;
    },

    /**
     * Calculate Validity Multiplier (V)
     * V = 0.2 if word count < 100 or placeholder-only, else 1.0
     */
    calculateValidityMultiplier(json: UnifiedCVDataStructure): { multiplier: number; reasons: string[] } {
        const wordCount = this.getWordCount(json);
        const reasons: string[] = [];

        if (wordCount < 100) {
            reasons.push(`Low content density (${wordCount} words, minimum 100)`);
            return { multiplier: 0.2, reasons };
        }

        // Check for placeholder content
        const cvText = JSON.stringify(json).toLowerCase();
        const placeholderPatterns = ['lorem ipsum', 'placeholder', '[your name]', 'example.com'];
        if (placeholderPatterns.some(p => cvText.includes(p))) {
            reasons.push('Placeholder content detected');
            return { multiplier: 0.2, reasons };
        }

        // Check for missing critical sections
        const hasSummary = json.basics?.summary && json.basics.summary.length > 20;
        const hasWork = json.work && json.work.length > 0;

        if (!hasSummary && !hasWork) {
            reasons.push('Missing summary and work experience');
            return { multiplier: 0.2, reasons };
        }

        return { multiplier: 1.0, reasons: [] };
    },

    /**
     * Calculate Parsability Multiplier (P)
     * P = 0.1 if unreadable/<50 words or no work experience, else 1.0
     */
    calculateParsabilityMultiplier(json: UnifiedCVDataStructure): number {
        const wordCount = this.getWordCount(json);

        if (wordCount < 50) return 0.1;
        if (!json.work || json.work.length === 0) return 0.1;

        // Keyword stuffer penalty
        const skillsCount = json.skills?.length || 0;
        const workCount = json.work?.length || 0;
        if (skillsCount > 20 && workCount < 2) return 0.2;

        return 1.0;
    },

    /**
     * Calculate CV Score offline (instant feedback)
     * Formula: (C + I + Q + F + R) × V
     */
    calculateCVScore(json: UnifiedCVDataStructure): CVScoreSimulatorResult {
        const penaltyReasons: string[] = [];

        // 1. Completeness (C - max 25 pts)
        let C = 0;
        if (json.basics?.summary && json.basics.summary.length > 50) C += 5;
        if (json.work && json.work.length > 0) {
            C += Math.min(json.work.length * 5, 10);
        }
        if (json.skills && json.skills.length > 5) C += 5; else if (json.skills?.length) C += 3;
        if (json.education && json.education.length > 0) C += 3;
        if (json.projects && json.projects.length > 0) C += 2;
        C = Math.min(C, 25);

        // 2. Impact Verbs (I - max 20 pts)
        let impactCount = 0;
        let totalBullets = 0;

        if (json.work) {
            json.work.forEach((job: any) => {
                if (job.highlights && Array.isArray(job.highlights)) {
                    job.highlights.forEach((h: string) => {
                        totalBullets++;
                        const firstWord = h.toLowerCase().trim().split(/\s+/)[0];
                        if (IMPACT_VERBS.includes(firstWord)) impactCount++;
                    });
                }
            });
        }

        const I = totalBullets > 0 ? Math.round((impactCount / totalBullets) * 20) : 10;
        if (I < 10) penaltyReasons.push('Missing impact verbs at bullet starts');

        // 3. Quantification (Q - max 20 pts)
        let quantCount = 0;
        const quantPatterns = [/\d+%/, /\$[\d,]+/, /\d+[xX]/, /\d+\s*(million|billion|k|K)/i, /\d+\s*(users|customers|projects)/i];

        if (json.work) {
            json.work.forEach((job: any) => {
                if (job.highlights) {
                    job.highlights.forEach((h: string) => {
                        if (quantPatterns.some(p => p.test(h))) quantCount++;
                    });
                }
            });
        }

        const Q = totalBullets > 0 ? Math.min(Math.round((quantCount / totalBullets) * 20), 20) : 10;
        if (Q === 0) penaltyReasons.push('No metrics or numbers found in experience');

        // 4. Formatting (F - max 15 pts, static offline)
        let F = 15;
        // Deduct for overly long bullets
        if (json.work) {
            json.work.forEach((job: any) => {
                if (job.highlights) {
                    job.highlights.forEach((h: string) => {
                        if (h.length > 200) F -= 2;
                    });
                }
            });
        }
        F = Math.max(F, 0);
        if (F < 15) penaltyReasons.push('Some bullet points are too long (>200 chars)');

        // 5. Readability (R - max 20 pts)
        const wordCount = this.getWordCount(json);
        let R = 15;
        if (wordCount > 200 && wordCount < 600) R = 20;
        else if (wordCount < 100) R = 10;
        else if (wordCount > 800) R = 12;

        // Calculate raw and apply multiplier
        const rawTotal = Math.min(C + I + Q + F + R, 100);
        const { multiplier, reasons } = this.calculateValidityMultiplier(json);
        const total = Math.round(rawTotal * multiplier);

        return {
            total,
            rawTotal,
            breakdown: { C, I, Q, F, R },
            multiplier,
            penaltyReasons: [...penaltyReasons, ...reasons]
        };
    },

    /**
     * Calculate ATS Score offline (instant feedback)
     * Formula: [(K × 0.4) + (F × 0.2) + (S × 0.15) + (R × 0.15) + (C × 0.1)] × P
     */
    calculateATSScore(json: UnifiedCVDataStructure, jdKeywords: string[] = []): ATSScoreSimulatorResult {
        const resumeText = JSON.stringify(json).toLowerCase();

        // 1. Keyword Match (K - max 40 pts)
        const matchedKeywords: string[] = [];
        if (jdKeywords.length > 0) {
            jdKeywords.forEach(kw => {
                if (resumeText.includes(kw.toLowerCase())) {
                    matchedKeywords.push(kw);
                }
            });
        }
        const K = jdKeywords.length > 0
            ? Math.round((matchedKeywords.length / jdKeywords.length) * 40)
            : 20; // Default for no JD

        // 2. Formatting (F - max 20 pts)
        let F = 20;
        if (json.work) {
            json.work.forEach((job: any) => {
                if (job.highlights) {
                    job.highlights.forEach((h: string) => {
                        if (h.length > 200) F -= 2;
                    });
                }
            });
        }
        F = Math.max(F, 0);

        // 3. Section Alignment (S - max 15 pts)
        let S = 0;
        if (json.basics?.name) S += 3;
        if (json.education && json.education.length > 0) S += 4;
        if (json.work && json.work.length > 0) S += 5;
        if (json.skills && json.skills.length > 0) S += 3;
        S = Math.min(S, 15);

        // 4. Recency (R - max 15 pts)
        let R = 5;
        if (json.work && json.work.length > 0) {
            const now = new Date();
            const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);
            const recentJobs = json.work.filter((job: any) => {
                if (!job.startDate) return false;
                const startDate = new Date(job.startDate);
                return startDate >= threeYearsAgo || job.endDate === '' || job.endDate === 'Present';
            });
            if (recentJobs.length >= 2) R = 15;
            else if (recentJobs.length === 1) R = 10;
        }

        // 5. Contactability (C - max 10 pts)
        let C = 0;
        if (json.basics?.email) C += 4;
        if (json.basics?.phone) C += 3;
        if (json.basics?.url || json.basics?.profiles?.some((p: any) => p.network?.toLowerCase() === 'linkedin')) C += 3;
        C = Math.min(C, 10);

        // Apply weighted formula
        const weightedScore = (K * 0.4) + (F * 0.2) + (S * 0.15) + (R * 0.15) + (C * 0.1);
        const rawTotal = Math.min(Math.round(weightedScore * 100 / 40), 100);

        // Apply Parsability Multiplier
        const multiplier = this.calculateParsabilityMultiplier(json);
        const total = Math.round(rawTotal * multiplier);

        return {
            total,
            rawTotal,
            breakdown: { K, F, S, R, C },
            matchedKeywords,
            multiplier,
            context: jdKeywords.length > 0 ? 'jd-specific' : 'industry-general'
        };
    },

    /**
     * Extract keywords from JD text for ATS matching
     */
    extractKeywordsFromJD(jdText: string): string[] {
        if (!jdText) return [];

        // Common stop words to filter out
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'that',
            'this', 'these', 'those', 'we', 'you', 'they', 'our', 'your', 'their'
        ]);

        // Extract words, filter stop words, keep unique
        const words = jdText.toLowerCase()
            .replace(/[^\w\s+#.-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        // Keep unique keywords
        return Array.from(new Set(words));
    }
};

export default CV_Simulator;

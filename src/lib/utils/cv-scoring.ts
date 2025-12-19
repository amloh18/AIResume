import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export interface CVScoreBreakdown {
    overall: number;
    roleAlignment: number;
    quantifiableMetrics: number;
    seniorityIndicators: number;
    keywordMatch: number;
    details: {
        totalKeywordsFound: number;
        totalKeywordsExpected: number;
        metricsCount: number;
        seniorityKeywordsFound: string[];
    };
}

/**
 * Calculate CV score based on role and seniority alignment
 */
export function calculateCVScore(
    cvData: UnifiedCVDataStructure,
    targetRole: string,
    seniorityLevel: string
): CVScoreBreakdown {
    let roleAlignment = 0;
    let quantifiableMetrics = 0;
    let seniorityIndicators = 0;
    let keywordMatch = 0;

    // Convert CV to text for keyword analysis
    const cvText = JSON.stringify(cvData).toLowerCase();
    const roleKeywords = extractRoleKeywords(targetRole).map(k => k.toLowerCase());
    const seniorityKeywords = extractSeniorityKeywords(seniorityLevel).map(k => k.toLowerCase());

    // 1. Role Alignment (0-30 points)
    const keywordsFound = roleKeywords.filter(keyword => cvText.includes(keyword));
    roleAlignment = Math.min(30, (keywordsFound.length / roleKeywords.length) * 30);

    // 2. Quantifiable Metrics (0-25 points)
    const metricsCount = countQuantifiableMetrics(cvData);
    quantifiableMetrics = Math.min(25, metricsCount * 2);

    // 3. Seniority Indicators (0-25 points)
    const seniorityFound = seniorityKeywords.filter(keyword => cvText.includes(keyword));
    seniorityIndicators = Math.min(25, (seniorityFound.length / seniorityKeywords.length) * 25);

    // 4. Keyword Match Quality (0-20 points)
    keywordMatch = Math.min(20, (keywordsFound.length / Math.max(roleKeywords.length, 1)) * 20);

    const overall = Math.round(roleAlignment + quantifiableMetrics + seniorityIndicators + keywordMatch);

    return {
        overall: Math.min(100, overall),
        roleAlignment: Math.round(roleAlignment),
        quantifiableMetrics: Math.round(quantifiableMetrics),
        seniorityIndicators: Math.round(seniorityIndicators),
        keywordMatch: Math.round(keywordMatch),
        details: {
            totalKeywordsFound: keywordsFound.length,
            totalKeywordsExpected: roleKeywords.length,
            metricsCount,
            seniorityKeywordsFound: seniorityFound
        }
    };
}

/**
 * Extract role-specific keywords
 */
function extractRoleKeywords(role: string): string[] {
    const roleKeywordsMap: Record<string, string[]> = {
        'Data Analyst': ['data', 'analysis', 'SQL', 'Excel', 'visualization', 'reporting', 'metrics', 'insights', 'dashboard'],
        'Data Scientist': ['machine learning', 'Python', 'R', 'statistics', 'modeling', 'algorithm', 'ML', 'data science'],
        'Software Engineer': ['programming', 'code', 'software', 'development', 'API', 'testing', 'debugging', 'Git'],
        'Product Manager': ['product', 'roadmap', 'stakeholder', 'user stories', 'agile', 'features', 'launch', 'metrics'],
        'Marketing Manager': ['marketing', 'campaign', 'brand', 'SEO', 'content', 'social media', 'analytics', 'ROI'],
        // Add more mappings as needed
    };

    // Check for exact match
    if (roleKeywordsMap[role]) {
        return roleKeywordsMap[role];
    }

    // Generic keywords based on role category
    const roleLower = role.toLowerCase();
    if (roleLower.includes('engineer') || roleLower.includes('developer')) {
        return ['programming', 'code', 'development', 'technical', 'software', 'system', 'architecture'];
    }
    if (roleLower.includes('analyst') || roleLower.includes('data')) {
        return ['data', 'analysis', 'reporting', 'metrics', 'insights', 'Excel', 'SQL'];
    }
    if (roleLower.includes('manager')) {
        return ['management', 'team', 'leadership', 'strategy', 'planning', 'budget', 'stakeholder'];
    }

    // Default keywords
    return ['experience', 'skills', 'project', 'team', 'results', 'achievement'];
}

/**
 * Extract seniority-specific keywords
 */
function extractSeniorityKeywords(seniority: string): string[] {
    const seniorityKeywordsMap: Record<string, string[]> = {
        'Beginner': ['assisted', 'supported', 'learned', 'contributed', 'participated', 'trained'],
        'Experienced': ['implemented', 'executed', 'delivered', 'collaborated', 'developed', 'created'],
        'Professional': ['led', 'designed', 'architected', 'optimized', 'mentored', 'improved'],
        'Senior': ['strategic', 'transformed', 'scaled', 'managed', 'influenced', 'directed'],
        'Executive': ['vision', 'drove', 'ROI', 'P&L', 'executive', 'board', 'C-level', 'organization']
    };

    return seniorityKeywordsMap[seniority] || [];
}

/**
 * Count quantifiable metrics in CV
 */
function countQuantifiableMetrics(cvData: UnifiedCVDataStructure): number {
    let count = 0;
    const text = JSON.stringify(cvData);

    // Regex patterns for metrics
    const patterns = [
        /\d+%/g,  // Percentages
        /\$\d+[KMB]?/gi,  // Money
        /\d+x/gi,  // Multipliers
        /\d+\+/g,  // Plus numbers
        /\d{1,3}(,\d{3})*/g  // Large numbers with commas
    ];

    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            count += matches.length;
        }
    });

    return count;
}

/**
 * Get score color and label
 */
export function getScoreColor(score: number): { color: string; label: string; bgColor: string } {
    if (score >= 80) {
        return { color: '#10b981', label: 'Excellent', bgColor: 'bg-green-500' };
    } else if (score >= 60) {
        return { color: '#f59e0b', label: 'Good', bgColor: 'bg-yellow-500' };
    } else if (score >= 40) {
        return { color: '#f97316', label: 'Needs Work', bgColor: 'bg-orange-500' };
    } else {
        return { color: '#ef4444', label: 'Critical', bgColor: 'bg-red-500' };
    }
}

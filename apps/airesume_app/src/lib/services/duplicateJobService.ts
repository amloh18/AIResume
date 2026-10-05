/**
 * Duplicate Job Detection Service
 * Detects potential duplicate jobs when adding new jobs to the tracker
 */

interface JobData {
    jobTitle: string;
    company: string;
    location?: string;
    jobUrl?: string;
}

interface MatchedJob {
    id: string;
    jobTitle: string;
    company: string;
    location?: string;
    similarity: number;
    createdAt: string;
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    matchedJobs: MatchedJob[];
    confidence: 'high' | 'medium' | 'low';
}

export class DuplicateJobService {
    /**
     * Check if a job is a potential duplicate of existing jobs
     */
    static async checkDuplicate(
        jobData: JobData,
        existingJobs: Array<any>,
        options?: {
            checkLocation?: boolean;
            daysThreshold?: number;
            similarityThreshold?: number;
        }
    ): Promise<DuplicateCheckResult> {
        const {
            checkLocation = false,
            daysThreshold = 30,
            similarityThreshold = 0.7
        } = options || {};

        const matchedJobs: MatchedJob[] = [];

        // Normalize the input job data
        const normalizedCompany = this.normalizeCompanyName(jobData.company);
        const normalizedTitle = this.normalizeJobTitle(jobData.jobTitle);
        const normalizedLocation = jobData.location?.toLowerCase().trim();

        // Get the date threshold
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

        // Check each existing job
        for (const existingJob of existingJobs) {
            // Skip if job is too old
            const jobDate = new Date(existingJob.createdAt);
            if (jobDate < thresholdDate) continue;

            // Normalize existing job data
            const existingNormalizedCompany = this.normalizeCompanyName(existingJob.company);
            const existingNormalizedTitle = this.normalizeJobTitle(existingJob.jobTitle || existingJob.title);
            const existingNormalizedLocation = existingJob.location?.toLowerCase().trim();

            // Check if company matches (must be exact match after normalization)
            if (normalizedCompany !== existingNormalizedCompany) continue;

            // Calculate title similarity
            const titleSimilarity = this.calculateSimilarity(normalizedTitle, existingNormalizedTitle);

            // If checking location, require location match or both undefined
            if (checkLocation && normalizedLocation && existingNormalizedLocation) {
                if (normalizedLocation !== existingNormalizedLocation) {
                    // Different locations - not a duplicate even if title matches
                    continue;
                }
            }

            // If similarity is above threshold, it's a potential duplicate
            if (titleSimilarity >= similarityThreshold) {
                matchedJobs.push({
                    id: existingJob.id || existingJob._id,
                    jobTitle: existingJob.jobTitle || existingJob.title,
                    company: existingJob.company,
                    location: existingJob.location,
                    similarity: titleSimilarity,
                    createdAt: existingJob.createdAt
                });
            }
        }

        // Sort by similarity (highest first)
        matchedJobs.sort((a, b) => b.similarity - a.similarity);

        // Determine confidence level
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (matchedJobs.length > 0) {
            const highestSimilarity = matchedJobs[0].similarity;
            if (highestSimilarity >= 0.95) {
                confidence = 'high';
            } else if (highestSimilarity >= 0.85) {
                confidence = 'medium';
            } else {
                confidence = 'low';
            }
        }

        return {
            isDuplicate: matchedJobs.length > 0 && confidence !== 'low',
            matchedJobs,
            confidence
        };
    }

    /**
     * Normalize company name for comparison
     * Removes common suffixes and standardizes format
     */
    static normalizeCompanyName(company: string): string {
        if (!company) return '';

        return company
            .toLowerCase()
            .trim()
            // Remove common company suffixes
            .replace(/\s+(inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?|gmbh|sa|ag|plc|limited|pvt\.?)$/i, '')
            // Remove special characters
            .replace(/[^\w\s]/g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Normalize job title for comparison
     */
    static normalizeJobTitle(title: string): string {
        if (!title) return '';

        return title
            .toLowerCase()
            .trim()
            // Standardize common variations
            .replace(/\bsr\.?\b/g, 'senior')
            .replace(/\bjr\.?\b/g, 'junior')
            .replace(/\bfrontend\b/g, 'front end')
            .replace(/\bbackend\b/g, 'back end')
            .replace(/\bfullstack\b/g, 'full stack')
            .replace(/\bdev\b/g, 'developer')
            .replace(/\beng\b/g, 'engineer')
            .replace(/\bmgr\b/g, 'manager')
            // Remove special characters but keep spaces
            .replace(/[^\w\s]/g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     * Returns a value between 0 (completely different) and 1 (identical)
     */
    static calculateSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;

        // Use Levenshtein distance
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);

        // Convert distance to similarity score (0-1)
        return 1 - (distance / maxLength);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * Returns the minimum number of edits needed to transform one string into another
     */
    private static levenshteinDistance(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;

        // Create a 2D array for dynamic programming
        const matrix: number[][] = Array(len1 + 1)
            .fill(null)
            .map(() => Array(len2 + 1).fill(0));

        // Initialize first row and column
        for (let i = 0; i <= len1; i++) {
            matrix[i][0] = i;
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return matrix[len1][len2];
    }
}

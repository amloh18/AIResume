/**
 * Company Name Normalization Utility
 * 
 * Normalizes company names for consistent matching across different formats.
 * Handles common variations like Ltd, Limited, LLC, Inc, etc.
 */

/**
 * Normalizes a company name for matching purposes
 * @param name - The company name to normalize
 * @returns Normalized company name
 */
export function normalizeCompanyName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .replace(/[.,]/g, '') // Remove punctuation
    .replace(/\b(ltd|limited|llc|inc|incorporated|corp|corporation|plc|gmbh|s\.a\.|s\.a|sa|co|company)\b/gi, '') // Remove common suffixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Distance between strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculates similarity score between two strings (0-1)
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Matches a company name against a registry entry
 * @param companyName - The company name to match
 * @param registryEntry - The registry entry to match against
 * @param threshold - Similarity threshold (default: 0.85)
 * @returns True if match found, false otherwise
 */
export function matchCompany(
  companyName: string,
  registryEntry: string,
  threshold: number = 0.85
): boolean {
  const normalized = normalizeCompanyName(companyName);
  const normalizedRegistry = normalizeCompanyName(registryEntry);

  // Exact match
  if (normalized === normalizedRegistry) {
    return true;
  }

  // Partial match (one contains the other)
  if (normalized.includes(normalizedRegistry) || normalizedRegistry.includes(normalized)) {
    return true;
  }

  // Fuzzy match using Levenshtein distance
  const similarity = calculateSimilarity(normalized, normalizedRegistry);
  return similarity >= threshold;
}



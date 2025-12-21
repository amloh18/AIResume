/**
 * Validation Helpers
 * Utility functions for validation logic
 */

import { escapeRegExp } from './text-normalizer';

/**
 * Calculate Levenshtein distance between two strings
 * Used for typo detection
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
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
 * Basic word stemming
 * Converts words to their root form (running -> run, architected -> architecture)
 */
export function stemWord(word: string): string {
  const lower = word.toLowerCase();
  
  // Remove common suffixes
  const suffixes = [
    { suffix: 'ing', minLength: 5 },
    { suffix: 'ed', minLength: 4 },
    { suffix: 'er', minLength: 4 },
    { suffix: 'est', minLength: 5 },
    { suffix: 'ly', minLength: 4 },
    { suffix: 'tion', minLength: 6 },
    { suffix: 'sion', minLength: 6 },
    { suffix: 's', minLength: 3 },
    { suffix: 'es', minLength: 4 }
  ];
  
  for (const { suffix, minLength } of suffixes) {
    if (lower.endsWith(suffix) && lower.length > minLength) {
      return lower.slice(0, -suffix.length);
    }
  }
  
  // Special cases
  if (lower.endsWith('architected')) {
    return 'architecture';
  }
  if (lower.endsWith('managed')) {
    return 'management';
  }
  if (lower.endsWith('analyzed')) {
    return 'analysis';
  }
  
  return lower;
}

/**
 * Check if a word appears with word boundaries
 * Prevents partial matches (e.g., "Ass" in "Assistant")
 */
export function checkWordBoundary(text: string, word: string, position: number): boolean {
  if (position < 0 || position >= text.length) return false;
  
  const before = position > 0 ? text[position - 1] : ' ';
  const after = position + word.length < text.length ? text[position + word.length] : ' ';
  
  // Check that before and after are not word characters
  return !/\w/.test(before) && !/\w/.test(after);
}

/**
 * Check if text contains word with proper boundaries
 * Uses regex word boundaries to prevent partial matches
 */
export function containsWord(text: string, word: string, caseSensitive: boolean = false): boolean {
  if (!text || !word) return false;
  
  const escaped = escapeRegExp(word);
  const flags = caseSensitive ? '' : 'i';
  const regex = new RegExp(`\\b${escaped}\\b`, flags);
  
  return regex.test(text);
}

/**
 * Find all occurrences of a word in text with boundaries
 * Returns array of match positions
 */
export function findAllWordMatches(text: string, word: string, caseSensitive: boolean = false): number[] {
  if (!text || !word) return [];
  
  const escaped = escapeRegExp(word);
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`\\b${escaped}\\b`, flags);
  
  const matches: number[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match.index);
  }
  
  return matches;
}

/**
 * Check for circular references in synonym maps
 * Prevents infinite loops (A=B, B=A)
 */
export function checkCircularReference(
  synonymMap: Record<string, string[]>,
  term: string,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(term)) {
    return true; // Circular reference detected
  }
  
  visited.add(term);
  const synonyms = synonymMap[term] || [];
  
  for (const synonym of synonyms) {
    if (checkCircularReference(synonymMap, synonym, visited)) {
      return true;
    }
  }
  
  visited.delete(term);
  return false;
}

/**
 * Generate instance ID for tracking specific occurrences
 * Handles multiple identical errors (e.g., 3 "lead")
 */
export function generateInstanceId(fix: {
  fieldPath: string;
  originalText: string;
  matchStart?: number | null;
}): string {
  const parts = [
    fix.fieldPath,
    fix.originalText.substring(0, 50), // First 50 chars
    fix.matchStart?.toString() || '0'
  ];
  
  return parts.join('|');
}

/**
 * Cap score at 100
 * Prevents score from going >100 due to bonus points
 */
export function capScore(score: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, score));
}


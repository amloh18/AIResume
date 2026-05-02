// @ts-nocheck
/**
 * Format Hints System
 *
 * Snippets store WHAT to emphasize. Templates decide HOW to render it.
 * This module parses content to detect emphasis-worthy elements
 * and applies visual treatment based on style presets.
 */

import type { FormatHints } from '@/types/snippet-v2';

// Common metric patterns
const METRIC_PATTERNS = [
  /\d+%/g,                         // Percentages
  /\$[\d,]+(?:\.\d{2})?/g,        // Dollar amounts
  /\d+[kKmMbB]\+?/g,              // Scale (10K, 2M)
  /\d+\s*(?:x|times)/gi,          // Multipliers
  /\d+\+?\s*(?:years?|yrs?)/gi,   // Duration
  /\d+(?:st|nd|rd|th)\b/g,        // Rankings
];

// Strong action verbs (subset)
const STRONG_VERBS = new Set([
  'achieved', 'built', 'created', 'delivered', 'developed', 'drove',
  'established', 'generated', 'grew', 'implemented', 'improved',
  'increased', 'launched', 'led', 'managed', 'optimized', 'reduced',
  'resolved', 'spearheaded', 'streamlined',
]);

/**
 * Parse text to detect format hints automatically.
 */
export function parseFormatHints(text: string): FormatHints {
  const hints: FormatHints = {};

  // Detect metrics
  const metrics: string[] = [];
  for (const pattern of METRIC_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) metrics.push(...matches);
  }
  if (metrics.length > 0) hints.metrics = metrics;

  // Detect emphasis-worthy words (strong verbs at start)
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  if (firstWord && STRONG_VERBS.has(firstWord)) {
    hints.emphasize = [firstWord];
  }

  return hints;
}

/**
 * Merge auto-detected hints with existing hints.
 */
export function mergeFormatHints(
  existing: FormatHints,
  autoDetected: FormatHints
): FormatHints {
  return {
    emphasize: [...new Set([...(existing.emphasize || []), ...(autoDetected.emphasize || [])])],
    metrics: [...new Set([...(existing.metrics || []), ...(autoDetected.metrics || [])])],
    keywords: existing.keywords || [],
    hierarchy: existing.hierarchy || autoDetected.hierarchy,
  };
}

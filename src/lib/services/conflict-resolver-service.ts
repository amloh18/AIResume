/**
 * Conflict Resolver Service
 * Handles conflicting rules:
 * - Priority weighting: Keywords > Length warnings
 * - Conflict detection: When fix A triggers error B
 * - Resolution: Allow manual override, suggest alternative fix
 */

import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

export interface Conflict {
  fixA: FixAnnotation;
  fixB: FixAnnotation;
  conflictType: 'keyword_vs_length' | 'keyword_vs_grammar' | 'length_vs_clarity' | 'other';
  severity: 'low' | 'medium' | 'high';
  resolution?: 'apply_a' | 'apply_b' | 'manual_override' | 'suggest_alternative';
}

/**
 * Priority weights for different fix categories
 * Higher number = higher priority
 */
const CATEGORY_PRIORITIES: Record<string, number> = {
  keywords: 10,      // Highest priority
  impact: 8,
  structure: 7,
  clarity: 6,
  formatting: 5,
  grammar: 4,
  other: 1
};

/**
 * Detect conflicts between fixes
 */
export function detectConflicts(fixes: FixAnnotation[]): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Check all pairs of fixes
  for (let i = 0; i < fixes.length; i++) {
    for (let j = i + 1; j < fixes.length; j++) {
      const fixA = fixes[i];
      const fixB = fixes[j];
      
      // Skip if both are already applied/dismissed
      if (fixA.status !== 'open' || fixB.status !== 'open') continue;
      
      // Check if they affect the same field
      if (fixA.fieldPath !== fixB.fieldPath) continue;
      
      // Detect conflict type
      const conflictType = detectConflictType(fixA, fixB);
      if (conflictType) {
        const severity = calculateConflictSeverity(fixA, fixB);
        conflicts.push({
          fixA,
          fixB,
          conflictType,
          severity
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Detect the type of conflict between two fixes
 */
function detectConflictType(fixA: FixAnnotation, fixB: FixAnnotation): Conflict['conflictType'] | null {
  // Keyword vs Length
  if (
    (fixA.category === 'keywords' && fixB.category === 'clarity') ||
    (fixA.category === 'clarity' && fixB.category === 'keywords')
  ) {
    // Check if one is about adding keywords and other is about shortening
    const keywordFix = fixA.category === 'keywords' ? fixA : fixB;
    const lengthFix = fixA.category === 'clarity' ? fixA : fixB;
    
    if (lengthFix.issue.toLowerCase().includes('too long') ||
        lengthFix.issue.toLowerCase().includes('shorten') ||
        lengthFix.issue.toLowerCase().includes('concise')) {
      return 'keyword_vs_length';
    }
  }
  
  // Keyword vs Grammar
  if (
    (fixA.category === 'keywords' && fixB.category === 'grammar') ||
    (fixA.category === 'grammar' && fixB.category === 'keywords')
  ) {
    return 'keyword_vs_grammar';
  }
  
  // Length vs Clarity
  if (
    (fixA.category === 'clarity' && fixB.category === 'clarity') &&
    (fixA.issue.toLowerCase().includes('too long') || fixB.issue.toLowerCase().includes('too long'))
  ) {
    return 'length_vs_clarity';
  }
  
  // Other conflicts (same field, different suggestions)
  if (fixA.fieldPath === fixB.fieldPath && fixA.originalText === fixB.originalText) {
    return 'other';
  }
  
  return null;
}

/**
 * Calculate conflict severity
 */
function calculateConflictSeverity(fixA: FixAnnotation, fixB: FixAnnotation): 'low' | 'medium' | 'high' {
  // High severity if both are high severity
  if (fixA.severity === 'high' && fixB.severity === 'high') {
    return 'high';
  }
  
  // Medium if at least one is high
  if (fixA.severity === 'high' || fixB.severity === 'high') {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Resolve conflict by priority
 * Returns the fix that should be applied
 */
export function resolveConflictByPriority(conflict: Conflict): FixAnnotation {
  const priorityA = CATEGORY_PRIORITIES[conflict.fixA.category] || 1;
  const priorityB = CATEGORY_PRIORITIES[conflict.fixB.category] || 1;
  
  // Higher priority wins
  if (priorityA > priorityB) {
    return conflict.fixA;
  } else if (priorityB > priorityA) {
    return conflict.fixB;
  }
  
  // If same priority, use severity
  if (conflict.fixA.severity === 'high' && conflict.fixB.severity !== 'high') {
    return conflict.fixA;
  } else if (conflict.fixB.severity === 'high' && conflict.fixA.severity !== 'high') {
    return conflict.fixB;
  }
  
  // If still tied, use impact score
  if (conflict.fixA.impactScoreDelta > conflict.fixB.impactScoreDelta) {
    return conflict.fixA;
  } else if (conflict.fixB.impactScoreDelta > conflict.fixA.impactScoreDelta) {
    return conflict.fixB;
  }
  
  // Default: return first fix
  return conflict.fixA;
}

/**
 * Suggest alternative fix that resolves conflict
 */
export function suggestAlternativeFix(conflict: Conflict): string | null {
  if (conflict.conflictType === 'keyword_vs_length') {
    const keywordFix = conflict.fixA.category === 'keywords' ? conflict.fixA : conflict.fixB;
    const lengthFix = conflict.fixA.category === 'keywords' ? conflict.fixB : conflict.fixA;
    
    // Suggest: Add keyword but in a more concise way
    return `Add "${keywordFix.replacementText}" but keep the text concise to avoid length issues.`;
  }
  
  if (conflict.conflictType === 'keyword_vs_grammar') {
    return 'Add the keyword while maintaining proper grammar. Consider rephrasing the sentence.';
  }
  
  return null;
}

/**
 * Check if applying a fix would trigger another error
 */
export function wouldTriggerError(
  fix: FixAnnotation,
  allFixes: FixAnnotation[]
): FixAnnotation | null {
  // Check if applying this fix would conflict with another fix
  const conflicts = detectConflicts([fix, ...allFixes]);
  
  for (const conflict of conflicts) {
    if (conflict.fixA.id === fix.id || conflict.fixB.id === fix.id) {
      // This fix is in a conflict
      const otherFix = conflict.fixA.id === fix.id ? conflict.fixB : conflict.fixA;
      
      // Check if the other fix would be triggered by applying this one
      if (wouldFixTriggerOther(fix, otherFix)) {
        return otherFix;
      }
    }
  }
  
  return null;
}

/**
 * Check if applying fixA would trigger fixB
 */
function wouldFixTriggerOther(fixA: FixAnnotation, fixB: FixAnnotation): boolean {
  // If they're on the same field and fixA's replacement would trigger fixB's issue
  if (fixA.fieldPath !== fixB.fieldPath) return false;
  
  // Check if fixA's replacement text would trigger fixB's issue
  const replacement = fixA.replacementText.toLowerCase();
  const issueB = fixB.issue.toLowerCase();
  
  // Simple heuristic: if replacement is longer and fixB is about length
  if (fixB.category === 'clarity' && issueB.includes('too long')) {
    if (replacement.length > fixA.originalText.length + 20) {
      return true;
    }
  }
  
  // If replacement removes something fixB needs
  if (fixB.category === 'keywords' && fixB.originalText) {
    if (!replacement.includes(fixB.originalText.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}


import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { SurgicalFix } from '@/lib/services/cv-surgeon-service';

export type FixCategory =
  | 'impact'
  | 'keywords'
  | 'clarity'
  | 'formatting'
  | 'grammar'
  | 'structure'
  | 'other';

export type FixSeverity = 'low' | 'medium' | 'high';

export type FixStatus = 'open' | 'applied' | 'dismissed' | 'suppressed' | 'semantic_match';

export type FixMatchStrategy = 'exact' | 'fuzzy' | 'field';

export interface FixAnnotation {
  id: string;
  category: FixCategory;
  severity: FixSeverity;
  fieldPath: string;
  originalText: string;
  replacementText: string;
  match: {
    start: number | null;
    end: number | null;
    matchStrategy: FixMatchStrategy;
  };
  issue: string;
  impactScoreDelta: number;
  status: FixStatus;
  suppression?: {
    timestamp: number;
    reason: 'manual_override' | 'semantic_detected' | 'conflict_resolution';
    userId: string;
  };
  semanticMatch?: {
    requiredTerm: string;
    foundTerm: string;
    confidenceScore: number; // 0.0 to 1.0
  };
  fixSignatureHash?: string; // Hash of fix signature for persistent suppression
}

type PathToken = string | number;

function tokensToPath(tokens: PathToken[]): string {
  let out = '';
  for (const t of tokens) {
    if (typeof t === 'number') out += `[${t}]`;
    else out += (out ? '.' : '') + t;
  }
  return out;
}

function parseFieldPath(path: string): PathToken[] {
  const tokens: PathToken[] = [];
  const re = /([^[.\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    if (match[1]) tokens.push(match[1]);
    else if (match[2]) tokens.push(Number(match[2]));
  }
  return tokens;
}

function getAtPath(obj: any, path: PathToken[]): any {
  let cur = obj;
  for (const token of path) {
    if (cur == null) return undefined;
    cur = cur[token as any];
  }
  return cur;
}

function normalizeForFuzzyMatch(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .trim();
}

function inferCategory(fix: SurgicalFix): FixCategory {
  if (fix.category) return fix.category;
  const s = `${fix.section} ${fix.issue}`.toLowerCase();
  if (/(grammar|spelling|typo|tense|punctuation)/.test(s)) return 'grammar';
  if (/(keyword|ats|missing|match|role[-\s]?specific)/.test(s)) return 'keywords';
  if (/(quantif|metric|number|impact|roi|achievement)/.test(s)) return 'impact';
  if (/(format|layout|bullet|spacing|consisten)/.test(s)) return 'formatting';
  if (/(structure|reorder|reorganize|section)/.test(s)) return 'structure';
  if (/(clar|concise|wordy|vague)/.test(s)) return 'clarity';
  return 'other';
}

function inferSeverity(impactScoreDelta: number): FixSeverity {
  if (impactScoreDelta >= 10) return 'high';
  if (impactScoreDelta >= 5) return 'medium';
  return 'low';
}

type Leaf = { path: string; value: string };

function walkStringLeaves(node: unknown, tokens: PathToken[], out: Leaf[]) {
  if (typeof node === 'string') {
    out.push({ path: tokensToPath(tokens), value: node });
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, idx) => walkStringLeaves(item, [...tokens, idx], out));
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    // Avoid traversing huge blobs we don't annotate
    if (k === 'templateData' || k === 'metadata') continue;
    walkStringLeaves(v, [...tokens, k], out);
  }
}

function findBestMatch(fieldValue: string, originalText: string): { start: number | null; end: number | null; strategy: FixMatchStrategy } {
  if (!fieldValue || !originalText) return { start: null, end: null, strategy: 'field' };
  // If the field contains rich-text HTML, we cannot reliably map spans in preview after stripping.
  // Use field-level highlight; applying the fix can still replace whole-field safely.
  if (/<[^>]+>/.test(fieldValue)) {
    return { start: null, end: null, strategy: 'field' };
  }

  const exactIdx = fieldValue.indexOf(originalText);
  if (exactIdx >= 0) {
    return { start: exactIdx, end: exactIdx + originalText.length, strategy: 'exact' };
  }

  const fNorm = normalizeForFuzzyMatch(fieldValue);
  const oNorm = normalizeForFuzzyMatch(originalText);
  const fuzzyIdx = fNorm.indexOf(oNorm);
  if (fuzzyIdx >= 0) {
    // We can’t reliably map fuzzy normalized indices back to original string indices.
    // Return field-level highlight but mark strategy as fuzzy so UI can indicate “approximate”.
    return { start: null, end: null, strategy: 'fuzzy' };
  }

  return { start: null, end: null, strategy: 'field' };
}

export function normalizeSurgicalFixesToAnnotations(
  cvData: UnifiedCVDataStructure,
  fixes: SurgicalFix[]
): FixAnnotation[] {
  const leaves: Leaf[] = [];
  walkStringLeaves(cvData as unknown, [], leaves);

  return (fixes || []).map((fix) => {
    // Prefer explicit fieldPath from backend when valid
    let primary: Leaf | null = null;
    if (fix.fieldPath) {
      const current = getAtPath(cvData as any, parseFieldPath(fix.fieldPath));
      if (typeof current === 'string') {
        primary = { path: fix.fieldPath, value: current };
      }
    }
    
    // Determine expected section based on fix properties
    const isSkillsFix = fix.section?.toLowerCase().includes('skill') || 
                       fix.category === 'keywords' ||
                       (fix.fieldPath && fix.fieldPath.includes('skills')) ||
                       (fix.issue && /skill|keyword|reorder.*skill|prioritize.*skill/i.test(fix.issue));
    
    // Validate that skills fixes are not assigned to name field
    if (primary && isSkillsFix && primary.path === 'basics.name') {
      console.warn('⚠️ Rejecting skills fix assigned to basics.name, searching for correct field:', fix.issue);
      primary = null; // Force re-search
    }
    
    if (!primary) {
      // Filter candidates based on section/category to avoid mismatches
      const candidates = leaves.filter((l) => {
        if (!l.value || !fix.original_text) return false;
        
        // Never assign skills fixes to name field
        if (isSkillsFix && l.path === 'basics.name') {
          return false;
        }
        
        // If this is a skills fix, only consider skills fields
        if (isSkillsFix) {
          return l.path.includes('skills') && l.value.includes(fix.original_text);
        }
        
        // If this is NOT a skills fix, exclude skills fields and name field
        if (!isSkillsFix && (l.path.includes('skills') || l.path === 'basics.name')) {
          return false;
        }
        
        return l.value.includes(fix.original_text);
      });
      
      // If no candidates found, use section-aware fallback
      if (candidates.length === 0) {
        if (isSkillsFix) {
          // For skills fixes, try to find any skills field
          const skillsLeaves = leaves.filter(l => l.path.includes('skills') && l.value && l.value.length > 0);
          primary = skillsLeaves[0] || { path: 'skills[0].skills[0]', value: '' };
        } else {
          // For non-skills fixes, exclude name and skills fields
          const validLeaves = leaves.filter(l => 
            l.value && 
            l.value.length > 0 && 
            l.path !== 'basics.name' && 
            !l.path.includes('skills')
          );
          primary = validLeaves[0] || { path: 'basics.summary', value: '' };
        }
      } else {
        primary = candidates[0];
      }
    }
    
    // Final validation: ensure skills fixes never end up on name field
    if (isSkillsFix && primary.path === 'basics.name') {
      console.error('❌ Critical: Skills fix still assigned to basics.name after validation. Using skills fallback.');
      const skillsLeaves = leaves.filter(l => l.path.includes('skills') && l.value && l.value.length > 0);
      primary = skillsLeaves[0] || { path: 'skills[0].skills[0]', value: '' };
    }

    const match = findBestMatch(primary.value, fix.original_text);

    // Generate fix signature hash for persistent suppression
    const fixSignatureHash = (fix as any).fixSignatureHash || (() => {
      // Simple hash function (client-side)
      const signature = `${fix.issue || ''}|${primary.path || 'basics.summary'}|${fix.original_text || ''}`;
      let hash = 0;
      for (let i = 0; i < signature.length; i++) {
        const char = signature.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
    })();

    return {
      id: fix.id,
      category: inferCategory(fix),
      severity: (fix.severity === 'low' || fix.severity === 'medium' || fix.severity === 'high')
        ? fix.severity
        : inferSeverity(fix.impact_score_delta || 0),
      fieldPath: primary.path || 'basics.summary',
      originalText: fix.original_text || '',
      replacementText: fix.fixed_text || '',
      match: { start: match.start, end: match.end, matchStrategy: match.strategy },
      issue: fix.issue || '',
      impactScoreDelta: fix.impact_score_delta || 0,
      status: 'open',
      fixSignatureHash
    };
  });
}



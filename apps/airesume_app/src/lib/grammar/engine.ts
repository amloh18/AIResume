export type IssueType =
  | 'complex_word'
  | 'weakening'
  | 'passive_voice'
  | 'lengthy_sentence'
  | 'complex_sentence'
  | 'spelling_variant';

export interface GrammarIssue {
  id: string;
  type: IssueType;
  startIndex: number;
  endIndex: number;
  text: string;
  suggestion?: string;
  message: string;
}

const DICTIONARIES = {
  complex_word: [
    { pattern: /\b(utilize|utilizing|utilized)\b/gi, suggestion: 'use' },
    { pattern: /\b(facilitate|facilitating|facilitated)\b/gi, suggestion: 'help' },
    { pattern: /\b(leverage|leveraging|leveraged)\b/gi, suggestion: 'use' },
    { pattern: /\b(synergy|synergies)\b/gi, suggestion: 'collaboration' },
    { pattern: /\b(in order to)\b/gi, suggestion: 'to' },
  ],
  weakening: [
    { pattern: /\b(very|really|basically|just|somewhat)\b/gi, suggestion: '' },
    { pattern: /\b(I think|I believe|I feel)\b/gi, suggestion: '' },
  ],
  passive_voice: [
    { pattern: /\b(is|was|are|were|be|being|been)\s+([a-z]+ed)\b/gi, message: 'Consider using active voice' },
  ],
  spelling_variant_us: [
    { pattern: /\b(analysed|analysing)\b/gi, suggestion: (m: string) => (m.toLowerCase() === 'analysed' ? 'analyzed' : 'analyzing') },
    { pattern: /\b(colour)\b/gi, suggestion: 'color' },
    { pattern: /\b(favourite)\b/gi, suggestion: 'favorite' },
    { pattern: /\b(optimise|optimised|optimising)\b/gi, suggestion: (m: string) => m.toLowerCase().replace('optimis', 'optimiz') },
    { pattern: /\b(organisation|organisations)\b/gi, suggestion: (m: string) => m.toLowerCase().replace('organisation', 'organization') },
    { pattern: /\b(centre|centres)\b/gi, suggestion: (m: string) => m.toLowerCase().replace('centre', 'center') },
    { pattern: /\b(behaviour)\b/gi, suggestion: 'behavior' }
  ]
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function matchCase(original: string, replacement: string) {
  if (!original) return replacement;
  const first = original[0];
  if (first && first.toUpperCase() === first) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function analyzeText(text: string, opts?: { locale?: 'us' | 'uk' }): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  const locale = opts?.locale || 'us';

  // 1. Dictionary checks
  // Complex words
  DICTIONARIES.complex_word.forEach(({ pattern, suggestion }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      issues.push({
        id: generateId(),
        type: 'complex_word',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        text: match[0],
        suggestion,
        message: `Consider replacing "${match[0]}" with "${suggestion}" for clarity.`,
      });
    }
  });

  // Weakening phrases
  DICTIONARIES.weakening.forEach(({ pattern, suggestion }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      issues.push({
        id: generateId(),
        type: 'weakening',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        text: match[0],
        suggestion,
        message: `Consider removing "${match[0]}" as it weakens your statement.`,
      });
    }
  });

  // Passive voice
  DICTIONARIES.passive_voice.forEach(({ pattern, message }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      issues.push({
        id: generateId(),
        type: 'passive_voice',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        text: match[0],
        message,
      });
    }
  });

  if (locale === 'us') {
    DICTIONARIES.spelling_variant_us.forEach(({ pattern, suggestion }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const suggested = typeof suggestion === 'function' ? suggestion(match[0]) : suggestion;
        issues.push({
          id: generateId(),
          type: 'spelling_variant',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          text: match[0],
          suggestion: matchCase(match[0], suggested),
          message: `US spelling: replace "${match[0]}" with "${matchCase(match[0], suggested)}".`
        });
      }
    });
  }

  // 2. Sentence length and complexity
  // A simple sentence tokenizer (split by . ! ?)
  const sentenceRegex = /[^.!?]+[.!?]*/g;
  let match;
  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = match[0];
    const startIndex = match.index;
    
    // Count words (naive approach)
    const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    if (wordCount > 35) {
      issues.push({
        id: generateId(),
        type: 'complex_sentence',
        startIndex,
        endIndex: startIndex + sentence.length,
        text: sentence,
        message: 'This sentence is very long and complex. Consider breaking it into shorter sentences.',
      });
    } else if (wordCount > 25) {
      issues.push({
        id: generateId(),
        type: 'lengthy_sentence',
        startIndex,
        endIndex: startIndex + sentence.length,
        text: sentence,
        message: 'This sentence is quite long. Consider simplifying it.',
      });
    }
  }

  // Sort issues by start index to make it easier to process sequentially
  return issues.sort((a, b) => a.startIndex - b.startIndex);
}

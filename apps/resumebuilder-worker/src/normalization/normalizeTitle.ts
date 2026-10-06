import { ExperienceLevel } from '../models/Job';

export interface TitleNormalizationResult {
  title: string;
  normalizedTitle: string;
  level: ExperienceLevel;
}

const SENIORITY_PATTERNS: Array<{ regex: RegExp; level: ExperienceLevel }> = [
  { regex: /\b(chief|cto|cpo|ceo|vp|vice president|head of|director|principal)\b/i, level: 'executive' },
  { regex: /\b(lead|staff|architect|manager)\b/i, level: 'lead' },
  { regex: /\b(sr\.?|senior|iii|iv|expert)\b/i, level: 'senior' },
  { regex: /\b(mid|intermediate|ii)\b/i, level: 'mid' },
  { regex: /\b(junior|jr\.?|associate|entry|intern|trainee|graduate|i)\b/i, level: 'entry' },
];

export function normalizeTitle(rawTitle: string): TitleNormalizationResult {
  if (!rawTitle) {
    return { title: 'Untitled Role', normalizedTitle: 'untitled role', level: 'unknown' };
  }

  // 1. Clean extraneous bracketed / parenthesized location or requisition strings
  let cleanTitle = rawTitle
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?(remote|hybrid|onsite|req|id:|full time|part time).*?\)/gi, '')
    .replace(/[-–|]\s*(remote|hybrid|onsite|uk|us|india|emea|apac)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) cleanTitle = rawTitle.trim();

  // 2. Identify seniority level
  let level: ExperienceLevel = 'mid';
  for (const item of SENIORITY_PATTERNS) {
    if (item.regex.test(rawTitle)) {
      level = item.level;
      break;
    }
  }

  // 3. Normalized lowercase canonical string for indexing & matching
  const normalizedTitle = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title: cleanTitle,
    normalizedTitle,
    level,
  };
}

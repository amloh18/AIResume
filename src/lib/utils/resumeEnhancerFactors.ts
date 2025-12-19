import type { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

export type ATSFactorKey = 'length' | 'keywordOptimization' | 'content' | 'organization' | 'misc';

export interface ATSFactorScore {
  key: ATSFactorKey;
  label: string;
  percent: number; // 0-100
}

function stripHtml(input: string): string {
  if (!input) return '';
  if (!/<[^>]+>/.test(input)) return input;
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<p[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateWordCount(cvData: UnifiedCVDataStructure): number {
  const parts: string[] = [];
  const basics = (cvData as any)?.basics;
  if (basics) {
    parts.push(stripHtml(String(basics.summary || '')));
    parts.push(stripHtml(String(basics.label || '')));
  }
  const work = (cvData as any)?.work || [];
  work.forEach((w: any) => {
    parts.push(stripHtml(String(w.position || w.title || '')));
    parts.push(stripHtml(String(w.name || w.company || '')));
    parts.push(stripHtml(String(w.summary || '')));
    (w.highlights || []).forEach((h: any) => parts.push(stripHtml(String(h || ''))));
  });
  const education = (cvData as any)?.education || [];
  education.forEach((e: any) => {
    parts.push(stripHtml(String(e.studyType || e.degree || '')));
    parts.push(stripHtml(String(e.area || e.field || '')));
    parts.push(stripHtml(String(e.institution || e.school || '')));
    parts.push(stripHtml(String(e.description || '')));
  });
  const projects = (cvData as any)?.projects || [];
  projects.forEach((p: any) => {
    parts.push(stripHtml(String(p.name || p.title || '')));
    parts.push(stripHtml(String(p.description || '')));
    (p.highlights || []).forEach((h: any) => parts.push(stripHtml(String(h || ''))));
  });
  const skills = (cvData as any)?.skills || [];
  skills.forEach((s: any) => {
    parts.push(stripHtml(String(s.category || s.name || '')));
    const items =
      (Array.isArray(s.skills) && s.skills) ||
      (Array.isArray(s.keywords) && s.keywords) ||
      (Array.isArray(s.items) && s.items) ||
      [];
    items.forEach((x: any) => parts.push(stripHtml(String(x || ''))));
  });

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function severityWeight(sev: FixAnnotation['severity']): number {
  if (sev === 'high') return 10;
  if (sev === 'medium') return 6;
  return 3;
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isLengthRelated(fix: FixAnnotation): boolean {
  const s = `${fix.issue} ${fix.originalText}`.toLowerCase();
  return /(too\s+long|too\s+short|length|wordy|concise|brevity|2\s*pages|one\s*page|page)/.test(s);
}

export function computeATSFactorScores(params: {
  cvData: UnifiedCVDataStructure;
  fixes: FixAnnotation[];
  overallScore?: number;
}): ATSFactorScore[] {
  const { cvData, fixes, overallScore } = params;
  const open = (fixes || []).filter((f) => f.status === 'open');

  const lengthFixes = open.filter(isLengthRelated);
  const keywordFixes = open.filter((f) => f.category === 'keywords');
  const contentFixes = open.filter((f) => f.category === 'impact' || f.category === 'clarity');
  const orgFixes = open.filter((f) => f.category === 'structure' || f.category === 'formatting');
  const miscFixes = open.filter((f) => f.category === 'grammar' || f.category === 'other');

  // Base 100, subtract penalties
  const basePenalty = (arr: FixAnnotation[]) => arr.reduce((sum, f) => sum + severityWeight(f.severity), 0);

  // Length: combine fix-driven penalty with word-count heuristic
  const words = estimateWordCount(cvData);
  let lengthPct = 100 - basePenalty(lengthFixes);
  if (words > 950) lengthPct -= Math.min(30, ((words - 950) / 50) * 2); // cap penalty
  if (words > 0 && words < 350) lengthPct -= Math.min(30, ((350 - words) / 50) * 2);

  const keywordPct = 100 - basePenalty(keywordFixes);
  const contentPct = 100 - basePenalty(contentFixes);
  const orgPct = 100 - basePenalty(orgFixes);
  const miscPct = 100 - basePenalty(miscFixes);

  // Lightly bias towards overall score if provided (keeps factors coherent)
  const blend = (pct: number) => {
    if (typeof overallScore !== 'number') return clampPct(pct);
    return clampPct(pct * 0.7 + overallScore * 0.3);
  };

  return [
    { key: 'length', label: 'Length', percent: blend(lengthPct) },
    { key: 'keywordOptimization', label: 'Keyword Optimization', percent: blend(keywordPct) },
    { key: 'content', label: 'Content', percent: blend(contentPct) },
    { key: 'organization', label: 'Organization', percent: blend(orgPct) },
    { key: 'misc', label: 'Misc.', percent: blend(miscPct) }
  ];
}








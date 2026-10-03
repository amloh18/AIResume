/**
 * CV Reuse Engine → CV Refinement Engine
 *
 * IMPORTANT — what this module is NOT for:
 *
 * It used to answer "can we point this new journey at an existing CV instead of
 * generating one?". That is no longer the product behaviour: every job gets its
 * own tailored Journey CV. Linking one CV to several jobs made per-job edits
 * bleed across applications and destroyed the "this CV was tailored for this
 * job" guarantee.
 *
 * What it does now:
 *
 * It compares the incoming job against the user's previous CVs and returns a
 * REFINEMENT SEED — the most comparable prior document, plus the JD keywords
 * that document already managed to evidence. That seed is fed into the tailoring
 * prompt so a freshly generated CV can hit the same keyword coverage, and so we
 * can tell the user (and the logs) which JD keywords nobody has evidenced yet.
 *
 * The seed carries no free text on purpose. A prior CV may contain hand-edits
 * that are not backed by the Master CV; copying its sentences would smuggle
 * unverified claims into a brand-new document. Only keyword targets and evidence
 * pointers cross the boundary.
 */

import CV from '@/models/CV';
import { extractCVSearchText } from '@/lib/utils/cv-text-extractor';
import {
  JobTargetProfile,
  EvidenceProfile,
  GapAnalysis,
  CVReuseEvaluation,
  CVRefinementSeed,
} from './types';

// ─── Similarity Scoring ───────────────────────────────────────────────

function calculateRoleSimilarity(
  existingCVTitle: string,
  targetRole: string
): number {
  const existing = existingCVTitle.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const target = targetRole.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  const existingWords = new Set(existing.split(/\s+/));
  const targetWords = new Set(target.split(/\s+/));

  let overlap = 0;
  for (const word of targetWords) {
    if (existingWords.has(word)) overlap++;
  }

  return targetWords.size > 0 ? overlap / targetWords.size : 0;
}

function calculateKeywordOverlap(
  existingCVKeywords: string[],
  jobKeywords: string[]
): number {
  if (jobKeywords.length === 0) return 0;

  const existingSet = new Set(existingCVKeywords.map(k => k.toLowerCase()));
  let overlap = 0;

  for (const kw of jobKeywords) {
    if (existingSet.has(kw.toLowerCase())) overlap++;
  }

  return overlap / jobKeywords.length;
}

// ─── CV Text Extraction ───────────────────────────────────────────────

function extractCVKeywords(cvData: any): string[] {
  const keywords: string[] = [];

  // From skills
  if (cvData.skills && Array.isArray(cvData.skills)) {
    for (const group of cvData.skills) {
      if (group.skills && Array.isArray(group.skills)) {
        for (const skill of group.skills) {
          keywords.push(typeof skill === 'string' ? skill : skill.name || '');
        }
      }
      if (group.keywords && Array.isArray(group.keywords)) {
        keywords.push(...group.keywords);
      }
    }
  }

  // From work highlights
  if (cvData.work && Array.isArray(cvData.work)) {
    for (const work of cvData.work) {
      if (work.position) keywords.push(work.position);
      if (work.highlights && Array.isArray(work.highlights)) {
        for (const h of work.highlights) {
          if (typeof h === 'string') {
            // Extract tech terms
            const techTerms = h.match(/\b[A-Za-z+#/.]{2,}\b/g) || [];
            keywords.push(...techTerms);
          }
        }
      }
    }
  }

  // From projects
  if (cvData.projects && Array.isArray(cvData.projects)) {
    for (const project of cvData.projects) {
      if (project.keywords) {
        keywords.push(...(Array.isArray(project.keywords) ? project.keywords : []));
      }
    }
  }

  return [...new Set(keywords.filter(Boolean))];
}

/**
 * Does a blob of lowercase CV text evidence this keyword?
 *
 * Multi-word keywords are matched as a whole phrase. Single tokens use a word
 * boundary so "Java" does not match "JavaScript" and "Go" does not match "go"
 * inside a sentence word. This is the same rule the deterministic ATS pass
 * uses, kept in one place so the seed and the pass never disagree.
 */
export function textEvidencesKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;

  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;

  if (/\s/.test(kw)) {
    return text.includes(kw);
  }

  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#.])${escaped}($|[^a-z0-9+#.])`, 'i').test(text);
}

// ─── Main Service ─────────────────────────────────────────────────────

/**
 * Evaluate a new job against the user's prior CVs and produce a refinement seed.
 *
 * Note the parameter name change from `evaluateCVReuse` to `evaluateCvRefinement`:
 * callers that only want a seed should use this. `evaluateCVReuse` remains as a
 * thin alias so existing imports keep working.
 */
export async function evaluateCvRefinement(params: {
  userId: string;
  jobTargetProfile: JobTargetProfile;
  evidenceProfile: EvidenceProfile;
  gapAnalysis: GapAnalysis;
  /** Master CV content — the authoritative source used to decide what is genuinely evidenced. */
  masterCvData?: any;
}): Promise<CVReuseEvaluation> {
  const { userId, jobTargetProfile, gapAnalysis, masterCvData } = params;

  // JD keywords worth targeting, deduped case-insensitively.
  const jobKeywordMap = new Map<string, string>();
  for (const kw of [
    ...jobTargetProfile.technologies,
    ...jobTargetProfile.tools,
    ...jobTargetProfile.likelyATSKeywords,
  ]) {
    if (!kw || !kw.trim()) continue;
    const key = kw.trim().toLowerCase();
    if (!jobKeywordMap.has(key)) jobKeywordMap.set(key, kw.trim());
  }
  const jobKeywords = [...jobKeywordMap.values()];

  const masterText = extractCVSearchText(masterCvData || {});
  const masterMissing = jobKeywords.filter(kw => !textEvidencesKeyword(masterText, kw));

  // Find existing journey/standalone CVs for this user
  const existingCVs = await CV.find({
    userId,
    cvType: { $in: ['journey', 'standalone'] },
    status: { $ne: 'archived' },
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  if (existingCVs.length === 0) {
    return {
      canReuse: false,
      reuseCVId: null,
      reuseConfidence: 0,
      reason: 'No existing CVs found',
      adaptationNeeded: [],
      existingCVScore: 0,
      projectedScore: 0,
      refinementSeed: null,
    };
  }

  let best: {
    cv: any;
    combinedScore: number;
    roleSimilarity: number;
    keywordOverlap: number;
    cvKeywords: string[];
  } | null = null;

  for (const cv of existingCVs) {
    const cvKeywords = extractCVKeywords(cv.cvData || {});

    const roleSimilarity = calculateRoleSimilarity(
      cv.title || '',
      jobTargetProfile.targetRole
    );
    const keywordOverlap = calculateKeywordOverlap(cvKeywords, jobKeywords);

    // Combined score (weighted)
    const combinedScore = roleSimilarity * 0.4 + keywordOverlap * 0.6;

    if (!best || combinedScore > best.combinedScore) {
      best = { cv, combinedScore, roleSimilarity, keywordOverlap, cvKeywords };
    }
  }

  if (!best) {
    return {
      canReuse: false,
      reuseCVId: null,
      reuseConfidence: 0,
      reason: 'No existing CVs found',
      adaptationNeeded: [],
      existingCVScore: 0,
      projectedScore: 0,
      refinementSeed: null,
    };
  }

  // A seed is only useful when there is meaningful comparability. Below this
  // threshold the prior CV is a different career story and seeding would just
  // add noise to the prompt.
  const SEED_THRESHOLD = 0.25;

  const { cv, combinedScore, roleSimilarity, keywordOverlap } = best;

  const adaptationNeeded: string[] = [];
  if (roleSimilarity < 0.3) {
    adaptationNeeded.push('Update job title and role positioning');
  }
  if (keywordOverlap < 0.6) {
    adaptationNeeded.push('Add missing keywords for this specific job');
  }
  if (gapAnalysis.missing.length > 0) {
    adaptationNeeded.push(`Address ${gapAnalysis.missing.length} missing requirements`);
  }

  let refinementSeed: CVRefinementSeed | null = null;

  if (combinedScore >= SEED_THRESHOLD) {
    const seedText = extractCVSearchText(cv.cvData || {});
    const alreadyEvidencedKeywords = jobKeywords.filter(kw =>
      textEvidencesKeyword(seedText, kw)
    );
    const stillMissingKeywords = masterMissing.filter(
      kw => !textEvidencesKeyword(seedText, kw)
    );

    const notes: string[] = [];
    if (alreadyEvidencedKeywords.length > 0) {
      notes.push(
        `A previous CV for a comparable role already evidences ${alreadyEvidencedKeywords.length} of this job's keywords — reuse the same underlying evidence, not its wording.`
      );
    }
    if (stillMissingKeywords.length > 0) {
      notes.push(
        `${stillMissingKeywords.length} job keywords are not evidenced anywhere yet — surface them only if the Master CV genuinely supports them.`
      );
    }
    if (roleSimilarity < 0.3) {
      notes.push('Role titles differ substantially; re-anchor the headline and summary to the target role.');
    }

    refinementSeed = {
      seedCVId: (cv._id as any).toString(),
      seedCVTitle: cv.title || 'Untitled CV',
      confidence: Number(combinedScore.toFixed(3)),
      alreadyEvidencedKeywords,
      stillMissingKeywords,
      seedAtsScore:
        typeof cv.metadata?.atsScore === 'number' ? cv.metadata.atsScore : undefined,
      notes,
    };
  }

  const existingScore =
    typeof cv.metadata?.atsScore === 'number' ? cv.metadata.atsScore : 0;

  return {
    // Deprecated fields — retained so existing readers do not break. They must
    // NOT be used to share a CV between journeys.
    canReuse: combinedScore >= 0.5,
    reuseCVId: (cv._id as any).toString(),
    reuseConfidence: Number(combinedScore.toFixed(3)),
    reason:
      combinedScore >= SEED_THRESHOLD
        ? `Comparable prior CV found (${Math.round(combinedScore * 100)}% overlap with target role)`
        : `Most similar prior CV only reached ${Math.round(combinedScore * 100)}% overlap — no refinement seed used`,
    adaptationNeeded,
    existingCVScore: existingScore,
    projectedScore: Math.min(100, existingScore + Math.round(combinedScore * 10)),
    refinementSeed,
  };
}

/**
 * @deprecated Use {@link evaluateCvRefinement}. This alias exists only so older
 * call sites keep compiling; it no longer signals that a CV should be reused.
 * The returned `reuseCVId` / `canReuse` must not be used to link a CV to more
 * than one journey.
 */
export const evaluateCVReuse = evaluateCvRefinement;

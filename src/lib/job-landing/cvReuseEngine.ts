/**
 * CV Reuse Engine
 *
 * Before creating a new journey CV, evaluates whether an existing CV
 * is sufficiently suitable for the current job.
 *
 * This avoids unnecessary CV duplication and preserves user edits.
 */

import CV from '@/models/CV';
import {
  JobTargetProfile,
  EvidenceProfile,
  GapAnalysis,
  CVReuseEvaluation,
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

// ─── Main Service ─────────────────────────────────────────────────────

/**
 * Evaluate whether an existing CV can be reused for a new job.
 */
export async function evaluateCVReuse(params: {
  userId: string;
  jobTargetProfile: JobTargetProfile;
  evidenceProfile: EvidenceProfile;
  gapAnalysis: GapAnalysis;
}): Promise<CVReuseEvaluation> {
  const { userId, jobTargetProfile, gapAnalysis } = params;

  // Find existing journey CVs for this user
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
    };
  }

  // Get job keywords for comparison
  const jobKeywords = [
    ...jobTargetProfile.technologies,
    ...jobTargetProfile.tools,
    ...jobTargetProfile.likelyATSKeywords,
  ];

  let bestMatch: CVReuseEvaluation | null = null;

  for (const cv of existingCVs) {
    const cvKeywords = extractCVKeywords(cv.cvData || {});

    // Calculate similarity scores
    const roleSimilarity = calculateRoleSimilarity(
      cv.title || '',
      jobTargetProfile.targetRole
    );
    const keywordOverlap = calculateKeywordOverlap(cvKeywords, jobKeywords);

    // Combined score (weighted)
    const combinedScore = roleSimilarity * 0.4 + keywordOverlap * 0.6;

    // Determine if this CV is suitable
    const canReuse = combinedScore >= 0.5; // At least 50% overlap

    if (canReuse) {
      const adaptationNeeded: string[] = [];

      // Check what adaptations would be needed
      if (roleSimilarity < 0.3) {
        adaptationNeeded.push('Update job title and role positioning');
      }
      if (keywordOverlap < 0.6) {
        adaptationNeeded.push('Add missing keywords for this specific job');
      }
      if (gapAnalysis.missing.length > 0) {
        adaptationNeeded.push(
          `Address ${gapAnalysis.missing.length} missing requirements`
        );
      }

      const evaluation: CVReuseEvaluation = {
        canReuse: true,
        reuseCVId: (cv._id as any).toString(),
        reuseConfidence: combinedScore,
        reason: `Existing CV has ${Math.round(combinedScore * 100)}% overlap with target role`,
        adaptationNeeded,
        existingCVScore: cv.cv_score_ats || 0,
        projectedScore: Math.min(100, (cv.cv_score_ats || 0) + Math.round(combinedScore * 10)),
      };

      if (!bestMatch || combinedScore > bestMatch.reuseConfidence) {
        bestMatch = evaluation;
      }
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // No suitable CV found
  return {
    canReuse: false,
    reuseCVId: null,
    reuseConfidence: 0,
    reason: 'No existing CV has sufficient overlap with target role',
    adaptationNeeded: [],
    existingCVScore: 0,
    projectedScore: 0,
  };
}

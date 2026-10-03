/**
 * Gap Analysis Service
 *
 * Compares JobTargetProfile against EvidenceProfile to produce
 * a structured GapAnalysis with matched/partial/missing items.
 *
 * This is the "how well does this candidate fit this job" intelligence layer.
 */

import {
  JobTargetProfile,
  EvidenceProfile,
  GapAnalysis,
  GapItem,
  Requirement,
  EvidenceItem,
  RequirementCategory,
} from './types';

// ─── Matching Logic ───────────────────────────────────────────────────

function findMatchingEvidence(
  requirement: Requirement,
  evidence: EvidenceProfile
): EvidenceItem[] {
  const matches: EvidenceItem[] = [];
  const reqLower = requirement.text.toLowerCase();

  // Search all evidence categories
  const allEvidence = [
    ...evidence.experience,
    ...evidence.skills,
    ...evidence.achievements,
    ...evidence.projects,
    ...evidence.education,
    ...evidence.certifications,
    ...evidence.tools,
    ...evidence.technologies,
    ...evidence.languages,
    ...evidence.leadership,
    ...evidence.industryExperience,
  ];

  for (const item of allEvidence) {
    const factLower = item.fact.toLowerCase();

    // Exact match
    if (factLower.includes(reqLower) || reqLower.includes(factLower)) {
      matches.push(item);
      continue;
    }

    // Keyword overlap
    const reqKeywords = extractKeywords(reqLower);
    const itemKeywords = new Set(item.keywords.map(k => k.toLowerCase()));

    let overlap = 0;
    for (const kw of reqKeywords) {
      if (itemKeywords.has(kw)) overlap++;
    }

    if (overlap > 0 && overlap >= reqKeywords.length * 0.3) {
      matches.push(item);
    }
  }

  return matches;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'must',
    'this', 'that', 'these', 'those', 'it', 'its', 'their', 'they',
    'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her',
  ]);

  return text
    .split(/[\s,;.!?]+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .map(w => w.toLowerCase());
}

// ─── Gap Classification ───────────────────────────────────────────────

function classifyRequirement(
  requirement: Requirement,
  evidence: EvidenceProfile
): GapItem {
  const matches = findMatchingEvidence(requirement, evidence);

  if (matches.length >= 2) {
    return {
      requirement: requirement.text,
      category: requirement.category,
      priority: requirement.priority,
      status: 'matched',
      evidence: matches,
    };
  }

  if (matches.length === 1) {
    // Check if it's a strong or partial match
    const match = matches[0];
    const reqKeywords = extractKeywords(requirement.text.toLowerCase());
    const matchKeywords = new Set(match.keywords.map(k => k.toLowerCase()));

    const overlap = reqKeywords.filter(kw => matchKeywords.has(kw)).length;
    const overlapRatio = reqKeywords.length > 0 ? overlap / reqKeywords.length : 0;

    if (overlapRatio >= 0.5) {
      return {
        requirement: requirement.text,
        category: requirement.category,
        priority: requirement.priority,
        status: 'matched',
        evidence: matches,
      };
    }

    return {
      requirement: requirement.text,
      category: requirement.category,
      priority: requirement.priority,
      status: 'partial',
      evidence: matches,
      recommendation: `Partially evidenced. Consider strengthening with: ${requirement.text}`,
    };
  }

  // No matches
  if (requirement.priority === 'mandatory') {
    return {
      requirement: requirement.text,
      category: requirement.category,
      priority: requirement.priority,
      status: 'missing',
      gapDescription: `Required but not found in candidate evidence: ${requirement.text}`,
      recommendation: `This is a mandatory requirement. If the candidate has this experience, ensure it's documented in the Master CV.`,
    };
  }

  return {
    requirement: requirement.text,
    category: requirement.category,
    priority: requirement.priority,
    status: 'uncertain',
    gapDescription: `Not verified in candidate evidence: ${requirement.text}`,
    recommendation: `If the candidate has this skill, add evidence to the Master CV before generating documents.`,
  };
}

// ─── Score Calculation ────────────────────────────────────────────────

function calculateScores(items: GapItem[]): {
  overall: number;
  hard: number;
  preferred: number;
  keywordCoverage: number;
} {
  if (items.length === 0) {
    return { overall: 0, hard: 0, preferred: 0, keywordCoverage: 0 };
  }

  const hardItems = items.filter(i => i.priority === 'mandatory');
  const preferredItems = items.filter(i => i.priority === 'preferred' || i.priority === 'nice-to-have');

  const scoreForGroup = (group: GapItem[]) => {
    if (group.length === 0) return 100;
    const matched = group.filter(i => i.status === 'matched').length;
    const partial = group.filter(i => i.status === 'partial').length;
    return Math.round(((matched + partial * 0.5) / group.length) * 100);
  };

  const overall = scoreForGroup(items);
  const hard = scoreForGroup(hardItems);
  const preferred = scoreForGroup(preferredItems);

  // Keyword coverage is based on how many requirements have any evidence
  const withEvidence = items.filter(i =>
    i.status === 'matched' || i.status === 'partial'
  ).length;
  const keywordCoverage = Math.round((withEvidence / items.length) * 100);

  return { overall, hard, preferred, keywordCoverage };
}

// ─── Strategy Generation ──────────────────────────────────────────────

function generateStrategy(
  items: GapItem[],
  profile: JobTargetProfile
): {
  strengths: string[];
  gaps: string[];
  differentiators: string[];
} {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const differentiators: string[] = [];

  for (const item of items) {
    if (item.status === 'matched' && item.evidence && item.evidence.length > 0) {
      const bestEvidence = item.evidence[0];
      strengths.push(`${item.requirement}: ${bestEvidence.fact.substring(0, 100)}`);

      // Check if this is a differentiator (something unique)
      if (item.evidence.some(e =>
        e.evidenceType === 'achievement' || e.evidenceType === 'project'
      )) {
        differentiators.push(item.requirement);
      }
    } else if (item.status === 'missing') {
      gaps.push(item.requirement);
    }
  }

  return { strengths, gaps, differentiators };
}

// ─── Main Service ─────────────────────────────────────────────────────

/**
 * Perform gap analysis between a job target profile and candidate evidence.
 */
export function performGapAnalysis(params: {
  jobTargetProfile: JobTargetProfile;
  evidenceProfile: EvidenceProfile;
  jobId: string;
  userId: string;
}): GapAnalysis {
  const { jobTargetProfile, evidenceProfile, jobId, userId } = params;

  // Classify all requirements
  const allRequirements = [
    ...jobTargetProfile.hardRequirements,
    ...jobTargetProfile.preferredRequirements,
  ];

  const gapItems = allRequirements.map(req =>
    classifyRequirement(req, evidenceProfile)
  );

  // Categorize results
  const matched = gapItems.filter(i => i.status === 'matched');
  const partiallyMatched = gapItems.filter(i => i.status === 'partial');
  const missing = gapItems.filter(i => i.status === 'missing');
  const uncertain = gapItems.filter(i => i.status === 'uncertain');

  // Calculate scores
  const scores = calculateScores(gapItems);

  // Generate strategy
  const strategy = generateStrategy(gapItems, jobTargetProfile);

  // Update job target profile with gap intelligence
  jobTargetProfile.candidateGaps = strategy.gaps;
  jobTargetProfile.candidateStrengths = strategy.strengths;

  return {
    matched,
    partiallyMatched,
    missing,
    uncertain,
    overallMatch: scores.overall,
    hardRequirementMatch: scores.hard,
    preferredRequirementMatch: scores.preferred,
    keywordCoverage: scores.keywordCoverage,
    strengths: strategy.strengths,
    gaps: strategy.gaps,
    differentiators: strategy.differentiators,
    jobId,
    userId,
    analyzedAt: new Date(),
  };
}

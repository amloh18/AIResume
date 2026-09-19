/**
 * Candidate Evidence Engine
 *
 * Creates structured evidence representation from the user's verified information.
 * Prevents AI from inventing evidence and enables reuse across:
 * - Resume tailoring
 * - Cover letters
 * - Application questions
 * - Interview preparation
 */

export interface CandidateEvidence {
  id: string;
  type: 'skill' | 'experience' | 'achievement' | 'education' | 'certification' | 'project';
  claim: string;
  source: string; // Path to the evidence in the CV (e.g., "experience.projectA")
  verified: boolean;
  confidence: number;
  metadata?: {
    startDate?: Date;
    endDate?: Date;
    company?: string;
    role?: string;
    metrics?: string[];
    keywords?: string[];
  };
}

export interface EvidenceMapping {
  jobRequirement: string;
  evidence: CandidateEvidence[];
  matchScore: number;
  gapAnalysis?: string;
}

/**
 * Extract verified skills from Master CV
 */
export function extractVerifiedSkills(cvData: any): CandidateEvidence[] {
  const evidence: CandidateEvidence[] = [];

  if (!cvData) return evidence;

  // Extract from skills section — supports unified { category, skills[] } and legacy { name, keywords[] }
  const skills = cvData.skills || cvData.resumeData?.skills || [];
  for (const skill of skills) {
    if (typeof skill === 'string') {
      evidence.push({
        id: `skill_${skill.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'skill',
        claim: skill,
        source: 'skills',
        verified: true,
        confidence: 0.9,
        metadata: { keywords: [skill.toLowerCase()] },
      });
    } else if (skill?.skills && Array.isArray(skill.skills)) {
      // Unified format: { category, skills[] }
      for (const s of skill.skills) {
        if (typeof s === 'string' && s) {
          evidence.push({
            id: `skill_${s.toLowerCase().replace(/\s+/g, '_')}`,
            type: 'skill',
            claim: s,
            source: `skills.${skill.category || 'uncategorized'}`,
            verified: true,
            confidence: 0.9,
            metadata: { keywords: [s.toLowerCase()] },
          });
        }
      }
    } else if (skill?.keywords && Array.isArray(skill.keywords)) {
      // Legacy format: { name, keywords[] }
      for (const kw of skill.keywords) {
        if (typeof kw === 'string' && kw) {
          evidence.push({
            id: `skill_${kw.toLowerCase().replace(/\s+/g, '_')}`,
            type: 'skill',
            claim: kw,
            source: `skills.${skill.name || 'uncategorized'}`,
            verified: true,
            confidence: 0.9,
            metadata: { keywords: [kw.toLowerCase()] },
          });
        }
      }
    } else if (skill?.name) {
      evidence.push({
        id: `skill_${skill.name.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'skill',
        claim: skill.name,
        source: 'skills',
        verified: true,
        confidence: 0.9,
        metadata: { keywords: [skill.name.toLowerCase()] },
      });
    }
  }

  return evidence;
}

/**
 * Extract verified experience from Master CV
 */
export function extractVerifiedExperience(cvData: any): CandidateEvidence[] {
  const evidence: CandidateEvidence[] = [];

  if (!cvData) return evidence;

  // Extract from experience section — unified schema uses work[] with position/name
  const experience = cvData.work || cvData.experience || cvData.resumeData?.work || cvData.resumeData?.experience || [];
  for (const exp of experience) {
    const role = exp.position || exp.role || exp.title;
    const company = exp.name || exp.company || exp.organization;
    const description = exp.summary || exp.description || exp.responsibilities || '';
    const achievements = exp.highlights || exp.achievements || exp.accomplishments || [];

    if (role && company) {
      evidence.push({
        id: `exp_${company.toLowerCase().replace(/\s+/g, '_')}_${role.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'experience',
        claim: `${role} at ${company}`,
        source: `experience.${company}.${role}`,
        verified: true,
        confidence: 0.95,
        metadata: {
          company,
          role,
          startDate: exp.startDate || exp.from,
          endDate: exp.endDate || exp.to,
          keywords: [role.toLowerCase(), company.toLowerCase()],
        },
      });

      // Extract achievements from this experience
      for (const achievement of achievements) {
        const achievementText = typeof achievement === 'string' ? achievement : achievement.text || achievement.description;
        if (achievementText) {
          evidence.push({
            id: `achievement_${company.toLowerCase().replace(/\s+/g, '_')}_${evidence.length}`,
            type: 'achievement',
            claim: achievementText,
            source: `experience.${company}.${role}.achievements`,
            verified: true,
            confidence: 0.85,
            metadata: {
              company,
              role,
              metrics: extractMetrics(achievementText),
              keywords: extractKeywords(achievementText),
            },
          });
        }
      }
    }
  }

  return evidence;
}

/**
 * Extract verified achievements from Master CV
 */
export function extractVerifiedAchievements(cvData: any): CandidateEvidence[] {
  const evidence: CandidateEvidence[] = [];

  if (!cvData) return evidence;

  // Extract from projects section
  const projects = cvData.projects || cvData.resumeData?.projects || [];
  for (const project of projects) {
    const name = project.name || project.title;
    const description = project.description || '';
    const achievements = project.achievements || project.results || [];

    if (name) {
      evidence.push({
        id: `project_${name.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'project',
        claim: name,
        source: `projects.${name}`,
        verified: true,
        confidence: 0.9,
        metadata: {
          keywords: [name.toLowerCase()],
        },
      });

      // Extract achievements from this project
      for (const achievement of achievements) {
        const achievementText = typeof achievement === 'string' ? achievement : achievement.text || achievement.description;
        if (achievementText) {
          evidence.push({
            id: `project_achievement_${name.toLowerCase().replace(/\s+/g, '_')}_${evidence.length}`,
            type: 'achievement',
            claim: achievementText,
            source: `projects.${name}.achievements`,
            verified: true,
            confidence: 0.85,
            metadata: {
              metrics: extractMetrics(achievementText),
              keywords: extractKeywords(achievementText),
            },
          });
        }
      }
    }
  }

  return evidence;
}

/**
 * Extract metrics from text (numbers, percentages, etc.)
 */
function extractMetrics(text: string): string[] {
  const metrics: string[] = [];
  const metricPatterns = [
    /\d+%/g, // Percentages
    /\$[\d,]+/g, // Dollar amounts
    /\d+x/g, // Multipliers
    /\d+ years?/g, // Years
    /\d+ months?/g, // Months
    /\d+ people/g, // Team sizes
    /\d+ users/g, // User counts
  ];

  for (const pattern of metricPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      metrics.push(...matches);
    }
  }

  return [...new Set(metrics)];
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - could be enhanced with NLP
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  // Remove common stop words
  const stopWords = ['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'about', 'would', 'could', 'should'];
  return words.filter((word) => !stopWords.includes(word));
}

/**
 * Map evidence to job requirements
 */
export function mapEvidenceToRequirements(
  evidence: CandidateEvidence[],
  jobRequirements: string[]
): EvidenceMapping[] {
  const mappings: EvidenceMapping[] = [];

  for (const requirement of jobRequirements) {
    const matchingEvidence = evidence.filter((e) => {
      // Check if evidence keywords match requirement keywords
      const requirementKeywords = extractKeywords(requirement);
      const evidenceKeywords = e.metadata?.keywords || [];

      return requirementKeywords.some((rk) =>
        evidenceKeywords.some((ek) => ek.includes(rk) || rk.includes(ek))
      );
    });

    const matchScore = matchingEvidence.length > 0
      ? Math.min(100, matchingEvidence.length * 25)
      : 0;

    mappings.push({
      jobRequirement: requirement,
      evidence: matchingEvidence,
      matchScore,
      gapAnalysis: matchingEvidence.length === 0
        ? `No direct evidence found for: ${requirement}`
        : undefined,
    });
  }

  return mappings;
}

/**
 * Prevent unsupported claims
 */
export function validateClaim(
  claim: string,
  evidence: CandidateEvidence[]
): { valid: boolean; supportingEvidence?: CandidateEvidence[]; reason?: string } {
  // Check if the claim is supported by any evidence
  const claimKeywords = extractKeywords(claim);
  const supportingEvidence = evidence.filter((e) => {
    const evidenceKeywords = e.metadata?.keywords || [];
    return claimKeywords.some((ck) =>
      evidenceKeywords.some((ek) => ek.includes(ck) || ck.includes(ek))
    );
  });

  if (supportingEvidence.length > 0) {
    return {
      valid: true,
      supportingEvidence,
    };
  }

  return {
    valid: false,
    reason: `Claim "${claim}" is not supported by verified evidence`,
  };
}

/**
 * Get all evidence for a candidate
 */
export function getAllCandidateEvidence(cvData: any): CandidateEvidence[] {
  const skills = extractVerifiedSkills(cvData);
  const experience = extractVerifiedExperience(cvData);
  const achievements = extractVerifiedAchievements(cvData);

  return [...skills, ...experience, ...achievements];
}

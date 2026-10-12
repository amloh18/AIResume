/**
 * Scoring Profile Normalizer
 *
 * Provides a single, unified candidate profile adapter for all recommendation
 * and scoring routes (SB-26).
 *
 * Normalizes both:
 * 1. Cold extraction shape (`extractCandidateProfile`): `targetLocations`, `experienceLevel`, `preferredIndustries`
 * 2. Warm cache shape (`NormalizedUserProfile` / `getOrComputeProfile`): `locations`, `seniority`, `industries`
 */

export interface ScoringProfile {
  userId?: string;
  targetRoles: string[];
  roleFamilies: string[];
  targetLocations: string[];
  remotePreference: string;
  workplacePreference: string;
  experienceLevel?: string;
  experienceYears?: number;
  minSalary?: number;
  salaryCurrency?: string;
  skills: string[];
  preferredIndustries: string[];
  hardConstraints: {
    remoteOnly: boolean;
    minSalary: number;
    locations: string[];
    visaRequired: boolean;
  };
  softPreferences: {
    preferredIndustries: string[];
    preferredCompanySizes: string[];
    preferredWorkplace: string;
  };
}

/**
 * Normalizes any profile-like object into a consistent `ScoringProfile`.
 * Guarantees iterable `targetLocations`, consistent `experienceLevel`,
 * and resolved `hardConstraints`.
 */
export function normalizeScoringProfile(raw: any): ScoringProfile {
  if (!raw || typeof raw !== 'object') {
    return {
      targetRoles: [],
      roleFamilies: [],
      targetLocations: [],
      remotePreference: 'any',
      workplacePreference: 'any',
      experienceLevel: undefined,
      experienceYears: 0,
      minSalary: 0,
      salaryCurrency: 'USD',
      skills: [],
      preferredIndustries: [],
      hardConstraints: {
        remoteOnly: false,
        minSalary: 0,
        locations: [],
        visaRequired: false,
      },
      softPreferences: {
        preferredIndustries: [],
        preferredCompanySizes: [],
        preferredWorkplace: 'any',
      },
    };
  }

  // Target roles
  const targetRoles: string[] = Array.isArray(raw.targetRoles)
    ? raw.targetRoles.filter((r: any) => typeof r === 'string' && r.trim().length > 0)
    : [];

  // Role families
  const roleFamilies: string[] = Array.isArray(raw.roleFamilies)
    ? raw.roleFamilies.filter((f: any) => typeof f === 'string' && f.trim().length > 0)
    : [];

  // Skills
  const skills: string[] = Array.isArray(raw.skills)
    ? raw.skills.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
    : [];

  // Locations: harmonize targetLocations vs locations
  const targetLocations: string[] = Array.isArray(raw.targetLocations)
    ? raw.targetLocations.filter((l: any) => typeof l === 'string' && l.trim().length > 0)
    : Array.isArray(raw.locations)
      ? raw.locations.filter((l: any) => typeof l === 'string' && l.trim().length > 0)
      : [];

  // Experience level: harmonize experienceLevel vs seniority
  const rawLevel = raw.experienceLevel || raw.seniority;
  const experienceLevel = typeof rawLevel === 'string' && rawLevel.trim().length > 0
    ? rawLevel.trim().toLowerCase()
    : undefined;

  const experienceYears = typeof raw.experienceYears === 'number' ? raw.experienceYears : 0;

  // Remote & Workplace preferences
  const remoteOnly = Boolean(
    raw.hardConstraints?.remoteOnly ?? raw.remoteOnly ?? (raw.remotePreference === 'remote')
  );
  const remotePreference = raw.remotePreference || (remoteOnly ? 'remote' : 'any');
  const workplacePreference = raw.workplacePreference || raw.softPreferences?.preferredWorkplace || 'any';

  // Salary
  const minSalary = typeof raw.minSalary === 'number'
    ? raw.minSalary
    : typeof raw.hardConstraints?.minSalary === 'number'
      ? raw.hardConstraints.minSalary
      : 0;
  const salaryCurrency = raw.salaryCurrency || 'USD';

  // Industries: harmonize preferredIndustries vs industries
  const preferredIndustries: string[] = Array.isArray(raw.preferredIndustries)
    ? raw.preferredIndustries.filter((i: any) => typeof i === 'string' && i.trim().length > 0)
    : Array.isArray(raw.industries)
      ? raw.industries.filter((i: any) => typeof i === 'string' && i.trim().length > 0)
      : [];

  // Constraints
  const hardConstraints = {
    remoteOnly,
    minSalary: typeof raw.hardConstraints?.minSalary === 'number' ? raw.hardConstraints.minSalary : minSalary,
    locations: Array.isArray(raw.hardConstraints?.locations) ? raw.hardConstraints.locations : targetLocations,
    visaRequired: Boolean(raw.hardConstraints?.visaRequired ?? raw.needsVisaSponsorship),
  };

  const softPreferences = {
    preferredIndustries,
    preferredCompanySizes: Array.isArray(raw.softPreferences?.preferredCompanySizes)
      ? raw.softPreferences.preferredCompanySizes
      : [],
    preferredWorkplace: workplacePreference,
  };

  return {
    userId: raw.userId,
    targetRoles,
    roleFamilies,
    targetLocations,
    remotePreference,
    workplacePreference,
    experienceLevel,
    experienceYears,
    minSalary,
    salaryCurrency,
    skills,
    preferredIndustries,
    hardConstraints,
    softPreferences,
  };
}

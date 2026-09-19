/**
 * Candidate Profile Extractor
 *
 * Extracts a structured candidate matching profile from the database.
 * Primary source: JobSearchProfile (canonical model)
 * Fallback: legacy onboardingPreferences/careerPreferences + Master CV
 *
 * Classifies constraints as:
 * - Hard: remoteOnly, minSalary, locations (if explicitly restricted), visa
 * - Soft: targetRoles, skills, workplace preference, industry preference
 */

import { Db, ObjectId } from 'mongodb';
import { resolveRoleFamily } from '@/lib/taxonomy/roleTaxonomy';
import {
  deriveRemoteOnly,
  deriveWorkplacePreference,
  normalizeWorkplaceTypes,
  workplaceLabelToId,
} from '@/lib/jobs/workplace';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CandidateMatchingProfile {
  userId: string;
  targetRoles: string[];
  roleFamilies: string[];           // resolved from targetRoles
  targetLocations: string[];
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  workplacePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  experienceYears: number;
  minSalary: number;
  salaryCurrency: string;
  skills: string[];
  needsVisaSponsorship: boolean;
  preferredIndustries: string[];
  // Hard constraints
  hardConstraints: {
    remoteOnly: boolean;
    minSalary: number;
    locations: string[];
    visaRequired: boolean;
  };
  // Soft preferences
  softPreferences: {
    preferredIndustries: string[];
    preferredCompanySizes: string[];
    preferredWorkplace: string;
  };
}

// ── Extractor ───────────────────────────────────────────────────────────────

/**
 * Extract candidate profile from database.
 * Uses JobSearchProfile as primary source, with legacy fallback.
 */
export async function extractCandidateProfile(db: Db, userId: string): Promise<CandidateMatchingProfile> {
  const usersColl = db.collection('users');
  const cvsColl = db.collection('cvs');
  const profilesColl = db.collection('jobSearchProfiles');

  let userObjId: ObjectId | null = null;
  try {
    userObjId = new ObjectId(userId);
  } catch {
    // string id
  }

  // ── Find user ──────────────────────────────────────────────────────────
  const queryFilters: any[] = [{ email: userId }, { id: userId }];
  if (userObjId) {
    queryFilters.push({ _id: userObjId });
  }

  const user = await usersColl.findOne({ $or: queryFilters });

  // ── Try JobSearchProfile first (canonical) ─────────────────────────────
  let profile: any = null;
  try {
    profile = await profilesColl.findOne({
      $or: [
        { userId: userId },
        { userId: String(user?._id || userId) },
        ...(userObjId ? [{ userId: userObjId }] : []),
      ],
    });
  } catch {
    // Collection might not exist
  }

  // ── Extract skills from Master CV ──────────────────────────────────────
  const cvSkills: string[] = [];
  try {
    const masterCv = await cvsColl.findOne({
      $or: [
        { userId: user?._id || userId, 'metadata.isMaster': true },
        { userId: String(user?._id || userId), isMaster: true },
        { userId: user?._id || userId, isMaster: true },
      ],
    });

    if (masterCv) {
      // Skills section — supports both unified { category, skills[] } and legacy { name, keywords[] }
      const skillsSource = masterCv.cvData?.skills || masterCv.skills || [];
      if (skillsSource && Array.isArray(skillsSource)) {
        for (const s of skillsSource) {
          if (typeof s === 'string') {
            cvSkills.push(s);
          } else if (s?.skills && Array.isArray(s.skills)) {
            // Unified format: { category, skills[] }
            cvSkills.push(...s.skills.filter((item: any) => typeof item === 'string' && item));
          } else if (s?.keywords && Array.isArray(s.keywords)) {
            // Legacy format: { name, keywords[] }
            cvSkills.push(...s.keywords.filter((item: any) => typeof item === 'string' && item));
          } else if (s?.category) {
            cvSkills.push(s.category);
          } else if (s?.name) {
            cvSkills.push(s.name);
          }
        }
      }

      // Also extract from work experience (if available)
      if (masterCv.work && Array.isArray(masterCv.work)) {
        for (const exp of masterCv.work) {
          if (exp.highlights && Array.isArray(exp.highlights)) {
            for (const h of exp.highlights) {
              // Extract tech terms from highlights
              const techTerms = extractTechTerms(h);
              cvSkills.push(...techTerms);
            }
          }
        }
      }
    }
  } catch {
    // CV might not exist
  }

  // ── Build profile from canonical or legacy source ──────────────────────
  if (profile) {
    // Canonical JobSearchProfile
    const targetRoles = profile.targetRoles || [];
    const roleFamilies = targetRoles
      .map((r: string) => resolveRoleFamily(r))
      .filter((f: string | null): f is string => !!f);

    // Workplace preference comes from the full `workplaceTypes` selection,
    // not just the first entry. Legacy label entries stored inside `locations`
    // are migrated into the selection and stripped from the city list.
    const workplaceTypes = normalizeWorkplaceTypes(profile.workplaceTypes);
    const rawLocations = Array.isArray(profile.locations) ? profile.locations : [];
    const targetLocations = rawLocations.filter(
      (l: string) => !workplaceLabelToId((l || '').trim())
    );
    // "Remote only" is a hard constraint when the user's selection is
    // exclusively remote — or when a legacy `remoteOnly: true` flag exists and
    // no explicit workplace selection has been made (the selection wins once
    // the user expresses one).
    const remoteOnly = deriveRemoteOnly(workplaceTypes, profile.remoteOnly === true);
    const workplacePreference = deriveWorkplacePreference(workplaceTypes);

    return {
      userId,
      targetRoles,
      roleFamilies,
      targetLocations,
      remotePreference: remoteOnly ? 'remote' : workplacePreference,
      workplacePreference,
      experienceLevel: mapExperienceLevel(profile.experienceYears),
      experienceYears: profile.experienceYears || 0,
      minSalary: profile.minSalary || 0,
      salaryCurrency: profile.salaryCurrency || 'GBP',
      skills: Array.from(new Set([...cvSkills])),
      needsVisaSponsorship: false,
      preferredIndustries: [],
      hardConstraints: {
        remoteOnly,
        minSalary: profile.minSalary || 0,
        locations: targetLocations,
        visaRequired: false,
      },
      softPreferences: {
        preferredIndustries: [],
        preferredCompanySizes: [],
        preferredWorkplace: remoteOnly ? 'remote' : workplacePreference,
      },
    };
  }

  // ── Fallback: legacy onboardingPreferences ─────────────────────────────
  const onboardingPrefs = user?.onboardingPreferences || user?.careerPreferences || {};

  const targetRoles = onboardingPrefs.targetRoles || (user?.headline ? [user.headline] : ['Software Engineer']);
  const roleFamilies = targetRoles
    .map((r: string) => resolveRoleFamily(r))
    .filter((f: string | null): f is string => !!f);

  return {
    userId,
    targetRoles,
    roleFamilies,
    targetLocations: onboardingPrefs.locations || ['United Kingdom', 'London', 'Remote'],
    remotePreference: onboardingPrefs.workplaceType || 'any',
    workplacePreference: onboardingPrefs.workplaceType || 'any',
    experienceLevel: (onboardingPrefs.seniority || 'mid').toLowerCase(),
    experienceYears: onboardingPrefs.experienceYears || 0,
    minSalary: onboardingPrefs.minSalary || 60000,
    salaryCurrency: onboardingPrefs.currency || 'GBP',
    skills: Array.from(new Set([...cvSkills, ...(onboardingPrefs.skills || [])])),
    needsVisaSponsorship: onboardingPrefs.requiresVisa === true,
    preferredIndustries: onboardingPrefs.industries || [],
    hardConstraints: {
      remoteOnly: onboardingPrefs.remoteOnly === true,
      minSalary: onboardingPrefs.minSalary || 0,
      locations: onboardingPrefs.locations || [],
      visaRequired: onboardingPrefs.requiresVisa === true,
    },
    softPreferences: {
      preferredIndustries: onboardingPrefs.industries || [],
      preferredCompanySizes: onboardingPrefs.companySizes || [],
      preferredWorkplace: onboardingPrefs.workplaceType || 'any',
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapExperienceLevel(years: number): CandidateMatchingProfile['experienceLevel'] {
  if (years <= 2) return 'entry';
  if (years <= 5) return 'mid';
  if (years <= 8) return 'senior';
  if (years <= 12) return 'lead';
  return 'executive';
}

function extractTechTerms(text: string): string[] {
  if (!text) return [];
  const knownTech = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'ruby', 'php',
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'node.js', 'nodejs', 'express',
    'django', 'flask', 'fastapi', 'spring', 'rails',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'git', 'github', 'gitlab',
    'html', 'css', 'sass', 'tailwind',
    'graphql', 'rest', 'api',
    'agile', 'scrum', 'jira',
    'machine learning', 'ml', 'ai', 'tensorflow', 'pytorch',
    'linux', 'bash', 'shell',
    'ci/cd', 'jenkins', 'github actions',
  ];

  const lower = text.toLowerCase();
  return knownTech.filter((tech) => lower.includes(tech));
}

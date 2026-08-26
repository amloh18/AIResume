import { Db, ObjectId } from 'mongodb';

export interface CandidateMatchingProfile {
  userId: string;
  targetRoles: string[];
  targetLocations: string[];
  remotePreference: 'remote' | 'hybrid' | 'on_site' | 'any';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  minSalary?: number;
  salaryCurrency?: string;
  skills: string[];
  needsVisaSponsorship: boolean;
}

export async function extractCandidateProfile(db: Db, userId: string): Promise<CandidateMatchingProfile> {
  const usersColl = db.collection('users');
  const cvsColl = db.collection('cvs');

  let userObjId: ObjectId | null = null;
  try {
    userObjId = new ObjectId(userId);
  } catch {
    // string id
  }

  const queryFilters: any[] = [{ email: userId }, { id: userId }];
  if (userObjId) {
    queryFilters.push({ _id: userObjId });
  }

  const user = await usersColl.findOne({
    $or: queryFilters,
  });

  // Find Master CV
  const masterCv = await cvsColl.findOne({
    $or: [
      { userId: user?._id || userId, 'metadata.isMaster': true },
      { userId: String(user?._id || userId), isMaster: true },
    ],
  });

  // Extract skills from Master CV or user profile
  const cvSkills: string[] = [];
  if (masterCv?.skills && Array.isArray(masterCv.skills)) {
    for (const s of masterCv.skills) {
      if (typeof s === 'string') cvSkills.push(s);
      else if (s?.name) cvSkills.push(s.name);
    }
  }

  const onboardingPrefs = user?.onboardingPreferences || user?.careerPreferences || {};

  return {
    userId,
    targetRoles: onboardingPrefs.targetRoles || (masterCv?.headline ? [masterCv.headline] : ['Software Engineer']),
    targetLocations: onboardingPrefs.locations || ['United Kingdom', 'London', 'Remote'],
    remotePreference: onboardingPrefs.workplaceType || 'any',
    experienceLevel: (onboardingPrefs.seniority || 'mid').toLowerCase(),
    minSalary: onboardingPrefs.minSalary || 60000,
    salaryCurrency: onboardingPrefs.currency || 'GBP',
    skills: Array.from(new Set([...cvSkills, ...(onboardingPrefs.skills || [])])),
    needsVisaSponsorship: onboardingPrefs.requiresVisa === true,
  };
}

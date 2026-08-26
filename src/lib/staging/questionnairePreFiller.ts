export interface CandidatePreFillAnswers {
  fullName: string;
  email: string;
  phone: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  workAuthorization: string;
  requiresSponsorship: boolean;
  expectedSalary?: string;
  noticePeriod?: string;
  location: string;
}

export function extractPreFillAnswers(userProfile: any, masterCv: any): CandidatePreFillAnswers {
  const contact = masterCv?.contactInformation || {};
  const prefs = userProfile?.onboardingPreferences || {};

  return {
    fullName: contact.fullName || userProfile?.name || 'Candidate',
    email: contact.email || userProfile?.email || '',
    phone: contact.phone || '',
    linkedInUrl: contact.linkedIn || contact.socialLinks?.linkedin || '',
    portfolioUrl: contact.website || contact.socialLinks?.portfolio || '',
    githubUrl: contact.socialLinks?.github || '',
    workAuthorization: prefs.workAuthorization || 'Legally authorized to work',
    requiresSponsorship: prefs.requiresVisa === true,
    expectedSalary: prefs.minSalary ? `${prefs.currency || '$'}${prefs.minSalary}` : undefined,
    noticePeriod: prefs.noticePeriod || 'Immediate / 2 weeks',
    location: contact.location || prefs.locations?.[0] || '',
  };
}

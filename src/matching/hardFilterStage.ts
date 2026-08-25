import { CandidateMatchingProfile } from './candidateProfileExtractor';

export function buildHardFilterQuery(profile: CandidateMatchingProfile): Record<string, any> {
  const query: Record<string, any> = {
    status: 'active',
  };

  // 1. Remote filtering
  if (profile.remotePreference === 'remote') {
    query['location.remote'] = true;
  }

  // 2. Visa Sponsorship hard filter
  if (profile.needsVisaSponsorship) {
    query['visaSponsorship.mentioned'] = true;
  }

  return query;
}

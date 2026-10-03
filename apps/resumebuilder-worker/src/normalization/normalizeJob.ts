import crypto from 'crypto';
import { RawJob } from '../sources/base/SourceTypes';
import { NormalizedJob } from '../models/Job';
import { normalizeTitle } from './normalizeTitle';
import { normalizeCompany } from './normalizeCompany';
import { normalizeLocation } from './normalizeLocation';
import { normalizeSalary } from './normalizeSalary';
import { extractNormalizedSkills } from './normalizeSkills';
import { sanitizeDescription } from './sanitizeDescription';
import { SYSTEM_CONSTANTS } from '../config/constants';

export function generateCanonicalId(normalizedCompany: string, normalizedTitle: string, countryCode: string, city: string): string {
  const payload = `${normalizedCompany}::${normalizedTitle}::${countryCode}::${city.toLowerCase()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function normalizeRawJob(raw: RawJob): NormalizedJob {
  // 1. Title & Seniority Level
  const titleRes = normalizeTitle(raw.title);

  // 2. Company & Logo
  const company = normalizeCompany(raw.companyName, raw.url);

  // 3. Location & Remote
  const location = normalizeLocation(raw.locationString, raw.countryCode, raw.isRemote);

  // 4. Description Sanitization
  const descRes = sanitizeDescription(raw.rawHtmlDescription || raw.rawTextDescription || '');

  // 5. Compensation
  const salary = normalizeSalary(raw.salaryText, raw.salaryMin, raw.salaryMax, raw.salaryCurrency, raw.salaryPeriod);

  // 6. Skills
  const skills = extractNormalizedSkills(titleRes.title, descRes.descriptionText);

  // 7. Canonical SHA-256 Fingerprint
  const canonicalId = generateCanonicalId(company.normalizedName, titleRes.normalizedTitle, location.countryCode, location.city);

  const now = new Date();
  const postedAt = raw.postedDate ? new Date(raw.postedDate) : now;

  // 8. Visa Sponsorship Mention Detection
  const descLower = descRes.descriptionText.toLowerCase();
  const visaMentioned =
    descLower.includes('visa sponsorship') ||
    descLower.includes('sponsor visa') ||
    descLower.includes('sponsorship available') ||
    descLower.includes('h-1b') ||
    descLower.includes('tier 2') ||
    descLower.includes('skilled worker visa');

  return {
    canonicalId,
    title: titleRes.title,
    normalizedTitle: titleRes.normalizedTitle,
    company,
    description: descRes.sanitizedHtml,
    descriptionText: descRes.descriptionText,
    source: {
      primary: raw.source,
      sourceJobId: raw.sourceJobId,
      sourceUrl: raw.url,
      applicationUrl: raw.applicationUrl || raw.url,
      discoveredAt: now,
      lastSeenAt: now,
    },
    sources: [
      {
        name: raw.source,
        sourceJobId: raw.sourceJobId,
        url: raw.url,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    ],
    location,
    employmentType: (raw.employmentTypeString as any) || 'full_time',
    experience: {
      minYears: null,
      maxYears: null,
      level: titleRes.level,
    },
    salary,
    skills,
    requirements: [],
    benefits: [],
    visaSponsorship: {
      mentioned: visaMentioned,
      type: null,
    },
    postedAt,
    expiresAt: null,
    status: SYSTEM_CONSTANTS.STATUS.ACTIVE,
    ingestion: {
      firstSeenAt: now,
      lastSeenAt: now,
      lastUpdatedAt: now,
      updateCount: 1,
    },
    search: {
      keywords: skills,
      normalizedLocation: `${location.city} ${location.country}`.toLowerCase(),
      normalizedSkills: skills.map((s) => s.toLowerCase()),
    },
    matching: {
      embeddingId: null,
      indexed: false,
    },
    metadata: {
      rawSource: raw.rawPayload,
      parserVersion: SYSTEM_CONSTANTS.DEFAULT_PARSER_VERSION,
      normalizerVersion: SYSTEM_CONSTANTS.DEFAULT_NORMALIZER_VERSION,
    },
    createdAt: now,
    updatedAt: now,
  };
}

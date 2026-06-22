// @ts-nocheck
/**
 * Sponsorship Verification Service
 * 
 * Verifies if companies are registered sponsors in various countries
 * by querying government-maintained registries.
 */

import { getConnection } from '@/lib/database';
import UKSponsor from '@/models/UKSponsor';
import USH1BEmployer from '@/models/USH1BEmployer';
import { normalizeCompanyName, matchCompany } from '@/lib/utils/company-name-normalizer';

export interface VerificationResult {
  country: string;
  isVerified: boolean;
  verifiedDate: string;
  source: string;
  companyName?: string;
  licenceNumber?: string;
}

export interface VerificationResponse {
  results: VerificationResult[];
}

/**
 * Determines countries from location string
 * @param location - Location string (e.g., "London, UK" or "New York, US")
 * @returns Array of country codes
 */
function determineCountriesFromLocation(location: string): string[] {
  if (!location) return [];

  const locationLower = location.toLowerCase();
  const countries: string[] = [];

  // UK variations
  if (locationLower.includes('uk') || 
      locationLower.includes('united kingdom') || 
      locationLower.includes('london') ||
      locationLower.includes('england') ||
      locationLower.includes('scotland') ||
      locationLower.includes('wales') ||
      locationLower.includes('northern ireland')) {
    countries.push('UK');
  }

  // US variations
  if (locationLower.includes('us') || 
      locationLower.includes('usa') || 
      locationLower.includes('united states') ||
      locationLower.includes('america')) {
    countries.push('US');
  }

  // Canada
  if (locationLower.includes('canada') || 
      locationLower.includes('ca') ||
      locationLower.includes('toronto') ||
      locationLower.includes('vancouver')) {
    countries.push('CA');
  }

  // Australia
  if (locationLower.includes('australia') || 
      locationLower.includes('au') ||
      locationLower.includes('sydney') ||
      locationLower.includes('melbourne')) {
    countries.push('AU');
  }

  // If no specific country found, check common ones
  if (countries.length === 0) {
    // Default to UK and US for broader coverage
    countries.push('UK', 'US');
  }

  return countries;
}

/**
 * Verifies company sponsorship in UK
 * @param companyName - Company name to verify
 * @returns Verification result or null
 */
async function verifyUK(companyName: string): Promise<VerificationResult | null> {
  try {
    await getConnection();
    const normalized = normalizeCompanyName(companyName);

    // Try exact match first
    let match = await UKSponsor.findOne({
      normalizedName: normalized,
      status: 'Active'
    }).lean();

    if (match) {
      return {
        country: 'UK',
        isVerified: true,
        verifiedDate: new Date().toISOString(),
        source: 'uk-gov-register',
        companyName: match.companyName,
        licenceNumber: match.licenceNumber
      };
    }

    // Try partial match (contains)
    match = await UKSponsor.findOne({
      normalizedName: { $regex: normalized, $options: 'i' },
      status: 'Active'
    }).lean();

    if (match) {
      return {
        country: 'UK',
        isVerified: true,
        verifiedDate: new Date().toISOString(),
        source: 'uk-gov-register',
        companyName: match.companyName,
        licenceNumber: match.licenceNumber
      };
    }

    // Try fuzzy matching on active sponsors starting with the same prefix
    if (normalized.length >= 2) {
      const prefix = normalized.substring(0, 2);
      const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const activeSponsors = await UKSponsor.find({
        normalizedName: { $regex: '^' + escapedPrefix, $options: 'i' },
        status: 'Active'
      }).limit(500).lean();

      for (const sponsor of activeSponsors) {
        if (matchCompany(companyName, sponsor.companyName, 0.85)) {
          return {
            country: 'UK',
            isVerified: true,
            verifiedDate: new Date().toISOString(),
            source: 'uk-gov-register',
            companyName: sponsor.companyName,
            licenceNumber: sponsor.licenceNumber
          };
        }
      }
    }

    // Not found
    return {
      country: 'UK',
      isVerified: false,
      verifiedDate: new Date().toISOString(),
      source: 'uk-gov-register'
    };
  } catch (error) {
    console.error('Error verifying UK sponsorship:', error);
    return {
      country: 'UK',
      isVerified: false,
      verifiedDate: new Date().toISOString(),
      source: 'uk-gov-register'
    };
  }
}

/**
 * Verifies company sponsorship in US (H-1B)
 * @param companyName - Company name to verify
 * @returns Verification result or null
 */
async function verifyUS(companyName: string): Promise<VerificationResult | null> {
  try {
    await getConnection();
    const normalized = normalizeCompanyName(companyName);
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 3; // Consider companies that filed in last 3 years

    // Try exact match first
    let match = await USH1BEmployer.findOne({
      normalizedName: normalized,
      lastFiledYear: { $gte: minYear }
    }).lean();

    if (match) {
      return {
        country: 'US',
        isVerified: true,
        verifiedDate: new Date().toISOString(),
        source: 'us-dol-h1b',
        companyName: match.employerName
      };
    }

    // Try partial match
    match = await USH1BEmployer.findOne({
      normalizedName: { $regex: normalized, $options: 'i' },
      lastFiledYear: { $gte: minYear }
    }).lean();

    if (match) {
      return {
        country: 'US',
        isVerified: true,
        verifiedDate: new Date().toISOString(),
        source: 'us-dol-h1b',
        companyName: match.employerName
      };
    }

    // Try fuzzy matching on recent employers starting with the same prefix
    if (normalized.length >= 2) {
      const prefix = normalized.substring(0, 2);
      const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const recentEmployers = await USH1BEmployer.find({
        normalizedName: { $regex: '^' + escapedPrefix, $options: 'i' },
        lastFiledYear: { $gte: minYear }
      }).limit(500).lean();

      for (const employer of recentEmployers) {
        if (matchCompany(companyName, employer.employerName, 0.85)) {
          return {
            country: 'US',
            isVerified: true,
            verifiedDate: new Date().toISOString(),
            source: 'us-dol-h1b',
            companyName: employer.employerName
          };
        }
      }
    }

    // Not found
    return {
      country: 'US',
      isVerified: false,
      verifiedDate: new Date().toISOString(),
      source: 'us-dol-h1b'
    };
  } catch (error) {
    console.error('Error verifying US sponsorship:', error);
    return {
      country: 'US',
      isVerified: false,
      verifiedDate: new Date().toISOString(),
      source: 'us-dol-h1b'
    };
  }
}

/**
 * Verifies company sponsorship in Canada
 * @param companyName - Company name to verify
 * @returns Verification result or null
 */
async function verifyCanada(companyName: string): Promise<VerificationResult | null> {
  // TODO: Implement when Canada registry data is available
  return {
    country: 'CA',
    isVerified: false,
    verifiedDate: new Date().toISOString(),
    source: 'ca-ircc-registry'
  };
}

/**
 * Verifies company sponsorship in Australia
 * @param companyName - Company name to verify
 * @returns Verification result or null
 */
async function verifyAustralia(companyName: string): Promise<VerificationResult | null> {
  // TODO: Implement when Australia registry data is available
  return {
    country: 'AU',
    isVerified: false,
    verifiedDate: new Date().toISOString(),
    source: 'au-home-affairs-registry'
  };
}

/**
 * Main verification function
 * @param company - Company name
 * @param location - Location string
 * @returns Verification response with results for all relevant countries
 */
export async function verifySponsorship(
  company: string,
  location?: string
): Promise<VerificationResponse> {
  if (!company) {
    return { results: [] };
  }

  const countries = location 
    ? determineCountriesFromLocation(location)
    : ['UK', 'US']; // Default to UK and US if no location provided

  const results: VerificationResult[] = [];

  for (const country of countries) {
    let verification: VerificationResult | null = null;

    switch (country) {
      case 'UK':
        verification = await verifyUK(company);
        break;
      case 'US':
        verification = await verifyUS(company);
        break;
      case 'CA':
        verification = await verifyCanada(company);
        break;
      case 'AU':
        verification = await verifyAustralia(company);
        break;
    }

    if (verification) {
      results.push(verification);
    }
  }

  return { results };
}




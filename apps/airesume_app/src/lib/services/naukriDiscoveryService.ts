import { ObjectId } from 'mongodb';
import type { DiscoveredJob } from '@/lib/services/jobDiscoveryService';

export interface NaukriSearchParams {
  keywords?: string[];
  location?: string;
  experienceYears?: number;
  limit?: number;
  page?: number;
  remoteOnly?: boolean;
}

export interface NaukriRawJob {
  jobId: string;
  title: string;
  companyName: string;
  companyId?: string;
  placeholders?: Array<{ type: string; label: string }>;
  jobDescription?: string;
  tagsAndSkills?: string[];
  jdURL?: string;
  staticUrl?: string;
  logoPath?: string;
  createdDate?: number | string;
  footerPlaceholderLabel?: string;
}

/**
 * Parses Indian salary strings into numeric min/max values
 * Examples: "12-18 Lacs PA", "5-8 LPA", "Not Disclosed", "1,200,000 - 1,800,000 INR"
 */
export function parseNaukriSalary(salaryRaw?: string): {
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
} {
  if (!salaryRaw || /not disclosed|unspecified|competitive/i.test(salaryRaw)) {
    return { salaryCurrency: 'INR' };
  }

  // Check for Lacs / LPA (e.g. "12-18 Lacs PA", "10 - 15.5 LPA")
  const lacsMatch = salaryRaw.match(/([\d\.]+)\s*(?:-|to)\s*([\d\.]+)\s*(?:lacs|lakhs|lpa)/i);
  if (lacsMatch) {
    const minLacs = parseFloat(lacsMatch[1]);
    const maxLacs = parseFloat(lacsMatch[2]);
    return {
      salaryMin: Math.round(minLacs * 100000),
      salaryMax: Math.round(maxLacs * 100000),
      salaryCurrency: 'INR',
    };
  }

  // Single Lacs value (e.g. "15 Lacs PA")
  const singleLacsMatch = salaryRaw.match(/([\d\.]+)\s*(?:lacs|lakhs|lpa)/i);
  if (singleLacsMatch) {
    const lacs = parseFloat(singleLacsMatch[1]);
    return {
      salaryMin: Math.round(lacs * 100000),
      salaryMax: Math.round(lacs * 100000),
      salaryCurrency: 'INR',
    };
  }

  // Clean raw digits if format is direct numeric (e.g. 500000 - 800000)
  const numericRange = salaryRaw.replace(/,/g, '').match(/(\d{5,9})\s*(?:-|to)\s*(\d{5,9})/);
  if (numericRange) {
    return {
      salaryMin: parseInt(numericRange[1], 10),
      salaryMax: parseInt(numericRange[2], 10),
      salaryCurrency: 'INR',
    };
  }

  return { salaryCurrency: 'INR' };
}

/**
 * Service to search and ingest real-time jobs from Naukri.com
 */
export class NaukriDiscoveryService {
  private static BASE_URL = 'https://www.naukri.com/jobapi/v3/search';

  private static DEFAULT_HEADERS = {
    'appid': '109',
    'systemid': '109',
    'clientid': 'd3eb4292b02a',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'accept': 'application/json',
    'accept-language': 'en-US,en;q=0.9',
    'referer': 'https://www.naukri.com/',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };

  /**
   * Search jobs from Naukri gateway
   */
  public static async searchJobs(params: NaukriSearchParams = {}): Promise<DiscoveredJob[]> {
    const keywordStr = (params.keywords && params.keywords.length > 0)
      ? params.keywords.join(', ')
      : 'software engineer, developer, full stack, frontend, backend';

    const locationStr = params.remoteOnly
      ? 'remote'
      : (params.location || 'india');

    const limit = Math.min(params.limit || 20, 50);
    const pageNo = params.page || 1;

    const queryParams = new URLSearchParams({
      noOfResults: limit.toString(),
      urlType: 'search_by_keyword',
      searchType: 'adv',
      keyword: keywordStr,
      location: locationStr,
      pageNo: pageNo.toString(),
      sort: 'f', // Sort by date / freshness
    });

    if (params.experienceYears !== undefined && params.experienceYears >= 0) {
      queryParams.set('experience', params.experienceYears.toString());
    }

    try {
      const url = `${this.BASE_URL}?${queryParams.toString()}`;
      const response = await fetch(url, {
        headers: this.DEFAULT_HEADERS,
        next: { revalidate: 300 }, // Cache response for 5 minutes
      });

      if (!response.ok) {
        console.warn(`[NaukriDiscovery] Gateway returned HTTP ${response.status}`);
        return [];
      }

      const data = await response.json();
      const jobDetails: NaukriRawJob[] = data.jobDetails || [];

      return jobDetails.map((rawJob) => this.normalizeNaukriJob(rawJob));
    } catch (error: any) {
      console.error('[NaukriDiscovery] Error fetching Naukri jobs:', error.message || error);
      return [];
    }
  }

  /**
   * Normalize raw Naukri job response into standard DiscoveredJob structure
   */
  public static normalizeNaukriJob(raw: NaukriRawJob): DiscoveredJob {
    const locationObj = raw.placeholders?.find((p) => p.type === 'location');
    const location = locationObj?.label || 'India';

    const salaryObj = raw.placeholders?.find((p) => p.type === 'salary');
    const salaryRaw = salaryObj?.label || 'Not Disclosed';
    const { salaryMin, salaryMax, salaryCurrency } = parseNaukriSalary(salaryRaw);

    const isRemote = Boolean(
      location.toLowerCase().includes('remote') ||
      location.toLowerCase().includes('hybrid') ||
      (raw.title && raw.title.toLowerCase().includes('remote'))
    );

    // Construct full URL
    let fullApplyUrl = 'https://www.naukri.com';
    if (raw.staticUrl) {
      fullApplyUrl = raw.staticUrl.startsWith('http')
        ? raw.staticUrl
        : `https://www.naukri.com${raw.staticUrl.startsWith('/') ? '' : '/'}${raw.staticUrl}`;
    } else if (raw.jdURL) {
      fullApplyUrl = raw.jdURL.startsWith('http')
        ? raw.jdURL
        : `https://www.naukri.com${raw.jdURL.startsWith('/') ? '' : '/'}${raw.jdURL}`;
    }

    // Clean description HTML
    const cleanDescription = (raw.jobDescription || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      _id: new ObjectId(),
      externalId: `naukri_${raw.jobId || Math.random().toString(36).substring(2, 9)}`,
      title: raw.title || 'Software Engineer',
      company: raw.companyName || 'Confidential Employer',
      location,
      country: 'India',
      remote: isRemote,
      salaryMin,
      salaryMax,
      salaryCurrency,
      description: cleanDescription || `Job opening for ${raw.title} at ${raw.companyName}.`,
      applyUrl: fullApplyUrl,
      source: 'naukri' as any,
      atsType: 'naukri' as any,
      keywords: raw.tagsAndSkills || [],
      createdAt: new Date(),
      postedDate: raw.createdDate ? new Date(raw.createdDate) : new Date(),
    };
  }
}

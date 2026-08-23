import { ObjectId } from 'mongodb';
import type { DiscoveredJob } from '@/lib/services/jobDiscoveryService';

export interface AdzunaRawJob {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  description?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: number;
  redirect_url?: string;
  created?: string;
  category?: { label?: string; tag?: string };
}

export class AdzunaDiscoveryService {
  /**
   * Search Adzuna free job index for given criteria
   */
  public static async searchJobs(params: {
    keywords?: string[];
    location?: string;
    region?: 'UK' | 'India' | 'US' | 'Global';
    page?: number;
    limit?: number;
    appId?: string;
    appKey?: string;
  }): Promise<{ jobs: DiscoveredJob[]; total: number }> {
    const {
      keywords = ['Software Engineer'],
      location = '',
      region = 'UK',
      page = 1,
      limit = 20,
      appId = process.env.ADZUNA_APP_ID || 'demo_app_id',
      appKey = process.env.ADZUNA_APP_KEY || 'demo_app_key',
    } = params;

    let countryCode = 'gb';
    let countryName = 'UK';
    let currency = 'GBP';

    if (region === 'India' || location.toLowerCase().includes('india') || location.toLowerCase().includes('bangalore')) {
      countryCode = 'in';
      countryName = 'India';
      currency = 'INR';
    } else if (region === 'US' || location.toLowerCase().includes('united states') || location.toLowerCase().includes('us')) {
      countryCode = 'us';
      countryName = 'United States';
      currency = 'USD';
    }

    const queryStr = keywords.join(' ');

    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=${limit}&what=${encodeURIComponent(queryStr)}&where=${encodeURIComponent(location)}&content-type=application/json`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MorigridAI-JobSearch/1.0',
        },
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        return { jobs: this.getFallbackJobs(queryStr, location, countryName, currency), total: 15 };
      }

      const json = await res.json();
      const results: AdzunaRawJob[] = json.results || [];

      if (!results || results.length === 0) {
        return { jobs: this.getFallbackJobs(queryStr, location, countryName, currency), total: 15 };
      }

      const jobs = results.map((raw) => this.normalizeJob(raw, countryName, currency));
      return { jobs, total: json.count || jobs.length };
    } catch (error) {
      console.warn('Adzuna API query failed, returning fallback roles:', error);
      return { jobs: this.getFallbackJobs(queryStr, location, countryName, currency), total: 15 };
    }
  }

  public static normalizeJob(
    raw: AdzunaRawJob,
    countryName: string,
    currency: string
  ): DiscoveredJob {
    const title = raw.title?.replace(/<[^>]*>/g, '').trim() || 'Software Engineer';
    const company = raw.company?.display_name || 'Hiring Tech Employer';
    const location = raw.location?.display_name || countryName;

    const isRemote = Boolean(
      location.toLowerCase().includes('remote') ||
      title.toLowerCase().includes('remote') ||
      (raw.description && raw.description.toLowerCase().includes('remote'))
    );

    const cleanDescription = (raw.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      _id: new ObjectId(),
      externalId: `adzuna_${raw.id || Math.random().toString(36).substring(2, 9)}`,
      title,
      company,
      location,
      country: countryName,
      remote: isRemote,
      salaryMin: raw.salary_min ? Math.round(raw.salary_min) : undefined,
      salaryMax: raw.salary_max ? Math.round(raw.salary_max) : undefined,
      salaryCurrency: currency,
      description: cleanDescription || `Job opening for ${title} at ${company}.`,
      applyUrl: raw.redirect_url || 'https://www.adzuna.com',
      source: 'adzuna' as any,
      atsType: 'adzuna' as any,
      postedAt: raw.created ? new Date(raw.created) : new Date(),
      createdAt: new Date(),
      status: 'active',
      keywords: [title, company],
    };
  }

  private static getFallbackJobs(
    query: string,
    location: string,
    countryName: string,
    currency: string
  ): DiscoveredJob[] {
    // Return empty array instead of mock data - real jobs should come from the Adzuna API
    return [];
  }
}

/**
 * Portal Fetcher Service - Fetches jobs from external APIs
 * 
 * Sources:
 * - Apify LinkedIn Jobs
 * - Apify Indeed Jobs  
 * - SerpAPI Google Jobs
 * - Direct ATS APIs (Greenhouse, Lever, Workable)
 */

import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import QuotaService, { PlanType } from './quota-service';

export interface JobSearchCriteria {
  keywords: string[];
  location?: string;
  region?: 'UK' | 'India';
  remoteOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface JobListing {
  id: string;
  source: 'linkedin' | 'indeed' | 'glassdoor' | 'google' | 'greenhouse' | 'lever' | 'workday';
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  jobUrl: string;
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  remote?: boolean;
  atsType?: 'greenhouse' | 'lever' | 'workable' | 'unknown';
  postedDate?: Date;
  matchScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB model for cached jobs
export interface IExternalJob extends mongoose.Document {
  externalId: string;
  source: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  jobUrl: string;
  salary?: any;
  remote?: boolean;
  atsType?: string;
  postedDate?: Date;
  fetchedAt: Date;
  expiresAt: Date;
  // For user-specific matching
  matchScore?: number;
  updatedAt?: Date;
}

const ExternalJobSchema = new mongoose.Schema<IExternalJob>({
  externalId: { type: String, required: true },
  source: { type: String, required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  companyLogo: String,
  location: String,
  description: String,
  jobUrl: String,
  salary: mongoose.Schema.Types.Mixed,
  remote: Boolean,
  atsType: String,
  postedDate: Date,
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
  matchScore: Number,
}, { timestamps: true });

ExternalJobSchema.index({ externalId: 1, source: 1 }, { unique: true });
ExternalJobSchema.index({ fetchedAt: 1 });

let ExternalJobModel: mongoose.Model<IExternalJob>;

async function getExternalJobModel() {
  if (!ExternalJobModel) {
    await getConnection();
    ExternalJobModel = mongoose.models.ExternalJob || 
      mongoose.model<IExternalJob>('ExternalJob', ExternalJobSchema);
  }
  return ExternalJobModel;
}

// External API rate limits
const EXTERNAL_RATE_LIMITS = {
  apify: { requestsPerMinute: 30, requestsPerHour: 1000 },
  serpapi: { requestsPerMinute: 60, requestsPerHour: 2000 },
  greenhouse: { requestsPerMinute: 100, requestsPerHour: 5000 },
  lever: { requestsPerMinute: 60, requestsPerHour: 3000 },
};

// In-memory rate limiting (would use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

class PortalFetcherService {
  /**
   * Main method to fetch jobs from all sources
   */
  static async fetchJobs(
    criteria: JobSearchCriteria,
    userId: string,
    planType: PlanType = 'free'
  ): Promise<JobListing[]> {
    // Check quota first
    const quotaCheck = await QuotaService.checkJobsFetchQuota(userId, planType);
    if (!quotaCheck.allowed) {
      throw new Error(`Jobs fetch quota exceeded: ${quotaCheck.reason}`);
    }

    const jobs: JobListing[] = [];
    const errors: string[] = [];

    // Fetch from each source in parallel (respecting rate limits)
    const fetchPromises = [
      this.fetchFromApify(criteria, 'linkedin').catch(e => errors.push(`LinkedIn: ${e.message}`)),
      this.fetchFromApify(criteria, 'indeed').catch(e => errors.push(`Indeed: ${e.message}`)),
      this.fetchFromSerpAPI(criteria).catch(e => errors.push(`SerpAPI: ${e.message}`)),
    ];

    const results = await Promise.allSettled(fetchPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        jobs.push(...result.value);
      }
    }

    // Save to cache and update quota
    if (jobs.length > 0) {
      await this.saveToCache(jobs);
      await QuotaService.incrementJobsFetched(userId);
    }

    // Remove duplicates
    const uniqueJobs = this.deduplicateJobs(jobs);

    return uniqueJobs;
  }

  /**
   * Fetch jobs from Apify API
   */
  private static async fetchFromApify(
    criteria: JobSearchCriteria,
    source: 'linkedin' | 'indeed'
  ): Promise<JobListing[]> {
    // Check rate limit
    if (!await this.checkRateLimit('apify')) {
      console.log('Apify rate limited, skipping...');
      return [];
    }

    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      throw new Error('APIFY_API_KEY not configured');
    }

    const actId = source === 'linkedin' 
      ? 'apify/linkedin-jobs-scraper'
      : 'apify/indeed-jobs-scraper';

    const location = criteria.region === 'India' 
      ? `${criteria.location || 'India'}, India`
      : `${criteria.location || 'UK'}, UK`;

    const response = await fetch(`https://api.apify.com/v2/acts/${actId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Apify token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location,
        searchTerm: criteria.keywords.join(' '),
        maxJobs: criteria.limit || 50,
        ...(criteria.remoteOnly && { remote: 'true' }),
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Wait for job to complete and get results
    const jobResult = await this.waitForApifyJob(data.id, apiKey);
    
    return this.normalizeJobs(jobResult, source);
  }

  /**
   * Fetch jobs from SerpAPI (Google Jobs)
   */
  private static async fetchFromSerpAPI(criteria: JobSearchCriteria): Promise<JobListing[]> {
    if (!await this.checkRateLimit('serpapi')) {
      console.log('SerpAPI rate limited, skipping...');
      return [];
    }

    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      throw new Error('SERPAPI_KEY not configured');
    }

    const location = criteria.region === 'India'
      ? `${criteria.location || 'India'}, India`
      : `${criteria.location || 'United Kingdom'}, UK`;

    const params = new URLSearchParams({
      q: criteria.keywords.join(' '),
      location,
      api_key: apiKey,
      engine: 'google_jobs',
      num: (criteria.limit || 50).toString(),
    });

    const response = await fetch(`https://serpapi.com/search.json?${params}`);
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    
    return this.normalizeSerpJobs(data.jobs_results || []);
  }

  /**
   * Wait for Apify job to complete
   */
  private static async waitForApifyJob(jobId: string, apiKey: string, maxWaitMs = 60000): Promise<any[]> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const response = await fetch(`https://api.apify.com/v2/acts/${jobId}/runs`, {
        headers: { 'Authorization': `Apify token ${apiKey}` },
      });
      
      const data = await response.json();
      
      if (data.status === 'SUCCEEDED') {
        // Get the output
        const outputResponse = await fetch(`https://api.apify.com/v2/acts/${jobId}/runs/latest/output`, {
          headers: { 'Authorization': `Apify token ${apiKey}` },
        });
        const output = await outputResponse.json();
        return output || [];
      } else if (data.status === 'FAILED') {
        throw new Error('Apify job failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return [];
  }

  /**
   * Normalize jobs from different sources to unified format
   */
  private static normalizeJobs(jobs: any[], source: string): JobListing[] {
    return jobs.map(job => ({
      id: `${source}-${job.id || job.jobId || Math.random().toString(36)}`,
      source: source as JobListing['source'],
      title: job.title || job.position || 'Unknown Title',
      company: job.company || job.companyName || 'Unknown Company',
      companyLogo: job.companyLogo,
      location: job.location || job.city || '',
      description: job.description || job.summary || '',
      jobUrl: job.url || job.jobUrl || job.link || '',
      salary: job.salary ? {
        min: typeof job.salary === 'string' ? undefined : job.salary.min,
        max: typeof job.salary === 'string' ? undefined : job.salary.max,
        currency: job.salaryCurrency || 'USD',
        period: job.salaryPeriod || 'yearly',
      } : undefined,
      remote: job.remote || job.workFromHome || false,
      atsType: this.detectATS(job.url || ''),
      postedDate: job.postedDate ? new Date(job.postedDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Normalize SerpAPI jobs
   */
  private static normalizeSerpJobs(jobs: any[]): JobListing[] {
    return jobs.map((job, index) => ({
      id: `google-${index}-${Date.now()}`,
      source: 'google' as const,
      title: job.title || 'Unknown Title',
      company: job.company_name || 'Unknown Company',
      companyLogo: job.thumbnail,
      location: job.location || '',
      description: job.description || '',
      jobUrl: job.link || job.url || '',
      remote: job.detected_extensions?.from_home === true,
      atsType: this.detectATS(job.link || ''),
      postedDate: job.detected_extensions?.posted_at ? new Date(job.detected_extensions.posted_at) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Detect ATS type from job URL
   */
  private static detectATS(url: string): JobListing['atsType'] {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('greenhouse')) return 'greenhouse';
    if (urlLower.includes('lever')) return 'lever';
    if (urlLower.includes('workday') || urlLower.includes('myworkday')) return 'workable';
    return 'unknown';
  }

  /**
   * Check and update rate limit for external API
   */
  private static async checkRateLimit(provider: keyof typeof EXTERNAL_RATE_LIMITS): Promise<boolean> {
    const limits = EXTERNAL_RATE_LIMITS[provider];
    const now = Date.now();
    const key = `ratelimit:${provider}`;
    
    const existing = rateLimitStore.get(key);
    
    if (!existing || now >= existing.resetTime) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + 3600000, // 1 hour
      });
      return true;
    }
    
    if (existing.count >= limits.requestsPerHour) {
      return false;
    }
    
    existing.count++;
    return true;
  }

  /**
   * Save jobs to cache
   */
  private static async saveToCache(jobs: JobListing[]): Promise<void> {
    const model = await getExternalJobModel();
    
    const ops = jobs.map(job => ({
      updateOne: {
        filter: { externalId: job.id, source: job.source },
        update: {
          $set: {
            ...job,
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        upsert: true,
      },
    }));
    
    if (ops.length > 0) {
      await model.bulkWrite(ops);
    }
  }

  /**
   * Remove duplicate jobs based on URL
   */
  private static deduplicateJobs(jobs: JobListing[]): JobListing[] {
    const seen = new Set<string>();
    return jobs.filter(job => {
      const key = job.jobUrl || job.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get cached jobs (fallback)
   */
  static async getCachedJobs(criteria: JobSearchCriteria): Promise<JobListing[]> {
    const model = await getExternalJobModel();
    
    const query: any = {
      expiresAt: { $gt: new Date() },
    };
    
    if (criteria.location) {
      query.location = { $regex: criteria.location, $options: 'i' };
    }
    
    const jobs = await model.find(query)
      .sort({ fetchedAt: -1 })
      .limit(criteria.limit || 50)
      .lean();
    
    return jobs.map(job => ({
      id: job._id.toString(),
      source: job.source as JobListing['source'],
      title: job.title,
      company: job.company,
      companyLogo: job.companyLogo,
      location: job.location || '',
      description: job.description || '',
      jobUrl: job.jobUrl || '',
      salary: job.salary,
      remote: job.remote,
      atsType: job.atsType as JobListing['atsType'],
      postedDate: job.postedDate,
      createdAt: job.fetchedAt,
      updatedAt: job.fetchedAt,
    }));
  }
}

export default PortalFetcherService;

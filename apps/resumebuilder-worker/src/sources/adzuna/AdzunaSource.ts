import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class AdzunaSource implements JobSource {
  readonly name = 'adzuna';
  readonly displayName = 'Adzuna Search API';
  readonly type = 'api' as const;

  async healthCheck(): Promise<HealthResult> {
    if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
      return {
        healthy: false,
        status: 'degraded',
        latencyMs: 0,
        message: 'Adzuna API credentials not configured in environment',
      };
    }

    const start = Date.now();
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${env.ADZUNA_APP_ID}&app_key=${env.ADZUNA_APP_KEY}&results_per_page=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const latencyMs = Date.now() - start;
      return {
        healthy: res.ok,
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs,
        statusCode: res.status,
        message: res.ok ? 'Adzuna API connected' : `Adzuna HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        healthy: false,
        status: 'failing',
        latencyMs: Date.now() - start,
        message: err.message,
      };
    }
  }

  async *fetchJobs(options?: FetchOptions): AsyncGenerator<RawJob[], void, unknown> {
    if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
      logger.warn('Adzuna fetch skipped: missing credentials');
      return;
    }

    const countries = ['gb', 'us', 'in'];
    const limit = options?.limit || 2000;
    let totalYielded = 0;

    for (const country of countries) {
      if (totalYielded >= limit) break;

      for (let page = 1; page <= 5; page++) {
        if (totalYielded >= limit) break;

        try {
          const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${env.ADZUNA_APP_ID}&app_key=${env.ADZUNA_APP_KEY}&results_per_page=50&content-type=application/json`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'BuildAIResume-Ingestion/1.0' },
            signal: options?.signal || AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            logger.warn(`Adzuna ${country} page ${page} failed with HTTP ${res.status}`);
            break;
          }

          const data: any = await res.json();
          const results: any[] = data.results || [];
          if (!Array.isArray(results) || results.length === 0) break;

          const batch: RawJob[] = results.map((job) => ({
            source: 'adzuna',
            sourceJobId: String(job.id),
            url: job.redirect_url,
            title: job.title?.replace(/<\/?[^>]+(>|$)/g, '') || 'Untitled Role',
            companyName: job.company?.display_name || 'Unknown Employer',
            rawHtmlDescription: job.description || '',
            rawTextDescription: job.description?.replace(/<\/?[^>]+(>|$)/g, '') || '',
            locationString: job.location?.display_name || '',
            countryCode: country.toUpperCase(),
            salaryMin: job.salary_min,
            salaryMax: job.salary_max,
            salaryPeriod: 'year',
            isRemote:
              job.title?.toLowerCase().includes('remote') ||
              job.description?.toLowerCase().includes('remote') ||
              false,
            postedDate: job.created ? new Date(job.created) : new Date(),
            applicationUrl: job.redirect_url,
            department: job.category?.label,
            employmentTypeString: job.contract_time === 'full_time' ? 'full_time' : 'part_time',
            rawPayload: job,
          }));

          totalYielded += batch.length;
          yield batch;
        } catch (err: any) {
          logger.error(`Error in Adzuna fetch (${country} page ${page}):`, err);
          break;
        }
      }
    }
  }

  getRateLimit(): RateLimitConfig {
    return {
      requestsPerMinute: 30,
      concurrency: 2,
      timeoutMs: 15000,
      retryCount: 3,
    };
  }

  getDefaultSchedule(): SourceScheduleConfig {
    return {
      frequencyMinutes: 60,
    };
  }
}

import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
import { logger } from '../../utils/logger';

export class RemotiveSource implements JobSource {
  readonly name = 'remotive';
  readonly displayName = 'Remotive Remote Jobs API';
  readonly type = 'api' as const;

  async healthCheck(): Promise<HealthResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://remotive.com/api/remote-jobs?limit=1', {
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - start;
      return {
        healthy: res.ok,
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs,
        statusCode: res.status,
        message: res.ok ? 'Remotive API reachable' : `HTTP ${res.status}`,
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
    try {
      const limit = options?.limit || 2000;
      const url = `https://remotive.com/api/remote-jobs?limit=${limit}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BuildAIResume-Ingestion/1.0' },
        signal: options?.signal || AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        logger.error(`Remotive API responded with HTTP ${res.status}`);
        return;
      }

      const data: any = await res.json();
      const jobs: any[] = data.jobs || [];
      if (!Array.isArray(jobs) || jobs.length === 0) return;

      // Yield in chunks of 200
      const chunkSize = 200;
      for (let i = 0; i < jobs.length; i += chunkSize) {
        const chunk = jobs.slice(i, i + chunkSize);
        const batch: RawJob[] = chunk.map((job) => ({
          source: 'remotive',
          sourceJobId: String(job.id),
          url: job.url,
          title: job.title || 'Untitled Role',
          companyName: job.company_name || 'Unknown Employer',
          rawHtmlDescription: job.description || '',
          rawTextDescription: job.description?.replace(/<\/?[^>]+(>|$)/g, '') || '',
          locationString: job.candidate_required_location || 'Worldwide',
          isRemote: true,
          postedDate: job.publication_date ? new Date(job.publication_date) : new Date(),
          salaryText: job.salary,
          applicationUrl: job.url,
          department: job.category,
          employmentTypeString: job.job_type,
          rawPayload: job,
        }));

        yield batch;
      }
    } catch (err: any) {
      logger.error('Error fetching jobs from Remotive API:', err);
    }
  }

  getRateLimit(): RateLimitConfig {
    return {
      requestsPerMinute: 20,
      concurrency: 2,
      timeoutMs: 30000,
      retryCount: 3,
    };
  }

  getDefaultSchedule(): SourceScheduleConfig {
    return {
      frequencyMinutes: 60,
    };
  }
}

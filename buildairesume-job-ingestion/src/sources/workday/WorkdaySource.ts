import { JobSource } from '../base/JobSource';
import { RawJob, FetchOptions, HealthResult, RateLimitConfig, SourceScheduleConfig } from '../base/SourceTypes';
import { logger } from '../../utils/logger';

const WORKDAY_TENANTS: Array<{ tenant: string; site: string; name: string }> = [
  { tenant: 'nvidia', site: 'NVIDIAExternalCareerSite', name: 'NVIDIA' },
  { tenant: 'salesforce', site: 'External_Career_Site', name: 'Salesforce' },
  { tenant: 'adobe', site: 'external_experienced', name: 'Adobe' },
];

export class WorkdaySource implements JobSource {
  readonly name = 'workday';
  readonly displayName = 'Workday ATS';
  readonly type = 'ats' as const;

  async healthCheck(): Promise<HealthResult> {
    const start = Date.now();
    try {
      const res = await fetch('https://nvidia.wd3.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' }),
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - start;
      return {
        healthy: res.ok,
        status: res.ok ? 'healthy' : 'degraded',
        latencyMs,
        statusCode: res.status,
        message: res.ok ? 'Workday API reachable' : `HTTP ${res.status}`,
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
    const limit = options?.limit || 5000;
    let totalYielded = 0;

    for (const tenant of WORKDAY_TENANTS) {
      if (totalYielded >= limit) break;

      try {
        const url = `https://${tenant.tenant}.wd3.myworkdayjobs.com/wday/cxs/${tenant.tenant}/${tenant.site}/jobs`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BuildAIResume-Ingestion/1.0',
          },
          body: JSON.stringify({
            appliedFacets: {},
            limit: 20,
            offset: 0,
            searchText: '',
          }),
          signal: options?.signal || AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          logger.warn(`Workday tenant fetch skipped: ${tenant.name} (HTTP ${res.status})`);
          continue;
        }

        const data: any = await res.json();
        const rawJobsList: any[] = data.jobPostings || [];
        if (!Array.isArray(rawJobsList) || rawJobsList.length === 0) continue;

        const batch: RawJob[] = rawJobsList.map((job) => {
          const isRemote =
            job.locationsText?.toLowerCase().includes('remote') ||
            job.title?.toLowerCase().includes('remote') ||
            false;

          const externalPath = job.externalPath || '';
          const applyUrl = `https://${tenant.tenant}.wd3.myworkdayjobs.com/en-US/${tenant.tenant}/${tenant.site}${externalPath}`;

          return {
            source: 'workday',
            sourceJobId: job.bulletFields?.[0] || String(job.externalPath || job.title),
            url: applyUrl,
            title: job.title || 'Untitled Role',
            companyName: tenant.name,
            locationString: job.locationsText || '',
            isRemote,
            postedDate: job.postedOn ? new Date() : new Date(),
            applicationUrl: applyUrl,
            rawPayload: job,
          };
        });

        totalYielded += batch.length;
        yield batch;
      } catch (err: any) {
        logger.error(`Error ingesting Workday tenant ${tenant.name}:`, err);
      }
    }
  }

  getRateLimit(): RateLimitConfig {
    return {
      requestsPerMinute: 30,
      concurrency: 3,
      timeoutMs: 20000,
      retryCount: 3,
    };
  }

  getDefaultSchedule(): SourceScheduleConfig {
    return {
      frequencyMinutes: 60,
    };
  }
}

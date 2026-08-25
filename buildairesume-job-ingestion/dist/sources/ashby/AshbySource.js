"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AshbySource = void 0;
const logger_1 = require("../../utils/logger");
const ASHBY_COMPANIES = [
    { slug: 'linear', name: 'Linear' },
    { slug: 'retool', name: 'Retool' },
    { slug: 'elevenlabs', name: 'ElevenLabs' },
    { slug: 'runway', name: 'Runway ML' },
    { slug: 'posthog', name: 'PostHog' },
    { slug: 'resend', name: 'Resend' },
    { slug: 'warp', name: 'Warp' },
    { slug: 'railway', name: 'Railway' },
    { slug: 'modal', name: 'Modal' },
    { slug: 'vellum', name: 'Vellum' },
    { slug: 'anysphere', name: 'Cursor (Anysphere)' },
    { slug: 'cognition', name: 'Cognition AI' },
    { slug: 'pika', name: 'Pika' },
];
class AshbySource {
    name = 'ashby';
    displayName = 'Ashby ATS';
    type = 'ats';
    async healthCheck() {
        const start = Date.now();
        try {
            const res = await fetch('https://api.ashbyhq.com/posting-api/job-board/linear', {
                signal: AbortSignal.timeout(8000),
            });
            const latencyMs = Date.now() - start;
            return {
                healthy: res.ok,
                status: res.ok ? 'healthy' : 'degraded',
                latencyMs,
                statusCode: res.status,
                message: res.ok ? 'Ashby API reachable' : `HTTP ${res.status}`,
            };
        }
        catch (err) {
            return {
                healthy: false,
                status: 'failing',
                latencyMs: Date.now() - start,
                message: err.message,
            };
        }
    }
    async *fetchJobs(options) {
        const limit = options?.limit || 10000;
        let totalYielded = 0;
        for (const company of ASHBY_COMPANIES) {
            if (totalYielded >= limit)
                break;
            try {
                const url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'BuildAIResume-Ingestion/1.0' },
                    signal: options?.signal || AbortSignal.timeout(15000),
                });
                if (!res.ok) {
                    logger_1.logger.warn(`Ashby job board fetch skipped: ${company.slug} (HTTP ${res.status})`);
                    continue;
                }
                const data = await res.json();
                const rawJobsList = data.jobs || [];
                if (!Array.isArray(rawJobsList) || rawJobsList.length === 0)
                    continue;
                const batch = rawJobsList.map((job) => {
                    const isRemote = job.isRemote === true ||
                        job.location?.toLowerCase().includes('remote') ||
                        job.title?.toLowerCase().includes('remote') ||
                        false;
                    return {
                        source: 'ashby',
                        sourceJobId: String(job.id),
                        url: job.jobUrl || `https://jobs.ashbyhq.com/${company.slug}/${job.id}`,
                        title: job.title || 'Untitled Role',
                        companyName: company.name,
                        rawHtmlDescription: job.descriptionHtml || job.descriptionPlain || '',
                        rawTextDescription: job.descriptionPlain || '',
                        locationString: job.location || (isRemote ? 'Remote' : ''),
                        isRemote,
                        postedDate: job.publishedAt ? new Date(job.publishedAt) : new Date(),
                        applicationUrl: job.applyUrl || job.jobUrl,
                        department: job.department,
                        employmentTypeString: job.employmentType,
                        rawPayload: job,
                    };
                });
                totalYielded += batch.length;
                yield batch;
            }
            catch (err) {
                logger_1.logger.error(`Error ingesting Ashby company ${company.slug}:`, err);
            }
        }
    }
    getRateLimit() {
        return {
            requestsPerMinute: 60,
            concurrency: 5,
            timeoutMs: 15000,
            retryCount: 3,
        };
    }
    getDefaultSchedule() {
        return {
            frequencyMinutes: 30,
        };
    }
}
exports.AshbySource = AshbySource;
//# sourceMappingURL=AshbySource.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GreenhouseSource = void 0;
const logger_1 = require("../../utils/logger");
const GREENHOUSE_COMPANIES = [
    { token: 'stripe', name: 'Stripe' },
    { token: 'airbnb', name: 'Airbnb' },
    { token: 'dropbox', name: 'Dropbox' },
    { token: 'reddit', name: 'Reddit' },
    { token: 'monzo', name: 'Monzo' },
    { token: 'wise', name: 'Wise' },
    { token: 'perplexity', name: 'Perplexity' },
    { token: 'gitlab', name: 'GitLab' },
    { token: 'cloudflare', name: 'Cloudflare' },
    { token: 'databricks', name: 'Databricks' },
    { token: 'revolut', name: 'Revolut' },
    { token: 'starlingbank', name: 'Starling Bank' },
    { token: 'elastic', name: 'Elastic' },
    { token: 'samsara', name: 'Samsara' },
    { token: 'openai', name: 'OpenAI' },
    { token: 'scale', name: 'Scale AI' },
    { token: 'brex', name: 'Brex' },
    { token: 'mercury', name: 'Mercury' },
    { token: 'ramp', name: 'Ramp' },
    { token: 'rippling', name: 'Rippling' },
    { token: 'deel', name: 'Deel' },
    { token: 'canva', name: 'Canva' },
    { token: 'atlassian', name: 'Atlassian' },
    { token: 'hashicorp', name: 'HashiCorp' },
    { token: 'launchdarkly', name: 'LaunchDarkly' },
];
class GreenhouseSource {
    name = 'greenhouse';
    displayName = 'Greenhouse ATS';
    type = 'ats';
    async healthCheck() {
        const start = Date.now();
        try {
            const res = await fetch('https://boards-api.greenhouse.io/v1/boards/monzo/jobs', {
                signal: AbortSignal.timeout(8000),
            });
            const latencyMs = Date.now() - start;
            return {
                healthy: res.ok,
                status: res.ok ? 'healthy' : 'degraded',
                latencyMs,
                statusCode: res.status,
                message: res.ok ? 'Greenhouse API reachable' : `HTTP ${res.status}`,
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
        for (const company of GREENHOUSE_COMPANIES) {
            if (totalYielded >= limit)
                break;
            try {
                const url = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'BuildAIResume-Ingestion/1.0' },
                    signal: options?.signal || AbortSignal.timeout(15000),
                });
                if (!res.ok) {
                    logger_1.logger.warn(`Greenhouse board fetch skipped: ${company.token} (HTTP ${res.status})`);
                    continue;
                }
                const data = await res.json();
                const rawJobsList = data.jobs || [];
                if (!Array.isArray(rawJobsList) || rawJobsList.length === 0)
                    continue;
                const batch = rawJobsList.map((job) => ({
                    source: 'greenhouse',
                    sourceJobId: String(job.id),
                    url: job.absolute_url || `https://boards.greenhouse.io/${company.token}/jobs/${job.id}`,
                    title: job.title || 'Untitled Role',
                    companyName: company.name,
                    rawHtmlDescription: job.content || '',
                    locationString: job.location?.name || '',
                    isRemote: job.location?.name?.toLowerCase().includes('remote') ||
                        job.title?.toLowerCase().includes('remote') ||
                        false,
                    postedDate: job.updated_at ? new Date(job.updated_at) : new Date(),
                    applicationUrl: job.absolute_url,
                    department: job.departments?.[0]?.name,
                    rawPayload: job,
                }));
                totalYielded += batch.length;
                yield batch;
            }
            catch (err) {
                logger_1.logger.error(`Error ingesting Greenhouse company ${company.token}:`, err);
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
exports.GreenhouseSource = GreenhouseSource;
//# sourceMappingURL=GreenhouseSource.js.map
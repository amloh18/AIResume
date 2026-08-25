"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeverSource = void 0;
const logger_1 = require("../../utils/logger");
const LEVER_COMPANIES = [
    { slug: 'figma', name: 'Figma' },
    { slug: 'vercel', name: 'Vercel' },
    { slug: 'supabase', name: 'Supabase' },
    { slug: 'plaid', name: 'Plaid' },
    { slug: 'postman', name: 'Postman' },
    { slug: 'webflow', name: 'Webflow' },
    { slug: 'kinsta', name: 'Kinsta' },
    { slug: 'auth0', name: 'Auth0' },
    { slug: 'sourcegraph', name: 'Sourcegraph' },
    { slug: 'automattic', name: 'Automattic' },
    { slug: 'buffer', name: 'Buffer' },
    { slug: '1password', name: '1Password' },
    { slug: 'abstract', name: 'Abstract' },
];
class LeverSource {
    name = 'lever';
    displayName = 'Lever ATS';
    type = 'ats';
    async healthCheck() {
        const start = Date.now();
        try {
            const res = await fetch('https://api.lever.co/v0/postings/figma?mode=json', {
                signal: AbortSignal.timeout(8000),
            });
            const latencyMs = Date.now() - start;
            return {
                healthy: res.ok,
                status: res.ok ? 'healthy' : 'degraded',
                latencyMs,
                statusCode: res.status,
                message: res.ok ? 'Lever API reachable' : `HTTP ${res.status}`,
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
        for (const company of LEVER_COMPANIES) {
            if (totalYielded >= limit)
                break;
            try {
                const url = `https://api.lever.co/v0/postings/${company.slug}?mode=json`;
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'BuildAIResume-Ingestion/1.0' },
                    signal: options?.signal || AbortSignal.timeout(15000),
                });
                if (!res.ok) {
                    logger_1.logger.warn(`Lever postings fetch skipped: ${company.slug} (HTTP ${res.status})`);
                    continue;
                }
                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0)
                    continue;
                const batch = data.map((job) => {
                    const workplaceType = job.workplaceType || '';
                    const location = job.categories?.location || '';
                    const isRemote = workplaceType.toLowerCase() === 'remote' ||
                        location.toLowerCase().includes('remote') ||
                        job.text?.toLowerCase().includes('remote') ||
                        false;
                    return {
                        source: 'lever',
                        sourceJobId: String(job.id),
                        url: job.hostedUrl || `https://jobs.lever.co/${company.slug}/${job.id}`,
                        title: job.text || 'Untitled Role',
                        companyName: company.name,
                        rawHtmlDescription: job.descriptionPlain || job.description || '',
                        rawTextDescription: job.descriptionPlain || '',
                        locationString: location,
                        isRemote,
                        postedDate: job.createdAt ? new Date(job.createdAt) : new Date(),
                        applicationUrl: job.applyUrl || job.hostedUrl,
                        department: job.categories?.department || job.categories?.team,
                        employmentTypeString: job.categories?.commitment,
                        rawPayload: job,
                    };
                });
                totalYielded += batch.length;
                yield batch;
            }
            catch (err) {
                logger_1.logger.error(`Error ingesting Lever company ${company.slug}:`, err);
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
exports.LeverSource = LeverSource;
//# sourceMappingURL=LeverSource.js.map
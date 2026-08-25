"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteOKSource = void 0;
const logger_1 = require("../../utils/logger");
class RemoteOKSource {
    name = 'remoteok';
    displayName = 'RemoteOK API';
    type = 'api';
    async healthCheck() {
        const start = Date.now();
        try {
            const res = await fetch('https://remoteok.com/api', {
                headers: { 'User-Agent': 'BuildAIResume-Job-Ingestion-Bot/1.0' },
                signal: AbortSignal.timeout(8000),
            });
            const latencyMs = Date.now() - start;
            return {
                healthy: res.ok,
                status: res.ok ? 'healthy' : 'degraded',
                latencyMs,
                statusCode: res.status,
                message: res.ok ? 'RemoteOK API reachable' : `HTTP ${res.status}`,
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
        try {
            const res = await fetch('https://remoteok.com/api', {
                headers: { 'User-Agent': 'BuildAIResume-Job-Ingestion-Bot/1.0' },
                signal: options?.signal || AbortSignal.timeout(25000),
            });
            if (!res.ok) {
                logger_1.logger.error(`RemoteOK API responded with HTTP ${res.status}`);
                return;
            }
            const data = await res.json();
            if (!Array.isArray(data))
                return;
            // Filter out legal/header object
            const jobs = data.filter((item) => item && item.id && item.position);
            if (jobs.length === 0)
                return;
            const chunkSize = 200;
            for (let i = 0; i < jobs.length; i += chunkSize) {
                const chunk = jobs.slice(i, i + chunkSize);
                const batch = chunk.map((job) => ({
                    source: 'remoteok',
                    sourceJobId: String(job.id),
                    url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
                    title: job.position || 'Untitled Role',
                    companyName: job.company || 'Unknown Employer',
                    rawHtmlDescription: job.description || '',
                    rawTextDescription: job.description?.replace(/<\/?[^>]+(>|$)/g, '') || '',
                    locationString: job.location || 'Worldwide',
                    isRemote: true,
                    postedDate: job.date ? new Date(job.date) : new Date(),
                    salaryMin: job.salary_min,
                    salaryMax: job.salary_max,
                    salaryCurrency: 'USD',
                    salaryPeriod: 'year',
                    applicationUrl: job.apply_url || job.url,
                    department: job.tags?.[0],
                    rawPayload: job,
                }));
                yield batch;
            }
        }
        catch (err) {
            logger_1.logger.error('Error fetching jobs from RemoteOK API:', err);
        }
    }
    getRateLimit() {
        return {
            requestsPerMinute: 20,
            concurrency: 2,
            timeoutMs: 30000,
            retryCount: 3,
        };
    }
    getDefaultSchedule() {
        return {
            frequencyMinutes: 60,
        };
    }
}
exports.RemoteOKSource = RemoteOKSource;
//# sourceMappingURL=RemoteOKSource.js.map
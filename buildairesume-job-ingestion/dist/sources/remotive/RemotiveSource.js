"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotiveSource = void 0;
const logger_1 = require("../../utils/logger");
class RemotiveSource {
    name = 'remotive';
    displayName = 'Remotive Remote Jobs API';
    type = 'api';
    async healthCheck() {
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
            const limit = options?.limit || 2000;
            const url = `https://remotive.com/api/remote-jobs?limit=${limit}`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'BuildAIResume-Ingestion/1.0' },
                signal: options?.signal || AbortSignal.timeout(25000),
            });
            if (!res.ok) {
                logger_1.logger.error(`Remotive API responded with HTTP ${res.status}`);
                return;
            }
            const data = await res.json();
            const jobs = data.jobs || [];
            if (!Array.isArray(jobs) || jobs.length === 0)
                return;
            // Yield in chunks of 200
            const chunkSize = 200;
            for (let i = 0; i < jobs.length; i += chunkSize) {
                const chunk = jobs.slice(i, i + chunkSize);
                const batch = chunk.map((job) => ({
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
        }
        catch (err) {
            logger_1.logger.error('Error fetching jobs from Remotive API:', err);
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
exports.RemotiveSource = RemotiveSource;
//# sourceMappingURL=RemotiveSource.js.map
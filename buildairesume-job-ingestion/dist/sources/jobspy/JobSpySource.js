"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobSpySource = void 0;
const env_1 = require("../../config/env");
const logger_1 = require("../../utils/logger");
class JobSpySource {
    name = 'jobspy';
    displayName = 'JobSpy Multi-Portal Scraper Bridge';
    type = 'scraper';
    async healthCheck() {
        if (!env_1.env.JOBSPY_ENABLED) {
            return {
                healthy: false,
                status: 'degraded',
                latencyMs: 0,
                message: 'JobSpy worker disabled in environment configuration',
            };
        }
        const start = Date.now();
        try {
            const res = await fetch(`${env_1.env.JOBSPY_WORKER_URL}/health`, {
                signal: AbortSignal.timeout(5000),
            });
            const latencyMs = Date.now() - start;
            return {
                healthy: res.ok,
                status: res.ok ? 'healthy' : 'degraded',
                latencyMs,
                statusCode: res.status,
                message: res.ok ? 'JobSpy Python worker connected' : `HTTP ${res.status}`,
            };
        }
        catch (err) {
            return {
                healthy: false,
                status: 'failing',
                latencyMs: Date.now() - start,
                message: `JobSpy worker unreachable: ${err.message}`,
            };
        }
    }
    async *fetchJobs(options) {
        if (!env_1.env.JOBSPY_ENABLED) {
            logger_1.logger.warn('JobSpy fetch skipped: disabled in configuration');
            return;
        }
        try {
            const payload = {
                site_name: ['indeed', 'linkedin', 'zip_recruiter', 'glassdoor'],
                search_term: options?.category || 'Software Engineer',
                location: options?.region || 'United Kingdom',
                results_wanted: options?.limit || 50,
                is_remote: true,
            };
            const res = await fetch(`${env_1.env.JOBSPY_WORKER_URL}/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: options?.signal || AbortSignal.timeout(120000),
            });
            if (!res.ok) {
                logger_1.logger.error(`JobSpy worker returned HTTP ${res.status}`);
                return;
            }
            const data = await res.json();
            const rawJobs = data.jobs || [];
            if (!Array.isArray(rawJobs) || rawJobs.length === 0)
                return;
            const batch = rawJobs.map((job) => ({
                source: `jobspy_${job.site || 'portal'}`,
                sourceJobId: String(job.id || job.job_url),
                url: job.job_url,
                title: job.title || 'Untitled Role',
                companyName: job.company || 'Unknown Employer',
                rawHtmlDescription: job.description || '',
                rawTextDescription: job.description || '',
                locationString: job.location || '',
                isRemote: job.is_remote === true,
                postedDate: job.date_posted ? new Date(job.date_posted) : new Date(),
                salaryMin: job.min_amount,
                salaryMax: job.max_amount,
                salaryCurrency: job.currency,
                salaryPeriod: job.interval,
                applicationUrl: job.job_url_direct || job.job_url,
                rawPayload: job,
            }));
            yield batch;
        }
        catch (err) {
            logger_1.logger.error('Error ingesting from JobSpy bridge:', err);
        }
    }
    getRateLimit() {
        return {
            requestsPerMinute: 10,
            concurrency: 1,
            timeoutMs: 120000,
            retryCount: 2,
        };
    }
    getDefaultSchedule() {
        return {
            frequencyMinutes: 180, // Heavy scraping run every 3 hours
        };
    }
}
exports.JobSpySource = JobSpySource;
//# sourceMappingURL=JobSpySource.js.map
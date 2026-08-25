"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryManager = void 0;
const logger_1 = require("../utils/logger");
class RetryManager {
    static async withRetry(operation, contextName, options) {
        const maxAttempts = options?.maxAttempts || 3;
        let delayMs = options?.initialDelayMs || 1000;
        const maxDelayMs = options?.maxDelayMs || 30000;
        const multiplier = options?.backoffMultiplier || 2;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (err) {
                lastError = err;
                if (options?.shouldRetry && !options.shouldRetry(err)) {
                    throw err;
                }
                if (attempt >= maxAttempts) {
                    logger_1.logger.error(`Operation [${contextName}] failed after ${maxAttempts} attempts:`, err);
                    throw err;
                }
                // Apply exponential backoff with jitter
                const jitter = Math.random() * 200;
                const sleepDuration = Math.min(delayMs + jitter, maxDelayMs);
                logger_1.logger.warn(`Retry attempt ${attempt}/${maxAttempts} for [${contextName}] in ${Math.round(sleepDuration)}ms...`);
                await new Promise((resolve) => setTimeout(resolve, sleepDuration));
                delayMs *= multiplier;
            }
        }
        throw lastError;
    }
}
exports.RetryManager = RetryManager;
//# sourceMappingURL=RetryManager.js.map
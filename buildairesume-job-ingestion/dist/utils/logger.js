"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createSourceLogger = createSourceLogger;
const env_1 = require("../config/env");
const LOG_LEVELS = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
};
class StructuredLogger {
    level = 'info';
    minLevelVal = 30;
    defaultContext = {};
    constructor(context = {}) {
        this.level = env_1.env.LOG_LEVEL || 'info';
        this.minLevelVal = LOG_LEVELS[this.level] ?? 30;
        this.defaultContext = {
            service: env_1.env.SERVICE_NAME,
            env: env_1.env.NODE_ENV,
            ...context,
        };
    }
    log(level, message, context, error) {
        const levelVal = LOG_LEVELS[level] ?? 30;
        if (levelVal < this.minLevelVal)
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...this.defaultContext,
            ...(context || {}),
        };
        if (error) {
            entry.error = {
                message: error.message || String(error),
                stack: error.stack,
                code: error.code,
                name: error.name,
            };
        }
        if (env_1.env.NODE_ENV === 'development') {
            const color = level === 'error' || level === 'fatal'
                ? '\x1b[31m'
                : level === 'warn'
                    ? '\x1b[33m'
                    : level === 'info'
                        ? '\x1b[32m'
                        : '\x1b[36m';
            const reset = '\x1b[0m';
            const src = entry.source ? ` [${entry.source}]` : '';
            const run = entry.runId ? ` (${entry.runId.slice(0, 8)})` : '';
            console.log(`${color}${entry.timestamp} ${entry.level}${reset}${src}${run}: ${message}`);
            if (entry.error)
                console.error(entry.error);
        }
        else {
            console.log(JSON.stringify(entry));
        }
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context, error) {
        this.log('warn', message, context, error);
    }
    error(message, error, context) {
        this.log('error', message, context, error);
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    child(context) {
        return new StructuredLogger({
            ...this.defaultContext,
            ...context,
        });
    }
}
exports.logger = new StructuredLogger();
function createSourceLogger(source, runId) {
    return exports.logger.child({
        source,
        ...(runId ? { runId } : {}),
    });
}
//# sourceMappingURL=logger.js.map
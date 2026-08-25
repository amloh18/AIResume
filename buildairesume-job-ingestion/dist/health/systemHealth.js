"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemHealth = getSystemHealth;
const database_1 = require("../config/database");
const sources_1 = require("../sources");
const circuitBreaker_1 = require("./circuitBreaker");
const scheduler_1 = require("../scheduler/scheduler");
const constants_1 = require("../config/constants");
async function getSystemHealth() {
    const dbHealth = await database_1.dbManager.checkHealth();
    const schedulerRunning = scheduler_1.ingestionScheduler.isSchedulerRunning();
    let healthySources = 0;
    let degradedSources = 0;
    let circuitOpenSources = 0;
    const breakdown = {};
    for (const source of sources_1.ALL_JOB_SOURCES) {
        const state = circuitBreaker_1.circuitBreaker.getState(source.name);
        breakdown[source.name] = {
            displayName: source.displayName,
            health: state.health,
            consecutiveFailures: state.consecutiveFailures,
            lastSuccessAt: state.lastSuccessAt,
            lastFailureAt: state.lastFailureAt,
        };
        if (state.health === constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY) {
            healthySources++;
        }
        else if (state.health === constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.CIRCUIT_OPEN) {
            circuitOpenSources++;
        }
        else {
            degradedSources++;
        }
    }
    const overallStatus = !dbHealth.connected || circuitOpenSources >= 4
        ? 'failing'
        : degradedSources > 0 || circuitOpenSources > 0
            ? 'degraded'
            : 'healthy';
    return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        service: 'buildairesume-job-ingestion',
        mongodb: {
            connected: dbHealth.connected,
            database: dbHealth.database,
            pingMs: dbHealth.pingMs,
        },
        scheduler: {
            running: schedulerRunning,
        },
        sources: {
            total: sources_1.ALL_JOB_SOURCES.length,
            healthy: healthySources,
            degraded: degradedSources,
            circuitOpen: circuitOpenSources,
            breakdown,
        },
    };
}
//# sourceMappingURL=systemHealth.js.map
import { dbManager } from '../config/database';
import { ALL_JOB_SOURCES } from '../sources';
import { circuitBreaker } from './circuitBreaker';
import { ingestionScheduler } from '../scheduler/scheduler';
import { SYSTEM_CONSTANTS } from '../config/constants';

export interface SystemHealthReport {
  status: 'healthy' | 'degraded' | 'failing';
  timestamp: string;
  uptimeSeconds: number;
  service: string;
  mongodb: {
    connected: boolean;
    database: string;
    pingMs: number;
  };
  scheduler: {
    running: boolean;
  };
  sources: {
    total: number;
    healthy: number;
    degraded: number;
    circuitOpen: number;
    breakdown: Record<string, any>;
  };
}

export async function getSystemHealth(): Promise<SystemHealthReport> {
  const dbHealth = await dbManager.checkHealth();
  const schedulerRunning = ingestionScheduler.isSchedulerRunning();

  let healthySources = 0;
  let degradedSources = 0;
  let circuitOpenSources = 0;
  const breakdown: Record<string, any> = {};

  for (const source of ALL_JOB_SOURCES) {
    const state = circuitBreaker.getState(source.name);
    breakdown[source.name] = {
      displayName: source.displayName,
      health: state.health,
      consecutiveFailures: state.consecutiveFailures,
      lastSuccessAt: state.lastSuccessAt,
      lastFailureAt: state.lastFailureAt,
    };

    if (state.health === SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY) {
      healthySources++;
    } else if (state.health === SYSTEM_CONSTANTS.HEALTH_STATUS.CIRCUIT_OPEN) {
      circuitOpenSources++;
    } else {
      degradedSources++;
    }
  }

  const overallStatus =
    !dbHealth.connected || circuitOpenSources >= 4
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
      total: ALL_JOB_SOURCES.length,
      healthy: healthySources,
      degraded: degradedSources,
      circuitOpen: circuitOpenSources,
      breakdown,
    },
  };
}

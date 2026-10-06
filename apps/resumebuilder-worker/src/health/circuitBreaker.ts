import { SourceHealth } from '../models/JobSource';
import { SYSTEM_CONSTANTS } from '../config/constants';
import { logger } from '../utils/logger';

export interface CircuitState {
  health: SourceHealth;
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  circuitOpenedAt: Date | null;
}

class CircuitBreakerManager {
  private states = new Map<string, CircuitState>();

  getState(source: string): CircuitState {
    if (!this.states.has(source)) {
      this.states.set(source, {
        health: SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY,
        consecutiveFailures: 0,
        lastFailureAt: null,
        lastSuccessAt: null,
        circuitOpenedAt: null,
      });
    }
    return this.states.get(source)!;
  }

  isAvailable(source: string): boolean {
    const state = this.getState(source);

    if (state.health === SYSTEM_CONSTANTS.HEALTH_STATUS.CIRCUIT_OPEN) {
      if (state.circuitOpenedAt) {
        const elapsed = Date.now() - state.circuitOpenedAt.getTime();
        // If cooldown elapsed, allow trial run (half-open)
        if (elapsed > SYSTEM_CONSTANTS.LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS) {
          state.health = SYSTEM_CONSTANTS.HEALTH_STATUS.DEGRADED;
          logger.info(`Source [${source}] circuit half-open after cooldown. Testing next run...`);
          return true;
        }
      }
      return false;
    }

    return true;
  }

  recordSuccess(source: string) {
    const state = this.getState(source);
    state.consecutiveFailures = 0;
    state.lastSuccessAt = new Date();
    state.health = SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY;
    state.circuitOpenedAt = null;
  }

  recordFailure(source: string, error?: Error | any) {
    const state = this.getState(source);
    state.consecutiveFailures += 1;
    state.lastFailureAt = new Date();

    if (state.consecutiveFailures >= SYSTEM_CONSTANTS.LIMITS.CIRCUIT_BREAKER_FAILURES) {
      state.health = SYSTEM_CONSTANTS.HEALTH_STATUS.CIRCUIT_OPEN;
      state.circuitOpenedAt = new Date();
      logger.error(`🚨 Circuit OPEN for source [${source}]: ${state.consecutiveFailures} consecutive failures. Pausing source.`, error);
    } else if (state.consecutiveFailures >= 3) {
      state.health = SYSTEM_CONSTANTS.HEALTH_STATUS.FAILING;
    } else {
      state.health = SYSTEM_CONSTANTS.HEALTH_STATUS.DEGRADED;
    }
  }
}

export const circuitBreaker = new CircuitBreakerManager();

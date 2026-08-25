"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreaker = void 0;
const constants_1 = require("../config/constants");
const logger_1 = require("../utils/logger");
class CircuitBreakerManager {
    states = new Map();
    getState(source) {
        if (!this.states.has(source)) {
            this.states.set(source, {
                health: constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY,
                consecutiveFailures: 0,
                lastFailureAt: null,
                lastSuccessAt: null,
                circuitOpenedAt: null,
            });
        }
        return this.states.get(source);
    }
    isAvailable(source) {
        const state = this.getState(source);
        if (state.health === constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.CIRCUIT_OPEN) {
            if (state.circuitOpenedAt) {
                const elapsed = Date.now() - state.circuitOpenedAt.getTime();
                // If cooldown elapsed, allow trial run (half-open)
                if (elapsed > constants_1.SYSTEM_CONSTANTS.LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS) {
                    state.health = constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.DEGRADED;
                    logger_1.logger.info(`Source [${source}] circuit half-open after cooldown. Testing next run...`);
                    return true;
                }
            }
            return false;
        }
        return true;
    }
    recordSuccess(source) {
        const state = this.getState(source);
        state.consecutiveFailures = 0;
        state.lastSuccessAt = new Date();
        state.health = constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.HEALTHY;
        state.circuitOpenedAt = null;
    }
    recordFailure(source, error) {
        const state = this.getState(source);
        state.consecutiveFailures += 1;
        state.lastFailureAt = new Date();
        if (state.consecutiveFailures >= constants_1.SYSTEM_CONSTANTS.LIMITS.CIRCUIT_BREAKER_FAILURES) {
            state.health = constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.CIRCUIT_OPEN;
            state.circuitOpenedAt = new Date();
            logger_1.logger.error(`🚨 Circuit OPEN for source [${source}]: ${state.consecutiveFailures} consecutive failures. Pausing source.`, error);
        }
        else if (state.consecutiveFailures >= 3) {
            state.health = constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.FAILING;
        }
        else {
            state.health = constants_1.SYSTEM_CONSTANTS.HEALTH_STATUS.DEGRADED;
        }
    }
}
exports.circuitBreaker = new CircuitBreakerManager();
//# sourceMappingURL=circuitBreaker.js.map
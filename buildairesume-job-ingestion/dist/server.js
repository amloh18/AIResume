"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const http_1 = __importDefault(require("http"));
const systemHealth_1 = require("./health/systemHealth");
const IngestionManager_1 = require("./ingestion/IngestionManager");
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
function createServer() {
    const server = http_1.default.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';
        res.setHeader('Content-Type', 'application/json');
        // 1. GET /health
        if (method === 'GET' && (url === '/health' || url === '/')) {
            try {
                const health = await (0, systemHealth_1.getSystemHealth)();
                const httpStatus = health.status === 'failing' ? 503 : 200;
                res.writeHead(httpStatus);
                res.end(JSON.stringify(health, null, 2));
            }
            catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
            return;
        }
        // 2. GET /metrics
        if (method === 'GET' && url === '/metrics') {
            try {
                const health = await (0, systemHealth_1.getSystemHealth)();
                res.writeHead(200);
                res.end(JSON.stringify({
                    service: health.service,
                    status: health.status,
                    uptime_seconds: health.uptimeSeconds,
                    mongodb_connected: health.mongodb.connected ? 1 : 0,
                    mongodb_ping_ms: health.mongodb.pingMs,
                    scheduler_running: health.scheduler.running ? 1 : 0,
                    sources_total: health.sources.total,
                    sources_healthy: health.sources.healthy,
                    sources_degraded: health.sources.degraded,
                    sources_circuit_open: health.sources.circuitOpen,
                }, null, 2));
            }
            catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }
        // 3. POST /api/ingest/:source
        if (method === 'POST' && url.startsWith('/api/ingest/')) {
            const sourceName = url.replace('/api/ingest/', '').trim();
            try {
                const db = database_1.dbManager.getDb();
                logger_1.logger.info(`Manual ingestion trigger received for source: [${sourceName}]`);
                // Start asynchronously
                IngestionManager_1.ingestionManager.runSource(db, sourceName).catch((err) => {
                    logger_1.logger.error(`Manual ingestion run failed for [${sourceName}]:`, err);
                });
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    message: `Ingestion triggered for source: ${sourceName}`,
                    timestamp: new Date().toISOString(),
                }));
            }
            catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
        }
        // 404 Not Found
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Route not found' }));
    });
    return server;
}
//# sourceMappingURL=server.js.map
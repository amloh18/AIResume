import http from 'http';
import { getSystemHealth } from './health/systemHealth';
import { ingestionManager } from './ingestion/IngestionManager';
import { dbManager } from './config/database';
import { logger } from './utils/logger';

export function createServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    const method = req.method || 'GET';

    res.setHeader('Content-Type', 'application/json');

    // 1. GET /health
    if (method === 'GET' && (url === '/health' || url === '/')) {
      try {
        const health = await getSystemHealth();
        const httpStatus = health.status === 'failing' ? 503 : 200;
        res.writeHead(httpStatus);
        res.end(JSON.stringify(health, null, 2));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
      return;
    }

    // 2. GET /metrics
    if (method === 'GET' && url === '/metrics') {
      try {
        const health = await getSystemHealth();
        res.writeHead(200);
        res.end(
          JSON.stringify({
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
          }, null, 2)
        );
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 3. POST /api/ingest/:source
    if (method === 'POST' && url.startsWith('/api/ingest/')) {
      const sourceName = url.replace('/api/ingest/', '').trim();
      try {
        const db = dbManager.getDb();
        logger.info(`Manual ingestion trigger received for source: [${sourceName}]`);
        // Start asynchronously
        ingestionManager.runSource(db, sourceName).catch((err) => {
          logger.error(`Manual ingestion run failed for [${sourceName}]:`, err);
        });

        res.writeHead(200);
        res.end(
          JSON.stringify({
            success: true,
            message: `Ingestion triggered for source: ${sourceName}`,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (err: any) {
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

import { env } from './config/env';
import { dbManager } from './config/database';
import { ensureAllIndexes } from './config/indexes';
import { ingestionScheduler } from './scheduler/scheduler';
import { createServer } from './server';
import { logger } from './utils/logger';

async function bootstrap() {
  logger.info(`🌟 Starting BuildAIResume Job Ingestion Platform v1.0.0 [${env.NODE_ENV}]...`);

  // 1. Connect to MongoDB
  const db = await dbManager.connect();

  // 2. Ensure Collections and Indexes
  await ensureAllIndexes(db);

  // 3. Start Scheduler
  if (env.JOB_WORKER_ENABLED) {
    ingestionScheduler.start(db);
  } else {
    logger.warn('⚠️ JOB_WORKER_ENABLED is false. Scheduler will not start automatically.');
  }

  // 4. Start Health & Control HTTP Server
  const app = createServer();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Job Ingestion Service HTTP Server listening on port ${env.PORT}`);
    logger.info(`   • Health check: http://localhost:${env.PORT}/health`);
    logger.info(`   • Metrics:      http://localhost:${env.PORT}/metrics`);
  });

  // 5. Graceful Shutdown Handler
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new cron tasks
    ingestionScheduler.stop();

    // Close HTTP Server
    server.close(() => {
      logger.info('✅ HTTP server closed.');
    });

    // Wait a brief moment for in-flight DB batches to finish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Disconnect MongoDB
    await dbManager.disconnect();

    logger.info('👋 Graceful shutdown complete. Exiting.');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('💥 Fatal error during bootstrap:', err);
  process.exit(1);
});

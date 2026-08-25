"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const indexes_1 = require("./config/indexes");
const scheduler_1 = require("./scheduler/scheduler");
const server_1 = require("./server");
const logger_1 = require("./utils/logger");
async function bootstrap() {
    logger_1.logger.info(`🌟 Starting BuildAIResume Job Ingestion Platform v1.0.0 [${env_1.env.NODE_ENV}]...`);
    // 1. Connect to MongoDB
    const db = await database_1.dbManager.connect();
    // 2. Ensure Collections and Indexes
    await (0, indexes_1.ensureAllIndexes)(db);
    // 3. Start Scheduler
    if (env_1.env.JOB_WORKER_ENABLED) {
        scheduler_1.ingestionScheduler.start(db);
    }
    else {
        logger_1.logger.warn('⚠️ JOB_WORKER_ENABLED is false. Scheduler will not start automatically.');
    }
    // 4. Start Health & Control HTTP Server
    const app = (0, server_1.createServer)();
    const server = app.listen(env_1.env.PORT, () => {
        logger_1.logger.info(`🚀 Job Ingestion Service HTTP Server listening on port ${env_1.env.PORT}`);
        logger_1.logger.info(`   • Health check: http://localhost:${env_1.env.PORT}/health`);
        logger_1.logger.info(`   • Metrics:      http://localhost:${env_1.env.PORT}/metrics`);
    });
    // 5. Graceful Shutdown Handler
    let isShuttingDown = false;
    const gracefulShutdown = async (signal) => {
        if (isShuttingDown)
            return;
        isShuttingDown = true;
        logger_1.logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
        // Stop accepting new cron tasks
        scheduler_1.ingestionScheduler.stop();
        // Close HTTP Server
        server.close(() => {
            logger_1.logger.info('✅ HTTP server closed.');
        });
        // Wait a brief moment for in-flight DB batches to finish
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Disconnect MongoDB
        await database_1.dbManager.disconnect();
        logger_1.logger.info('👋 Graceful shutdown complete. Exiting.');
        process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
bootstrap().catch((err) => {
    logger_1.logger.error('💥 Fatal error during bootstrap:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
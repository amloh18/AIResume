import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Log critical env var status on startup
    if (!process.env.MONGODB_DB) {
      console.error('🚨 CRITICAL: MONGODB_DB is not set! App will connect to wrong database. Set MONGODB_DB=airesume');
    } else {
      console.log(`[Startup] MONGODB_DB=${process.env.MONGODB_DB}`);
    }

    Sentry.init({
      dsn: "https://88b1aba46950f4d42ae02febd2ae0e8a@o4511432633679872.ingest.de.sentry.io/4511432660156496",
      tracesSampleRate: 1,
      enableLogs: true,
      sendDefaultPii: true,
    });

    // Connect to MongoDB on server boot so workers and early queries never buffer or timeout
    try {
      const { getConnection } = await import('./lib/database');
      await getConnection();
      console.log('[Startup] MongoDB connection established successfully');
    } catch (err) {
      console.error('[Startup] Failed to connect to MongoDB on startup:', err);
    }

    // Start email worker for application email delivery
    try {
      const { startEmailWorker } = await import('./workers/emailWorker');
      startEmailWorker();
    } catch (err) {
      console.warn('[Startup] Email worker failed to start:', err);
    }

    // Start email ingestion worker for inbound email polling
    try {
      const { startIngestionWorker } = await import('./services/emailIngestionService');
      startIngestionWorker();
    } catch (err) {
      console.warn('[Startup] Email ingestion worker failed to start:', err);
    }

    // Start application worker for auto-apply queue processing
    try {
      const { startApplicationWorker } = await import('./workers/applicationWorker');
      startApplicationWorker();
    } catch (err) {
      console.warn('[Startup] Application worker failed to start:', err);
    }

    // Start reconciliation worker for stuck application recovery
    try {
      const { applicationReconciliationWorker } = await import('./lib/reconciliation/reconciliationWorker');
      const mongoose = await import('mongoose');
      // Delay to allow MongoDB connection
      setTimeout(async () => {
        if (mongoose.default.connection.readyState === 1) {
          const db = (mongoose.default.connection as any).db;
          if (db) {
            applicationReconciliationWorker.start(db, 60_000); // every 60s
            console.log('[Startup] Reconciliation worker started');
          }
        }
      }, 10_000);
    } catch (err) {
      console.warn('[Startup] Reconciliation worker failed to start:', err);
    }

    // Pre-load ingestion worker settings from DB into sync cache (delayed to allow MongoDB connection)
    setTimeout(async () => {
      try {
        const mongoose = await import('mongoose');
        if (mongoose.default.connection.readyState !== 1) {
          console.log('[Startup] MongoDB not connected yet, skipping ingestion settings load');
          return;
        }
        const { refreshSettingsCache } = await import('./lib/ingestion/engine');
        await refreshSettingsCache();
        console.log('[Startup] Ingestion settings loaded from DB');
      } catch (err) {
        console.warn('[Startup] Could not load ingestion settings from DB (will use defaults):', err);
      }
    }, 5000);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: "https://88b1aba46950f4d42ae02febd2ae0e8a@o4511432633679872.ingest.de.sentry.io/4511432660156496",
      tracesSampleRate: 1,
      enableLogs: true,
      sendDefaultPii: true,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;

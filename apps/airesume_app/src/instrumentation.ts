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
      // Errors are always captured; only traces are sampled down in production.
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
      enableLogs: true,
      // Resume/application payloads are sensitive — do not attach request bodies, IPs or cookies.
      sendDefaultPii: false,
    });

    // Connect to MongoDB on server boot so workers and early queries never buffer or timeout
    try {
      const { getConnection } = await import('./lib/database');
      await getConnection();
      console.log('[Startup] MongoDB connection established successfully');
    } catch (err) {
      console.error('[Startup] Failed to connect to MongoDB on startup:', err);
    }

    // Background loops (email delivery, inbound mail ingestion, application queue, reconciliation).
    //
    // These run in the web container only when the role says so. In production they belong to the
    // dedicated worker service (`docker build --target worker`, `npm run worker`), because a redeploy
    // of the site would otherwise kills them mid-flight. See src/workers/entry.ts.
    const { describeWorkerPlan, getWorkerPlan, isWorkerProcess, resolveWorkerRole } = await import(
      './workers/roles'
    );
    const { role, warning } = resolveWorkerRole();
    const plan = getWorkerPlan(role);

    if (warning) {
      console.warn(`[Startup] ${warning}`);
    }

    if (!isWorkerProcess(plan)) {
      console.log(
        `[Startup] Background loops disabled in this process (WORKER_ROLE=${role}); they run in the worker service.`
      );
    } else {
      console.log(
        `[Startup] WORKER_ROLE=${role} — loops run in this web process and are interrupted by redeploys: [${describeWorkerPlan(plan)}]. ` +
          'Set WORKER_ROLE=web here and run the worker service to decouple them.'
      );
    }

    // Start email worker for application email delivery
    if (plan.email) {
      try {
        const { startEmailWorker } = await import('./workers/emailWorker');
        startEmailWorker();
      } catch (err) {
        console.warn('[Startup] Email worker failed to start:', err);
      }
    }

    // Start email ingestion worker for inbound email polling
    if (plan.emailIngestion) {
      try {
        const { startIngestionWorker } = await import('./services/emailIngestionService');
        startIngestionWorker();
      } catch (err) {
        console.warn('[Startup] Email ingestion worker failed to start:', err);
      }
    }

    // Start application worker for auto-apply queue processing
    if (plan.applicationQueue) {
      try {
        const { startApplicationWorker } = await import('./workers/applicationWorker');
        startApplicationWorker();
      } catch (err) {
        console.warn('[Startup] Application worker failed to start:', err);
      }
    }

    // Start reconciliation worker for stuck application recovery
    if (plan.reconciliation) {
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
      tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
      enableLogs: true,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;

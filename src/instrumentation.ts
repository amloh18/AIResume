import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: "https://88b1aba46950f4d42ae02febd2ae0e8a@o4511432633679872.ingest.de.sentry.io/4511432660156496",
      tracesSampleRate: 1,
      enableLogs: true,
      sendDefaultPii: true,
    });

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

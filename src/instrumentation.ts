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

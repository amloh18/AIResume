// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from 'posthog-js';

// Initialize PostHog
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: '/ingest',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
}

Sentry.init({
  dsn: "https://88b1aba46950f4d42ae02febd2ae0e8a@o4511432633679872.ingest.de.sentry.io/4511432660156496",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // 100% tracing sampled every request in production — expensive, and it shipped with user PII
  // attached. Sample errors fully and traces lightly instead; development keeps full tracing.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1 : 0.1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // PII (IPs, request body, cookies, URLs with query params) is NOT sent by default. Resume and
  // application data is sensitive; Sentry receives the error, not the user's personal details.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://50ce60ac0f00a53cd82bacf5aa23ef8e@o4511380798636032.ingest.us.sentry.io/4511380812070912",

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: 1,
  enableLogs: true,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event) {
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
});

import pino from "pino";

// One structured logger for the service. Every log line in a request should
// carry the correlation id so a single search can be traced end-to-end across
// ES, Postgres, and the ranking stage. Use `logger.child({ correlationId })`
// at the request boundary (see http/server.ts) and pass that child down.

export const logger = pino({
  name: "search-service",
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    // Search queries can contain free text a user typed; treat as PII-adjacent.
    paths: ["req.headers.authorization", "*.query", "*.email"],
    censor: "[redacted]",
  },
});

export type Logger = typeof logger;

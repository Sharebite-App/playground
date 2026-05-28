import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../logger";
import { registerRoutes } from "./routes";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string;
      log: typeof logger;
    }
  }
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "32kb" }));

  // Correlation id + per-request child logger. Everything downstream logs
  // through `req.log` so a single search is traceable end to end.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.correlationId = req.header("x-correlation-id") ?? randomUUID();
    req.log = logger.child({ correlationId: req.correlationId });
    next();
  });

  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  registerRoutes(app);

  // Central error handler: structured log + stable error envelope. No stack
  // traces or internal fields leak to the client.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    req.log.error({ err }, "unhandled error");
    res.status(500).json({ error: "internal_error", correlationId: req.correlationId });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  createApp().listen(port, () => logger.info({ port }, "search-service listening"));
}

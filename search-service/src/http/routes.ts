import type { Express, Request, Response } from "express";
import { rateLimit } from "../middleware/rateLimit";
import { autocomplete } from "../search/autocomplete";

// Route registration. Every search-family route is rate limited (search is
// expensive and these endpoints are abusable).
export function registerRoutes(app: Express): void {
  app.post(
    "/autocomplete",
    rateLimit(),
    async (req: Request, res: Response, next) => {
      try {
        const suggestions = await autocomplete(req.body, req.log);
        res.json({ suggestions });
      } catch (err) {
        next(err);
      }
    },
  );
}

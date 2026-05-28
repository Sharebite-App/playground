import type { Express, Request, Response } from "express";
import { rateLimit } from "../middleware/rateLimit";
import { autocomplete } from "../search/autocomplete";
import { searchRestaurants } from "../search/searchRestaurants";

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

  // PR #6201: main restaurant search.
  app.post("/search", async (req: Request, res: Response, next) => {
    try {
      const result = await searchRestaurants(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });
}

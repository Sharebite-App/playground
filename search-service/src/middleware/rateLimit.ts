import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

// Sliding-window rate limiter. In production this is Redis-backed; the in-memory
// map here is the single-node fallback. Every authenticated search route must be
// wrapped with this — search is expensive and the endpoints are abusable.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function hit(key: string, max: number, windowMs: number, now: number): boolean {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count += 1;
  return true;
}

/**
 * Limit by both the user and their corporate. Expects `userId` and
 * `corporateId` to already be on the request (set by auth middleware upstream).
 */
export function rateLimit() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const userId = req.body?.userId ?? req.header("x-user-id");
    const corporateId = req.body?.corporateId ?? req.header("x-corporate-id");

    const userOk = hit(`u:${userId}`, config.rateLimit.perUserPerMinute, 60_000, now);
    const corpOk = hit(`c:${corporateId}`, config.rateLimit.perCorporatePerMinute, 60_000, now);

    if (!userOk || !corpOk) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    next();
  };
}

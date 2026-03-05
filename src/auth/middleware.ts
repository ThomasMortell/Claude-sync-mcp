import { createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type pg from "pg";
import type { Config } from "../config.js";
import { validateApiKey } from "../db/queries.js";

// Extend Express Request to include projectId
declare global {
  namespace Express {
    interface Request {
      projectId?: string;
    }
  }
}

export function createAuthMiddleware(pool: pg.Pool, config: Config) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip health check
    if (req.path === "/health") {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Bearer token" });
      return;
    }

    const token = authHeader.slice(7);
    const hash = createHash("sha256").update(token).digest("hex");

    // Single-key mode
    if (config.apiKeyHash) {
      if (hash !== config.apiKeyHash) {
        res.status(401).json({ error: "Invalid API key" });
        return;
      }
      // projectId will be set in transport.ts using the default project
      next();
      return;
    }

    // Multi-key mode: look up in database
    const result = await validateApiKey(pool, hash);
    if (!result) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    req.projectId = result.projectId;
    next();
  };
}

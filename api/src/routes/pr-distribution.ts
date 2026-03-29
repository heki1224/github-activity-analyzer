import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getPrDistribution } from "../queries";

export const prDistributionRouter = Router();

prDistributionRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getPrDistribution(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getSummary } from "../queries";

export const summaryRouter = Router();

summaryRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getSummary(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

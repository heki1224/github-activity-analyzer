import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getContributors } from "../queries";

export const contributorsRouter = Router();

contributorsRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getContributors(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getReviewTurnaround } from "../queries";

export const reviewTurnaroundRouter = Router();

reviewTurnaroundRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getReviewTurnaround(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

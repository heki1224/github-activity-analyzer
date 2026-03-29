import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getHeatmap } from "../queries";

export const heatmapRouter = Router();

heatmapRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getHeatmap(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

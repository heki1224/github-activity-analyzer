import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getTimeseries } from "../queries";

export const timeseriesRouter = Router();

timeseriesRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getTimeseries(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

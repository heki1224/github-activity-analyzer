import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { getCodeChurn } from "../queries";

export const codeChurnRouter = Router();

codeChurnRouter.get("/", (_req: Request, res: Response) => {
  try {
    const data = getCodeChurn(getDb());
    res.json(data);
  } catch (e) {
    res.status(503).json({
      error: e instanceof Error ? e.message : "Database unavailable",
    });
  }
});

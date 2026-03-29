import express from "express";
import { summaryRouter } from "./routes/summary";
import { timeseriesRouter } from "./routes/timeseries";
import { heatmapRouter } from "./routes/heatmap";
import { prDistributionRouter } from "./routes/pr-distribution";
import { reviewTurnaroundRouter } from "./routes/review-turnaround";
import { codeChurnRouter } from "./routes/code-churn";
import { contributorsRouter } from "./routes/contributors";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use("/api/summary", summaryRouter);
app.use("/api/timeseries", timeseriesRouter);
app.use("/api/heatmap", heatmapRouter);
app.use("/api/pr-distribution", prDistributionRouter);
app.use("/api/review-turnaround", reviewTurnaroundRouter);
app.use("/api/code-churn", codeChurnRouter);
app.use("/api/contributors", contributorsRouter);

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`  GET http://localhost:${PORT}/api/summary`);
  console.log(`  GET http://localhost:${PORT}/api/timeseries`);
});

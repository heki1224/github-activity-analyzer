import express from "express";
import { summaryRouter } from "./routes/summary";
import { timeseriesRouter } from "./routes/timeseries";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use("/api/summary", summaryRouter);
app.use("/api/timeseries", timeseriesRouter);

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`  GET http://localhost:${PORT}/api/summary`);
  console.log(`  GET http://localhost:${PORT}/api/timeseries`);
});

import type Database from "better-sqlite3";

export interface Summary {
  pr_count: number;
  commit_count: number;
  avg_lead_time_hours: number;
}

export interface HeatmapCell {
  dow: number;
  hour: number;
  count: number;
}

export interface PrBucket {
  bucket: string;
  count: number;
}

export interface Timeseries {
  weekly_commits: { week: string; count: number }[];
  reviewer_activity: { reviewer: string; count: number }[];
}

export function getSummary(db: Database.Database): Summary {
  const prCount = (
    db.prepare("SELECT COUNT(*) as count FROM pull_requests").get() as { count: number }
  ).count;

  const commitCount = (
    db.prepare("SELECT COUNT(*) as count FROM commits").get() as { count: number }
  ).count;

  const avgRow = db
    .prepare(
      `SELECT AVG((julianday(merged_at) - julianday(created_at)) * 24) as avg_hours
       FROM pull_requests WHERE merged_at IS NOT NULL`
    )
    .get() as { avg_hours: number | null };

  return {
    pr_count: prCount,
    commit_count: commitCount,
    avg_lead_time_hours: avgRow.avg_hours
      ? Math.round(avgRow.avg_hours * 10) / 10
      : 0,
  };
}

export function getTimeseries(db: Database.Database): Timeseries {
  const weeklyCommits = db
    .prepare(
      `SELECT strftime('%Y-W%W', committed_at) as week, COUNT(*) as count
       FROM commits GROUP BY week ORDER BY week`
    )
    .all() as { week: string; count: number }[];

  const reviewerActivity = db
    .prepare(
      `SELECT reviewer, COUNT(*) as count
       FROM reviews GROUP BY reviewer ORDER BY count DESC LIMIT 10`
    )
    .all() as { reviewer: string; count: number }[];

  return { weekly_commits: weeklyCommits, reviewer_activity: reviewerActivity };
}

export function getHeatmap(db: Database.Database): HeatmapCell[] {
  return db
    .prepare(
      `SELECT
         CAST(strftime('%w', committed_at, 'localtime') AS INTEGER) as dow,
         CAST(strftime('%H', committed_at, 'localtime') AS INTEGER) as hour,
         COUNT(*) as count
       FROM commits
       GROUP BY dow, hour`
    )
    .all() as HeatmapCell[];
}

export function getPrDistribution(db: Database.Database): PrBucket[] {
  return db
    .prepare(
      `SELECT
         CASE
           WHEN hours < 4   THEN '0-4h'
           WHEN hours < 12  THEN '4-12h'
           WHEN hours < 24  THEN '12-24h'
           WHEN hours < 72  THEN '1-3d'
           WHEN hours < 168 THEN '3-7d'
           ELSE '7d+'
         END as bucket,
         COUNT(*) as count
       FROM (
         SELECT (julianday(merged_at) - julianday(created_at)) * 24 as hours
         FROM pull_requests
         WHERE merged_at IS NOT NULL
       )
       GROUP BY bucket
       ORDER BY CASE bucket
         WHEN '0-4h'   THEN 1
         WHEN '4-12h'  THEN 2
         WHEN '12-24h' THEN 3
         WHEN '1-3d'   THEN 4
         WHEN '3-7d'   THEN 5
         ELSE 6
       END`
    )
    .all() as PrBucket[];
}

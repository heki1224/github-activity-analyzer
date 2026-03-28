import type Database from "better-sqlite3";

export interface Summary {
  pr_count: number;
  commit_count: number;
  avg_lead_time_hours: number;
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

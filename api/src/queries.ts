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

export interface ReviewTurnaround {
  avg_hours: number;
  by_repo: { repo: string; avg_hours: number }[];
}

export interface CodeChurnWeek {
  week: string;
  additions: number;
  deletions: number;
}

export interface Contributors {
  commits: { author: string; count: number }[];
  prs: { author: string; count: number }[];
  reviews: { reviewer: string; count: number }[];
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

export function getReviewTurnaround(db: Database.Database): ReviewTurnaround {
  // Average hours from PR created_at to first real review (excluding bots and self-reviews)
  const rows = db
    .prepare(
      `SELECT p.repo,
              AVG((julianday(r.submitted_at) - julianday(p.created_at)) * 24) as avg_hours
       FROM pull_requests p
       JOIN (
         SELECT pr_number, repo, MIN(submitted_at) as submitted_at
         FROM reviews
         WHERE reviewer NOT LIKE '%[bot]%'
           AND reviewer != (
             SELECT author FROM pull_requests p2
             WHERE p2.number = pr_number AND p2.repo = reviews.repo
           )
           AND state IN ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED')
         GROUP BY pr_number, repo
       ) r ON p.number = r.pr_number AND p.repo = r.repo
       GROUP BY p.repo`
    )
    .all() as { repo: string; avg_hours: number | null }[];

  const byRepo = rows
    .filter((r) => r.avg_hours != null)
    .map((r) => ({
      repo: r.repo,
      avg_hours: Math.round((r.avg_hours as number) * 10) / 10,
    }));

  const overall =
    byRepo.length > 0
      ? Math.round((byRepo.reduce((s, r) => s + r.avg_hours, 0) / byRepo.length) * 10) / 10
      : 0;

  return { avg_hours: overall, by_repo: byRepo };
}

export function getCodeChurn(db: Database.Database): CodeChurnWeek[] {
  const rows = db
    .prepare(
      `SELECT week_ts, SUM(additions) as additions, SUM(deletions) as deletions
       FROM weekly_code_stats
       GROUP BY week_ts
       ORDER BY week_ts`
    )
    .all() as { week_ts: number; additions: number; deletions: number }[];

  return rows.map((r) => ({
    week: new Date(r.week_ts * 1000).toISOString().slice(0, 10),
    additions: r.additions,
    deletions: r.deletions,
  }));
}

export function getContributors(db: Database.Database): Contributors {
  const commits = db
    .prepare(
      `SELECT author, COUNT(*) as count FROM commits GROUP BY author ORDER BY count DESC LIMIT 20`
    )
    .all() as { author: string; count: number }[];

  const prs = db
    .prepare(
      `SELECT author, COUNT(*) as count FROM pull_requests WHERE author != '' GROUP BY author ORDER BY count DESC LIMIT 20`
    )
    .all() as { author: string; count: number }[];

  const reviews = db
    .prepare(
      `SELECT reviewer, COUNT(*) as count FROM reviews WHERE reviewer NOT LIKE '%[bot]%' GROUP BY reviewer ORDER BY count DESC LIMIT 20`
    )
    .all() as { reviewer: string; count: number }[];

  return { commits, prs, reviews };
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

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { openDb } from "../src/db";
import { getSummary, getTimeseries, getHeatmap, getPrDistribution, getReviewTurnaround, getCodeChurn, getContributors } from "../src/queries";
import type Database from "better-sqlite3";

const SCHEMA_PATH = resolve(__dirname, "../../collector/schema.sql");
const schema = readFileSync(SCHEMA_PATH, "utf-8");

let db: Database.Database;

beforeAll(() => {
  db = openDb(":memory:");
  db.exec(schema);

  db.prepare(
    `INSERT INTO pull_requests (number, repo, title, author, created_at, merged_at, review_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(1, "org/repo", "feat: add login", "alice", "2026-01-01T00:00:00Z", "2026-01-02T12:00:00Z", 2);

  db.prepare(
    `INSERT INTO pull_requests (number, repo, title, author, created_at, merged_at, review_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(2, "org/repo", "fix: typo", "alice", "2026-01-03T00:00:00Z", null, 0);

  db.prepare(
    `INSERT INTO commits (sha, repo, author, committed_at) VALUES (?, ?, ?, ?)`
  ).run("abc123", "org/repo", "alice", "2026-01-10T10:00:00Z");

  db.prepare(
    `INSERT INTO commits (sha, repo, author, committed_at) VALUES (?, ?, ?, ?)`
  ).run("def456", "org/repo", "alice", "2026-01-17T11:00:00Z");

  db.prepare(
    `INSERT INTO reviews (pr_number, repo, reviewer, submitted_at, state) VALUES (?, ?, ?, ?, ?)`
  ).run(1, "org/repo", "bob", "2026-01-01T06:00:00Z", "APPROVED");

  db.prepare(
    `INSERT INTO reviews (pr_number, repo, reviewer, submitted_at, state) VALUES (?, ?, ?, ?, ?)`
  ).run(1, "org/repo", "carol", "2026-01-01T08:00:00Z", "COMMENTED");

  db.prepare(
    `INSERT INTO weekly_code_stats (week_ts, repo, additions, deletions) VALUES (?, ?, ?, ?)`
  ).run(1735689600, "org/repo", 500, 200);

  db.prepare(
    `INSERT INTO weekly_code_stats (week_ts, repo, additions, deletions) VALUES (?, ?, ?, ?)`
  ).run(1736294400, "org/repo", 300, 100);
});

afterAll(() => {
  db.close();
});

describe("getSummary (integration)", () => {
  it("counts PRs and commits from real DB", () => {
    const result = getSummary(db);
    expect(result.pr_count).toBe(2);
    expect(result.commit_count).toBe(2);
  });

  it("calculates avg lead time only from merged PRs", () => {
    // PR#1: merged_at - created_at = 36h
    const result = getSummary(db);
    expect(result.avg_lead_time_hours).toBe(36);
  });
});

describe("getTimeseries (integration)", () => {
  it("groups commits by week", () => {
    const result = getTimeseries(db);
    expect(result.weekly_commits.length).toBeGreaterThan(0);
    expect(result.weekly_commits[0]).toHaveProperty("week");
    expect(result.weekly_commits[0]).toHaveProperty("count");
  });

  it("returns reviewer activity from real DB", () => {
    const result = getTimeseries(db);
    expect(result.reviewer_activity).toHaveLength(2);
    const reviewers = result.reviewer_activity.map((r) => r.reviewer);
    expect(reviewers).toContain("bob");
    expect(reviewers).toContain("carol");
  });
});

describe("getHeatmap (integration)", () => {
  it("returns cells with dow and hour", () => {
    const result = getHeatmap(db);
    expect(result.length).toBeGreaterThan(0);
    for (const cell of result) {
      expect(cell.dow).toBeGreaterThanOrEqual(0);
      expect(cell.dow).toBeLessThanOrEqual(6);
      expect(cell.hour).toBeGreaterThanOrEqual(0);
      expect(cell.hour).toBeLessThanOrEqual(23);
      expect(cell.count).toBeGreaterThan(0);
    }
  });
});

describe("getReviewTurnaround (integration)", () => {
  it("returns avg_hours and by_repo array", () => {
    const result = getReviewTurnaround(db);
    expect(result).toHaveProperty("avg_hours");
    expect(result).toHaveProperty("by_repo");
    expect(typeof result.avg_hours).toBe("number");
  });

  it("calculates turnaround: PR#1 created 00:00, first review by bob at 06:00 = 6h", () => {
    const result = getReviewTurnaround(db);
    // bob reviewed PR#1 at 06:00 (6h after creation), carol at 08:00 — first non-self is bob
    expect(result.avg_hours).toBe(6);
  });
});

describe("getCodeChurn (integration)", () => {
  it("returns weekly churn with week, additions, deletions", () => {
    const result = getCodeChurn(db);
    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty("week");
    expect(result[0]).toHaveProperty("additions");
    expect(result[0]).toHaveProperty("deletions");
    expect(result[0].additions).toBe(500);
    expect(result[1].deletions).toBe(100);
  });
});

describe("getContributors (integration)", () => {
  it("returns commits, prs, reviews arrays", () => {
    const result = getContributors(db);
    expect(result).toHaveProperty("commits");
    expect(result).toHaveProperty("prs");
    expect(result).toHaveProperty("reviews");
  });

  it("commits by alice", () => {
    const result = getContributors(db);
    expect(result.commits[0].author).toBe("alice");
    expect(result.commits[0].count).toBe(2);
  });

  it("prs by alice", () => {
    const result = getContributors(db);
    const alice = result.prs.find((p) => p.author === "alice");
    expect(alice).toBeDefined();
    expect(alice!.count).toBe(2);
  });

  it("reviews excludes bots", () => {
    const result = getContributors(db);
    const reviewers = result.reviews.map((r) => r.reviewer);
    expect(reviewers).not.toContain("github-actions[bot]");
  });
});

describe("getPrDistribution (integration)", () => {
  it("returns distribution for merged PRs only", () => {
    // PR#1: 36h lead time → '1-3d' bucket
    const result = getPrDistribution(db);
    expect(result.length).toBeGreaterThan(0);
    const buckets = result.map((r) => r.bucket);
    expect(buckets).toContain("1-3d");
  });

  it("each bucket has valid name and positive count", () => {
    const valid = new Set(["0-4h", "4-12h", "12-24h", "1-3d", "3-7d", "7d+"]);
    const result = getPrDistribution(db);
    for (const row of result) {
      expect(valid.has(row.bucket)).toBe(true);
      expect(row.count).toBeGreaterThan(0);
    }
  });
});

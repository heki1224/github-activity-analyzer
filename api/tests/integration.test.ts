import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { openDb } from "../src/db";
import { getSummary, getTimeseries, getHeatmap, getPrDistribution } from "../src/queries";
import type Database from "better-sqlite3";

const SCHEMA_PATH = resolve(__dirname, "../../collector/schema.sql");
const schema = readFileSync(SCHEMA_PATH, "utf-8");

let db: Database.Database;

beforeAll(() => {
  db = openDb(":memory:");
  db.exec(schema);

  db.prepare(
    `INSERT INTO pull_requests (number, repo, title, created_at, merged_at, review_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(1, "org/repo", "feat: add login", "2026-01-01T00:00:00Z", "2026-01-02T12:00:00Z", 2);

  db.prepare(
    `INSERT INTO pull_requests (number, repo, title, created_at, merged_at, review_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(2, "org/repo", "fix: typo", "2026-01-03T00:00:00Z", null, 0);

  db.prepare(
    `INSERT INTO commits (sha, repo, author, committed_at) VALUES (?, ?, ?, ?)`
  ).run("abc123", "org/repo", "alice", "2026-01-10T10:00:00Z");

  db.prepare(
    `INSERT INTO commits (sha, repo, author, committed_at) VALUES (?, ?, ?, ?)`
  ).run("def456", "org/repo", "alice", "2026-01-17T11:00:00Z");

  db.prepare(
    `INSERT INTO reviews (pr_number, repo, reviewer, submitted_at) VALUES (?, ?, ?, ?)`
  ).run(1, "org/repo", "bob", "2026-01-01T06:00:00Z");

  db.prepare(
    `INSERT INTO reviews (pr_number, repo, reviewer, submitted_at) VALUES (?, ?, ?, ?)`
  ).run(1, "org/repo", "carol", "2026-01-01T08:00:00Z");
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

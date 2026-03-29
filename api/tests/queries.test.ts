import { describe, it, expect, vi } from "vitest";
import { getSummary, getTimeseries, getHeatmap, getPrDistribution } from "../src/queries";
import type Database from "better-sqlite3";

function mockDb(
  prepareResults: Array<{ get?: () => unknown; all?: () => unknown[] }>
): Database.Database {
  let callIndex = 0;
  return {
    prepare: vi.fn(() => {
      const result = prepareResults[callIndex++];
      return result;
    }),
  } as unknown as Database.Database;
}

describe("getSummary", () => {
  it("returns formatted metrics", () => {
    const db = mockDb([
      { get: () => ({ count: 10 }) },
      { get: () => ({ count: 50 }) },
      { get: () => ({ avg_hours: 4.5 }) },
    ]);

    expect(getSummary(db)).toEqual({
      pr_count: 10,
      commit_count: 50,
      avg_lead_time_hours: 4.5,
    });
  });

  it("returns 0 avg lead time when no merged PRs", () => {
    const db = mockDb([
      { get: () => ({ count: 0 }) },
      { get: () => ({ count: 0 }) },
      { get: () => ({ avg_hours: null }) },
    ]);

    expect(getSummary(db).avg_lead_time_hours).toBe(0);
  });

  it("rounds avg lead time to 1 decimal", () => {
    const db = mockDb([
      { get: () => ({ count: 5 }) },
      { get: () => ({ count: 20 }) },
      { get: () => ({ avg_hours: 3.666 }) },
    ]);

    expect(getSummary(db).avg_lead_time_hours).toBe(3.7);
  });
});

describe("getTimeseries", () => {
  it("returns weekly commits and reviewer activity", () => {
    const db = mockDb([
      { all: () => [{ week: "2026-W01", count: 5 }] },
      { all: () => [{ reviewer: "alice", count: 3 }] },
    ]);

    expect(getTimeseries(db)).toEqual({
      weekly_commits: [{ week: "2026-W01", count: 5 }],
      reviewer_activity: [{ reviewer: "alice", count: 3 }],
    });
  });

  it("returns empty arrays when no data", () => {
    const db = mockDb([
      { all: () => [] },
      { all: () => [] },
    ]);

    const result = getTimeseries(db);
    expect(result.weekly_commits).toEqual([]);
    expect(result.reviewer_activity).toEqual([]);
  });
});

describe("getHeatmap", () => {
  it("returns heatmap cells", () => {
    const db = mockDb([
      { all: () => [{ dow: 1, hour: 10, count: 5 }, { dow: 3, hour: 14, count: 2 }] },
    ]);
    const result = getHeatmap(db);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ dow: 1, hour: 10, count: 5 });
  });

  it("returns empty array when no commits", () => {
    const db = mockDb([{ all: () => [] }]);
    expect(getHeatmap(db)).toEqual([]);
  });
});

describe("getPrDistribution", () => {
  it("returns bucket distribution", () => {
    const db = mockDb([
      { all: () => [{ bucket: "0-4h", count: 3 }, { bucket: "1-3d", count: 7 }] },
    ]);
    const result = getPrDistribution(db);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ bucket: "0-4h", count: 3 });
  });

  it("returns empty array when no merged PRs", () => {
    const db = mockDb([{ all: () => [] }]);
    expect(getPrDistribution(db)).toEqual([]);
  });
});

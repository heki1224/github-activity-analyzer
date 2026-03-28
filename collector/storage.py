import sqlite3
from typing import Dict, List

_SCHEMA = """
CREATE TABLE IF NOT EXISTS pull_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL,
    repo TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    merged_at TEXT,
    review_count INTEGER DEFAULT 0,
    UNIQUE(repo, number)
);
CREATE TABLE IF NOT EXISTS commits (
    sha TEXT PRIMARY KEY,
    repo TEXT NOT NULL,
    author TEXT NOT NULL,
    committed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_number INTEGER NOT NULL,
    repo TEXT NOT NULL,
    reviewer TEXT NOT NULL,
    submitted_at TEXT NOT NULL
);
"""


class Storage:
    def __init__(self, db_path: str = "activity.db") -> None:
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_SCHEMA)
        self.conn.commit()

    def upsert_pr(self, repo: str, pr: dict, review_count: int) -> None:
        self.conn.execute(
            """
            INSERT INTO pull_requests (number, repo, title, created_at, merged_at, review_count)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(repo, number) DO UPDATE SET
              merged_at = excluded.merged_at,
              review_count = excluded.review_count
            """,
            (pr["number"], repo, pr["title"], pr["created_at"], pr.get("merged_at"), review_count),
        )
        self.conn.commit()

    def upsert_commit(self, repo: str, commit: dict) -> None:
        self.conn.execute(
            """
            INSERT OR IGNORE INTO commits (sha, repo, author, committed_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                commit["sha"],
                repo,
                commit["commit"]["author"]["name"],
                commit["commit"]["author"]["date"],
            ),
        )
        self.conn.commit()

    def upsert_review(self, repo: str, pr_number: int, review: dict) -> None:
        login = review.get("user", {}).get("login", "unknown")
        submitted_at = review.get("submitted_at", "")
        self.conn.execute(
            """
            INSERT OR IGNORE INTO reviews (pr_number, repo, reviewer, submitted_at)
            VALUES (?, ?, ?, ?)
            """,
            (pr_number, repo, login, submitted_at),
        )
        self.conn.commit()

    def get_all_prs(self) -> List[dict]:
        rows = self.conn.execute("SELECT * FROM pull_requests").fetchall()
        return [dict(r) for r in rows]

    def get_all_commits(self) -> List[dict]:
        rows = self.conn.execute("SELECT * FROM commits").fetchall()
        return [dict(r) for r in rows]

    def get_all_reviews(self) -> List[dict]:
        rows = self.conn.execute("SELECT * FROM reviews").fetchall()
        return [dict(r) for r in rows]

    def close(self) -> None:
        self.conn.close()

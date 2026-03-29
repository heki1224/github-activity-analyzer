import os
import sqlite3
from typing import Dict, List

_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def _load_schema() -> str:
    with open(_SCHEMA_PATH, "r") as f:
        return f.read()


class Storage:
    def __init__(self, db_path: str = "activity.db") -> None:
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_load_schema())
        self._migrate()
        self.conn.commit()

    def _migrate(self) -> None:
        """Add columns that may not exist in older DBs."""
        migrations = [
            "ALTER TABLE pull_requests ADD COLUMN author TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE reviews ADD COLUMN state TEXT NOT NULL DEFAULT ''",
        ]
        for sql in migrations:
            try:
                self.conn.execute(sql)
            except sqlite3.OperationalError:
                pass  # column already exists

    def upsert_pr(self, repo: str, pr: dict, review_count: int) -> None:
        self.conn.execute(
            """
            INSERT INTO pull_requests (number, repo, title, author, created_at, merged_at, review_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(repo, number) DO UPDATE SET
              author = excluded.author,
              merged_at = excluded.merged_at,
              review_count = excluded.review_count
            """,
            (pr["number"], repo, pr["title"], pr.get("author", ""), pr["created_at"], pr.get("merged_at"), review_count),
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
        state = review.get("state", "")
        self.conn.execute(
            """
            INSERT OR IGNORE INTO reviews (pr_number, repo, reviewer, submitted_at, state)
            VALUES (?, ?, ?, ?, ?)
            """,
            (pr_number, repo, login, submitted_at, state),
        )
        self.conn.commit()

    def upsert_weekly_stats(self, repo: str, week_ts: int, additions: int, deletions: int) -> None:
        self.conn.execute(
            """
            INSERT INTO weekly_code_stats (week_ts, repo, additions, deletions)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(repo, week_ts) DO UPDATE SET
              additions = excluded.additions,
              deletions = excluded.deletions
            """,
            (week_ts, repo, additions, deletions),
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

    def get_all_weekly_stats(self) -> List[dict]:
        rows = self.conn.execute("SELECT * FROM weekly_code_stats ORDER BY week_ts").fetchall()
        return [dict(r) for r in rows]

    def close(self) -> None:
        self.conn.close()

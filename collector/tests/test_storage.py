import tempfile
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from storage import Storage


def _make_pr(number: int, merged: bool = True, author: str = "alice") -> dict:
    return {
        "number": number,
        "title": f"PR {number}",
        "author": author,
        "created_at": "2026-01-01T00:00:00Z",
        "merged_at": "2026-01-02T00:00:00Z" if merged else None,
    }


def _make_commit(sha: str) -> dict:
    return {
        "sha": sha,
        "commit": {"author": {"name": "Alice", "date": "2026-01-05T10:00:00Z"}},
    }


def test_upsert_pr_and_retrieve():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        s = Storage(db_path)
        s.upsert_pr("myrepo", _make_pr(1), review_count=3)
        prs = s.get_all_prs()
        assert len(prs) == 1
        assert prs[0]["number"] == 1
        assert prs[0]["review_count"] == 3
        s.close()
    finally:
        os.unlink(db_path)


def test_upsert_pr_is_idempotent():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        s = Storage(db_path)
        s.upsert_pr("myrepo", _make_pr(1), review_count=1)
        s.upsert_pr("myrepo", _make_pr(1), review_count=5)
        prs = s.get_all_prs()
        assert len(prs) == 1
        assert prs[0]["review_count"] == 5
        s.close()
    finally:
        os.unlink(db_path)


def test_upsert_commit_is_idempotent():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        s = Storage(db_path)
        s.upsert_commit("myrepo", _make_commit("abc123"))
        s.upsert_commit("myrepo", _make_commit("abc123"))
        commits = s.get_all_commits()
        assert len(commits) == 1
        assert commits[0]["sha"] == "abc123"
        s.close()
    finally:
        os.unlink(db_path)


def test_upsert_review_and_retrieve():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        s = Storage(db_path)
        review = {"user": {"login": "alice"}, "submitted_at": "2026-01-05T10:00:00Z", "state": "APPROVED"}
        s.upsert_review("myrepo", pr_number=1, review=review)
        reviews = s.get_all_reviews()
        assert len(reviews) == 1
        assert reviews[0]["reviewer"] == "alice"
        assert reviews[0]["state"] == "APPROVED"
        s.close()
    finally:
        os.unlink(db_path)


def test_upsert_weekly_stats_and_retrieve():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        s = Storage(db_path)
        s.upsert_weekly_stats("myrepo", 1700000000, 100, 50)
        s.upsert_weekly_stats("myrepo", 1700604800, 200, 80)
        stats = s.get_all_weekly_stats()
        assert len(stats) == 2
        assert stats[0]["additions"] == 100
        assert stats[1]["deletions"] == 80
        # idempotent
        s.upsert_weekly_stats("myrepo", 1700000000, 999, 1)
        stats = s.get_all_weekly_stats()
        assert len(stats) == 2
        assert stats[0]["additions"] == 999
        s.close()
    finally:
        os.unlink(db_path)

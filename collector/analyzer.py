from datetime import datetime
from typing import Optional


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def calc_pr_lead_time_hours(prs: list[dict]) -> float:
    """Average hours from created_at to merged_at (merged PRs only).
    Input: storage-format dicts with keys: created_at (str), merged_at (str|None)
    """
    durations = []
    for pr in prs:
        created = _parse_dt(pr.get("created_at"))
        merged = _parse_dt(pr.get("merged_at"))
        if created and merged:
            durations.append((merged - created).total_seconds() / 3600)
    return round(sum(durations) / len(durations), 1) if durations else 0.0


def calc_weekly_commit_counts(commits: list[dict]) -> dict[str, int]:
    """Count commits per week (YYYY-Www, %Y-W%W format).
    Input: storage-format dicts with key: committed_at (str)
    """
    counts: dict[str, int] = {}
    for commit in commits:
        dt = _parse_dt(commit.get("committed_at"))
        if dt:
            week = dt.strftime("%Y-W%W")
            counts[week] = counts.get(week, 0) + 1
    return dict(sorted(counts.items()))


def calc_reviewer_activity(reviews: list[dict]) -> dict[str, int]:
    """Count reviews per reviewer, sorted by count descending.
    Input: storage-format dicts with key: reviewer (str)
    """
    counts: dict[str, int] = {}
    for review in reviews:
        login = review.get("reviewer", "unknown")
        counts[login] = counts.get(login, 0) + 1
    return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))

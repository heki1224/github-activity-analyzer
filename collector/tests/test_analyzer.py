import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from analyzer import calc_pr_lead_time_hours, calc_weekly_commit_counts, calc_reviewer_activity


def test_calc_pr_lead_time_hours_merged():
    prs = [
        {"created_at": "2026-01-01T00:00:00Z", "merged_at": "2026-01-01T02:00:00Z"},
        {"created_at": "2026-01-02T00:00:00Z", "merged_at": "2026-01-02T06:00:00Z"},
    ]
    # (2h + 6h) / 2 = 4.0
    assert calc_pr_lead_time_hours(prs) == 4.0


def test_calc_pr_lead_time_hours_no_merged():
    prs = [{"created_at": "2026-01-01T00:00:00Z", "merged_at": None}]
    assert calc_pr_lead_time_hours(prs) == 0.0


def test_calc_pr_lead_time_hours_empty():
    assert calc_pr_lead_time_hours([]) == 0.0


def test_calc_weekly_commit_counts():
    # 2026-01-05 (Mon) → %W=01, 2026-01-12 (Mon) → %W=02
    commits = [
        {"committed_at": "2026-01-05T10:00:00Z"},
        {"committed_at": "2026-01-06T10:00:00Z"},
        {"committed_at": "2026-01-12T10:00:00Z"},
    ]
    result = calc_weekly_commit_counts(commits)
    assert result["2026-W01"] == 2
    assert result["2026-W02"] == 1


def test_calc_weekly_commit_counts_empty():
    assert calc_weekly_commit_counts([]) == {}


def test_calc_reviewer_activity():
    reviews = [
        {"reviewer": "alice"},
        {"reviewer": "alice"},
        {"reviewer": "bob"},
    ]
    result = calc_reviewer_activity(reviews)
    assert result["alice"] == 2
    assert result["bob"] == 1
    assert list(result.keys())[0] == "alice"  # sorted by count desc


def test_calc_reviewer_activity_empty():
    assert calc_reviewer_activity([]) == {}

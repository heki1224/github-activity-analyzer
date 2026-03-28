import argparse
import sys

from github_client import GitHubClient
from storage import Storage
from analyzer import calc_pr_lead_time_hours, calc_weekly_commit_counts, calc_reviewer_activity


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect GitHub activity into SQLite")
    parser.add_argument("--org", required=True, help="GitHub organization or user")
    parser.add_argument("--repo", required=True, help="Repository name")
    parser.add_argument("--days", type=int, default=90, help="Days to look back (default: 90)")
    parser.add_argument("--db", default="activity.db", help="SQLite DB path (default: activity.db)")
    args = parser.parse_args()

    try:
        client = GitHubClient()
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    storage = Storage(args.db)

    print(f"Collecting PRs for {args.org}/{args.repo} (last {args.days} days)...")
    prs = client.get_pull_requests(args.org, args.repo, args.days)
    all_reviews = []
    for pr in prs:
        reviews = client.get_reviews(args.org, args.repo, pr["number"])
        storage.upsert_pr(args.repo, pr, review_count=len(reviews))
        for review in reviews:
            storage.upsert_review(args.repo, pr_number=pr["number"], review=review)
        all_reviews.extend(reviews)

    print("Collecting commits...")
    commits = client.get_commits(args.org, args.repo, args.days)
    for commit in commits:
        storage.upsert_commit(args.repo, commit)

    db_prs = storage.get_all_prs()
    db_commits = storage.get_all_commits()
    db_reviews = storage.get_all_reviews()

    lead_time = calc_pr_lead_time_hours(db_prs)
    weekly = calc_weekly_commit_counts(db_commits)
    reviewer_activity = calc_reviewer_activity(db_reviews)

    print("\n=== Summary ===")
    print(f"PRs collected:     {len(prs)}")
    print(f"Commits collected: {len(commits)}")
    print(f"Avg PR lead time:  {lead_time}h")
    print(f"Top reviewers:     {list(reviewer_activity.items())[:3]}")
    print(f"Weekly commits:    {list(weekly.items())[-3:]}")
    print(f"\nData saved to {args.db}")

    storage.close()


if __name__ == "__main__":
    main()

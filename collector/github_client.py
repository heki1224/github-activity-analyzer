import os
import time
import requests
from datetime import datetime, timedelta, timezone
from typing import Optional

BASE_URL = "https://api.github.com"


class GitHubClient:
    def __init__(self, token: Optional[str] = None) -> None:
        resolved_token = token or os.environ.get("GITHUB_TOKEN")
        if not resolved_token:
            raise RuntimeError("GITHUB_TOKEN is not set")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {resolved_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })

    def _get(self, path: str, params: Optional[dict] = None) -> list:
        resp = self.session.get(f"{BASE_URL}{path}", params=params or {})
        if resp.status_code == 403:
            retry_after = int(resp.headers.get("Retry-After", 60))
            time.sleep(retry_after)
            return self._get(path, params)
        resp.raise_for_status()
        return resp.json()

    def get_pull_requests(self, owner: str, repo: str, days: int) -> list[dict]:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        prs: list[dict] = []
        page = 1
        while True:
            batch = self._get(
                f"/repos/{owner}/{repo}/pulls",
                {"state": "all", "per_page": 100, "page": page},
            )
            if not batch:
                break
            for pr in batch:
                if pr["created_at"] < since:
                    return prs
                prs.append(pr)
            page += 1
        return prs

    def get_reviews(self, owner: str, repo: str, pr_number: int) -> list[dict]:
        return self._get(f"/repos/{owner}/{repo}/pulls/{pr_number}/reviews")  # type: ignore[return-value]

    def get_commits(self, owner: str, repo: str, days: int) -> list[dict]:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        commits: list[dict] = []
        page = 1
        while True:
            batch = self._get(
                f"/repos/{owner}/{repo}/commits",
                {"since": since, "per_page": 100, "page": page},
            )
            if not batch:
                break
            commits.extend(batch)  # type: ignore[arg-type]
            page += 1
        return commits

import os
import sys
from unittest.mock import patch, MagicMock
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from github_client import GitHubClient


def _make_mock_session(pages: list[list]) -> MagicMock:
    """Returns a mock session whose .get() returns pages in sequence, then empty list."""
    session = MagicMock()
    responses = []
    for page in pages:
        resp = MagicMock(status_code=200)
        resp.json.return_value = page
        responses.append(resp)
    empty = MagicMock(status_code=200)
    empty.json.return_value = []
    responses.append(empty)
    session.get.side_effect = responses
    return session


def test_get_reviews_returns_list():
    with patch("github_client.requests.Session") as MockSession:
        session = _make_mock_session([[
            {"id": 1, "user": {"login": "alice"}, "submitted_at": "2026-01-01T00:00:00Z"}
        ]])
        MockSession.return_value = session

        client = GitHubClient(token="test-token")
        reviews = client.get_reviews("myorg", "myrepo", 42)

    assert len(reviews) == 1
    assert reviews[0]["user"]["login"] == "alice"


def test_get_commits_returns_list():
    with patch("github_client.requests.Session") as MockSession:
        session = _make_mock_session([[
            {"sha": "abc123", "commit": {"author": {"name": "Alice", "date": "2026-01-05T10:00:00Z"}}}
        ]])
        MockSession.return_value = session

        client = GitHubClient(token="test-token")
        commits = client.get_commits("myorg", "myrepo", days=90)

    assert len(commits) == 1
    assert commits[0]["sha"] == "abc123"


def test_rate_limit_retries():
    """Client sleeps on 403 with Retry-After and retries."""
    with patch("github_client.requests.Session") as MockSession, \
         patch("github_client.time.sleep") as mock_sleep:
        session = MagicMock()
        rate_resp = MagicMock(status_code=403)
        rate_resp.headers = {"Retry-After": "5"}
        ok_resp = MagicMock(status_code=200)
        ok_resp.json.return_value = []
        session.get.side_effect = [rate_resp, ok_resp]
        MockSession.return_value = session

        client = GitHubClient(token="test-token")
        result = client.get_reviews("myorg", "myrepo", 1)

    mock_sleep.assert_called_once_with(5)
    assert result == []

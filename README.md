# github-activity-analyzer

A GitHub repository activity analyzer built with Python, TypeScript, and JavaScript.

Collects PR, commit, and review data from the GitHub API and visualizes it in a browser dashboard.

## Architecture

```
GitHub API → Python collector → SQLite → TypeScript API → JavaScript dashboard
```

## Setup

### 1. Clone and configure

```bash
git clone https://github.com/heki1224/github-activity-analyzer.git
cd github-activity-analyzer
cp .env.example .env
# Edit .env: set GITHUB_TOKEN
```

### 2. Run the collector (Python)

```bash
cd collector
pip install -r requirements.txt
python main.py --org YOUR_ORG --repo YOUR_REPO --days 90
```

### 3. Start the API (TypeScript)

```bash
cd api
npm install
npm run dev
# API running at http://localhost:3001
```

### 4. Open the dashboard (JavaScript)

```bash
open dashboard/index.html
```

## Automated Collection (crontab)

Run `scripts/collect.sh` daily via crontab to keep data up to date.

### Setup

```bash
# 1. Set target org/repo in your shell profile or crontab
export COLLECT_ORG=your-org
export COLLECT_REPO=your-repo
export COLLECT_DAYS=30   # optional, default: 30

# 2. Make sure .env has GITHUB_TOKEN set
cp .env.example .env
# Edit .env: set GITHUB_TOKEN

# 3. Add to crontab (runs every day at 08:00)
crontab -e
```

Add this line to crontab:

```
PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
0 8 * * * COLLECT_ORG=your-org COLLECT_REPO=your-repo /path/to/github-activity-analyzer/scripts/collect.sh
```

Logs are written to `logs/collect.log` (auto-rotated at 1MB).

> **Note**: cron does not run while Mac is asleep. If you need guaranteed daily execution, use `launchd` instead.

## Development

### Run Python tests

```bash
cd collector && python -m pytest tests/ -v
```

### Run TypeScript tests

```bash
cd api && npm test
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Collector | Python 3.9+, requests, pytest |
| Database | SQLite |
| API | TypeScript 5, Express 4, better-sqlite3, Vitest |
| Dashboard | Vanilla JavaScript, Chart.js |

## License

MIT

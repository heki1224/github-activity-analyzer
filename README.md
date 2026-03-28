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

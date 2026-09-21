# ReviewPilot

AI-powered GitHub pull-request review and issue triage for teams that want faster, safer releases.

ReviewPilot turns a diff into prioritized findings, explains why each finding matters, and gives teams a clean feedback loop from pull request to fix. The repository is designed as a polished open-source starter: useful in demo mode today, extensible to GitHub webhooks, background jobs, and hosted AI providers tomorrow.

## What is included

- Next.js dashboard with review metrics, severity filters, and a review detail view
- FastAPI API with typed request/response contracts
- Deterministic review engine that works without an API key
- Optional OpenAI-compatible provider behind a small service boundary
- SQLAlchemy persistence model ready for PostgreSQL
- Docker Compose for local Postgres, Redis, API, and web services
- GitHub Actions CI for Python tests and frontend checks
- Security-minded defaults: CORS allowlist, request size limits, no secrets in source

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Web dashboard: http://localhost:3000
- API docs: http://localhost:8000/docs
- Health endpoint: http://localhost:8000/api/v1/health

### Run locally without Docker

Backend:

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd apps/web
npm install
npm run dev
```

## API example

```bash
curl -X POST http://localhost:8000/api/v1/reviews/preview \
  -H 'content-type: application/json' \
  -d '{
    "repository": "acme/checkout",
    "pull_request_number": 42,
    "title": "Validate checkout totals",
    "diff": "+++ b/checkout.py\n+def total(items):\n+    return sum(item.price for item in items)"
  }'
```

## Product roadmap

1. GitHub App installation and signed webhook ingestion
2. Redis-backed review jobs with status streaming
3. Repository-specific rule packs and baselines
4. Inline GitHub review comments and issue auto-labeling
5. Team analytics, billing, and audit exports

## Project layout

```text
apps/api   FastAPI service, review engine, persistence boundary
apps/web   Next.js dashboard
docs       architecture notes and API decisions
```

## License

MIT. See `LICENSE`.

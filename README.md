# F1 Express

[![Version](https://img.shields.io/badge/version-1.3.2-blue.svg)](https://github.com/crashdada/f1express)
[![Integrity](https://img.shields.io/badge/integrity-62--point%20pass-green.svg)](https://github.com/crashdada/f1express)

F1 Express is a full-stack F1 data application that combines a historical SQLite knowledge base with live 2026 season JSON overlays. The frontend runs on React + Vite, while a lightweight Express server serves runtime assets, health checks, and container update APIs.

## Highlights

- Historical F1 coverage built from an offline pipeline into `f1.db`
- Live 2026 season overlay from JSON data sources
- In-browser SQL.js querying with IndexedDB cache
- Self-host friendly deployment with Docker health checks and update endpoints
- Separate CI verification and Docker publish workflows

## Quick Start

Requirements:

- Node.js 20+
- Python 3.9+ for collector/pipeline scripts

Install dependencies:

```bash
npm install
pip install -r collector/requirements.txt
```

Run the frontend:

```bash
npm run dev
```

Recommended for local season-data work:

```bash
npm run dev:sync
```

`dev:sync` refreshes `storage/` first so `http://localhost:5173` uses the latest local runtime data before starting Vite.

Run the local server:

```bash
node server.cjs
```

Run the staged data pipeline:

```bash
npm run pipeline:sync
```

Useful options:

```bash
npm run pipeline:sync:full
npm run pipeline:sync:validate
python scripts/sync_f1_data.py --skip-integrity
```

## Project Structure

- `src/`
  React frontend, pages, hooks, and UI components
- `src/utils/f1-data/`
  Modular historical/live data loading helpers
- `tests/`
  Consolidated JavaScript/TypeScript test tree for unit and integration coverage
- `server/`
  Express app assembly, config, middleware, and routes
- `collector/`
  2026 season scraping and enrichment pipeline
- `collector/tools/`
  Ad-hoc collector utilities, grouped into `debug/`, `inspect/`, and `oneoff/`
- `collector/tests/` and `scripts/tests/`
  Python-side pipeline and data integrity verification
- `scripts/`
  Historical data build, normalization, and verification scripts
- `storage/`
  Runtime DB, photos, and season JSON data
- `docker/`
  Container deployment definitions
- `docs/`
  Technical and testing documentation

## Admin and Deployment

For Docker or NAS-style deployment:

```bash
docker compose -f docker/compose.yaml pull
docker compose -f docker/compose.yaml up -d
```

Admin endpoints:

- `GET /api/health`
- `GET /api/check-update`
- `POST /api/self-update`

Optional protection:

- Set `ADMIN_API_TOKEN`
- Send the token with `x-admin-token` or `Authorization: Bearer <token>`

The old CSV upload API has been retired and is no longer part of the runtime server.

## Verification

Recommended local verification:

```bash
npm run test
npm run test:unit
npm run test:integration
npm run build
npm run verify:dist
npm run validate:docker
```

`dist/` is intentionally committed in this repository for direct hosting workflows, so source changes that affect the frontend bundle should include refreshed `dist/` output as part of the same change.

## Data Pipeline

The historical/live data flow is now organized into six phases instead of
treating the old numbered script list as the main abstraction:

1. Prepare: source downloads and pre-rebuild backup
2. Build: normalized database rebuild
3. Enrich: Chinese names, sprint data, fastest lap history, special events
4. Derive: championships, season stats, photo index
5. Publish: collector refinement and runtime sync
6. Validate: integrity checks and optional constructor cross-check

`scripts/pipeline/create_normalized_db.py` only builds normalized base tables.
Final season aggregates are produced later by
`scripts/pipeline/recalculate_stats.py`.

## Further Reading

- [Technical Specification](docs/AGENTS.md)
- [Testing Guide](docs/TESTING.md)
- [Change Log](docs/CHANGELOG.md)
- [Championship Rules](docs/championship_rules.md)

# F1 Express Technical Specification (AGENTS)

> Context ID: `F1_EXPRESS_INTEGRATED_V2`
> Primary Objective: F1 heritage (1950-2025) plus live season overlay (2026+) with a lightweight web runtime.
> Status: Production-ready application with modular frontend data loading and modular Express server.

---

## 1. Logic Architecture

The project now runs as a dual-source data product:

- Heritage data comes from the SQLite database `f1.db`.
- Live season data comes from JSON snapshots for the 2026 season.
- The browser merges both sources at runtime for display and ranking.

### 1.1 Heritage Engine

- Primary store: `f1_storage/f1.db`
- Build source: `scripts/pipeline/`
- Browser access path: `/data/f1.db`
- Runtime access model: SQL.js in the browser plus IndexedDB cache

### 1.2 Live Season Engine

- Source pipeline: `collector/`
- Output files:
  - `f1_storage/schedule_2026.json`
  - `f1_storage/results_2026.json`
  - `f1_storage/drivers_2026.json`
  - `f1_storage/teams_2026.json`
- Sync model: local JSON plus GitHub-hosted mirror fallback

### 1.3 Frontend Runtime Structure

- App shell: `src/App.tsx`
- Shared data hook: `src/hooks/useF1Data.ts`
- Historical data loader: `src/utils/f1Data.ts`
- Modularized data helpers:
  - `src/utils/f1-data/cache.ts`
  - `src/utils/f1-data/constants.ts`
  - `src/utils/f1-data/formatters.ts`
  - `src/utils/f1-data/processors.ts`
  - `src/utils/f1-data/queries.ts`
  - `src/utils/f1-data/season2026.ts`

### 1.4 Server Runtime Structure

The Express server is no longer a single-file controller. It is split into:

- Entry point: `server.cjs`
- App assembly: `server/app.cjs`
- Shared config: `server/config.cjs`
- Middleware:
  - `server/middleware/adminAuth.cjs`
- Routes:
  - `server/routes/health.cjs`
  - `server/routes/updates.cjs`

The previous CSV upload API has been removed and should be considered retired.

---

## 2. Data Pipeline Specs

The historical database pipeline still depends on CSV source truth and enrichment scripts:

| Step | Script Path | Responsibility |
| :--- | :--- | :--- |
| 1 | `scripts/pipeline/download_csv_assets.py` | Asset localization and CSV-related downloads |
| 2 | Internal | Backup of `f1.db` |
| 3 | `scripts/pipeline/create_normalized_db.py` | Rebuild normalized SQLite database |
| 4 | `scripts/pipeline/patch_historical_photos.py` | Historical photo matching |
| 5 | `scripts/pipeline/add_driver_chinese_names.py` | CN/EN driver name enrichment |
| 6 | `scripts/pipeline/import_sprint_data.py` | Sprint data import |
| 7 | `scripts/pipeline/import_fastest_lap.py` | 1950-1959 fastest lap import |
| 8 | `scripts/pipeline/apply_special_events.py` | Permanent historical corrections |
| 9 | `scripts/pipeline/recalculate_championships.cjs` | Championship truth recalculation |
| 10 | `scripts/pipeline/recalculate_stats.py` | Global stats aggregation |
| 11 | `scripts/pipeline/update_photo_index.py` | Photo index generation |
| 12 | Internal flow | Storage sync / deploy handoff |
| 13 | `scripts/tests/test_data_integrity.py` | Integrity verification gate |

---

## 3. Machine-Readable Path Manifest

| Handle | Path | Role |
| :--- | :--- | :--- |
| `DIR_CSV` | `/csv/` | Historical source truth used by the offline build pipeline |
| `STORAGE_ROOT` | `/f1_storage/` | Runtime data root for DB, JSON, and photos |
| `ENTRY_SERVER` | `/server.cjs` | Node entry point for the Express server |
| `DIR_SERVER` | `/server/` | Modularized server app, middleware, and routes |
| `ENTRY_DOCKER` | `/docker/` | Container definitions |

---

## 4. Admin API Interface

Current admin/server behavior:

1. `GET /api/health`
   Used for runtime health probes and Docker health checks.
2. `GET /api/check-update`
   Checks whether Docker Hub has a newer image.
3. `POST /api/self-update`
   Triggers Watchtower-based in-place container refresh.

Admin endpoints support optional token protection:

- Environment variable: `ADMIN_API_TOKEN`
- Accepted headers:
  - `x-admin-token`
  - `Authorization: Bearer <token>`

If `ADMIN_API_TOKEN` is unset, admin routes remain open for local/self-hosted usage.

---

## 5. Ranking Logic

- Total points = historical DB totals plus 2026 JSON totals
- Driver live-season matching uses normalized `firstName|lastName|code`
- Tie-breakers continue to follow FIA-style ordering using wins and podiums

---

## 6. Delivery and CI

Current verification flow:

- Local:
  - `npm run test`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run build`
  - `npm run verify:dist`
  - `npm run validate:docker`
- GitHub Actions:
  - `.github/workflows/ci.yml`
  - `.github/workflows/docker-build.yml`

Docker publication is now gated by verify-first workflow steps before image push.

`dist/` remains a tracked release artifact in this repository, so CI now verifies that committed bundle output is in sync with the current source tree.

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

The historical and live-data build now run as a staged pipeline orchestrated by
`scripts/sync_f1_data.py`.

### 2.1 Phase 1: Prepare

- `scripts/pipeline/download_csv_assets.py`
  Pulls CSV-related remote assets and localizes photo/source files when needed.
- Internal backup flow
  Creates a backup of `f1.db` before a full rebuild.

### 2.2 Phase 2: Build

- `scripts/pipeline/create_normalized_db.py`
  Rebuilds normalized base tables from CSV source truth.
  This stage no longer owns final season aggregates.

### 2.3 Phase 3: Enrich

- `scripts/pipeline/patch_historical_photos.py`
- `scripts/pipeline/add_driver_chinese_names.py`
- `scripts/pipeline/import_sprint_data.py`
- `scripts/pipeline/import_fastest_lap.py`
- `scripts/pipeline/apply_special_events.py`

These scripts enrich the normalized database and runtime assets before standings
are recalculated.

### 2.4 Phase 4: Derive

- `scripts/pipeline/recalculate_championships.cjs`
- `scripts/pipeline/recalculate_stats.py`
- `scripts/pipeline/update_photo_index.py`

`recalculate_stats.py` is the single aggregate-generation step for
`driver_season_stats` and `team_season_stats`.

### 2.5 Phase 5: Publish

- `collector/processors/refine_with_stats.py`
- `collector/syncer.py`
- Internal NAS hot-update path when `NAS_MODE=true`

### 2.6 Phase 6: Validate

- `scripts/tests/test_data_integrity.py`
- `scripts/pipeline/validate_constructor_totals.py` (check-only)

`constructors_full.csv` is validation-only and must not be treated as the
production source for constructor standings.

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

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

- Primary store: `storage/f1.db`
- Build source: `scripts/pipeline/`
- Browser access path: `/data/f1.db`
- Runtime access model: SQL.js in the browser plus IndexedDB cache

### 1.2 Live Season Engine

- Source pipeline: `collector/`
- Output files:
  - `storage/schedule_2026.json`
  - `storage/results_2026.json`
  - `storage/drivers_2026.json`
  - `storage/teams_2026.json`
- Sync model: local JSON plus GitHub-hosted mirror fallback
- `results_2026.json` race identity standard:
  - `round` = season round number (for example `1`, `2`, `3`)
  - `eventId` = Formula1.com race id from `/races/{eventId}/...`

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

The previous CSV upload API has been removed. All input data is now English-standardized and managed via the `/storage/csv/` directory.

---

## 2. Data Pipeline Specs

The historical and live-data build now run as a staged pipeline orchestrated by
`scripts/sync_f1_data.py`.

### 2.1 Phase 1: Prepare

- Internal backup flow
  Creates a backup of `f1.db` before a full rebuild.

### 2.2 Phase 2: Build

- `scripts/pipeline/create_normalized_db.py`
  Rebuilds normalized base tables from English-standardized CSV source truth.
  Uses `races_meta.csv` for race metadata/schedule and `qualifying_results.csv` for qualifying.

  This stage no longer owns final season aggregates.

### 2.3 Phase 3: Enrich

- `scripts/pipeline/patch_historical_photos.py`
- `scripts/pipeline/add_driver_chinese_names.py`
- `scripts/pipeline/import_sprint_data.py`
  Imports sprint data from `sprint_results.csv` (English-standardized).
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

## 3. CSV Data Standards (English-First)

The project has transitioned to a fully English-standardized CSV layer to ensure consistency between historical (1950-2025) and live (2026+) data.

### 3.1 Core CSV Manifest

| File | Role | Primary Columns |
| :--- | :--- | :--- |
| `race_results.csv` | Full race finishing orders | `year, round, event_id, position, first_name, last_name, team, points` |
| `races_meta.csv` | Race metadata & schedule | `year, round, event_id, circuit, gp_name, country, slug, status` |
| `qualifying_results.csv` | Qualifying orders (1-20) | `year, round, event_id, position, first_name, last_name, pole_time` |
| `sprint_results.csv` | Sprint race results | `year, round, position, first_name, last_name, points` |
| `team_names.csv` | Team name mapping | `Raw Name, Standardized Name` |

### 3.2 Standardization Rules
- **No Chinese Headers**: All column names in `storage/csv/*.csv` must be English.
- **Race Outline Split**: The legacy `race_outline.csv` is retired, replaced by `races_meta.csv` (meta) and `qualifying_results.csv` (results).
- **English Values**: Driver/Team names in CSVs use English canonical forms to bridge smoothly into the SQLite DB and 2026 JSONs.

---

## 4. Machine-Readable Path Manifest

| Handle | Path | Role |
| :--- | :--- | :--- |
| `DIR_CSV` | `/csv/` | Historical source truth used by the offline build pipeline |
| `STORAGE_ROOT` | `/storage/` | Runtime data root for DB, JSON, and photos |
| `ENTRY_SERVER` | `/server.cjs` | Node entry point for the Express server |
| `DIR_SERVER` | `/server/` | Modularized server app, middleware, and routes |
| `ENTRY_DOCKER` | `/docker/` | Container definitions |

---

## 5. Admin API Interface

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

## 6. Ranking Logic

- Total points = historical DB totals plus 2026 JSON totals
- Driver live-season matching uses normalized `firstName|lastName|code`
- Tie-breakers continue to follow FIA-style ordering using wins and podiums

---

## 7. Delivery and CI

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

---

## 8. Team Metadata Architecture (Single Source of Truth)

To solve historical technical debt related to scattered team translations and hardcoded matching conditions, the application now uses a Single Source of Truth for all constructor/team identities: `scripts/teams_config.json`.

### 8.1 Configuration Roles
- **`scripts/teams_config.json`**: The absolute authority on team metadata. Contains standard `slug`, `name` (English canonical), `nameCn` (Chinese translation), `color`, and `isHidden` flags.
- **`storage/csv/team_names.csv`**: Used strictly by the Python pipeline to resolve chaotic raw F1 constructor strings (e.g. `Alfa Romeo Racing Ferrari`) into pure canonical English Base Names (e.g. `Alfa Romeo`).
- **`scripts/f1_translations.py` (`TEAM_TRANSLATIONS`)**: An automatically generated dictionary that mirrors the JSON logic, providing Python pipelines with safe `English -> Chinese` map constants without needing JSON I/O everywhere.
- **`src/utils/translations.ts` (`TEAM_TRANSLATIONS`)**: The frontend's mirror dictionary, allowing the UI to confidently map DB English names to localized displays.

### 8.2 Matching & Resolution Flow
1. **DB Build (`create_normalized_db.py`)**: 
   - Uses `team_names.csv` (with headers `Raw Name,Standardized Name`) to resolve chaotic raw F1 constructor strings into pure canonical English Base Names.
   - Obtains canonical English Name (e.g., `McLaren`).
   - Reads `teams_config.json` to fetch and insert `name_cn` and `color` directly into the database schema (`teams` table).
2. **Special Events (`special_events.json`)**:
   - Complex historical patches point to the `team_en` attribute (e.g. `"team_en": "McLaren"`) which reliably resolves against the `name` column in SQLite.
3. **Frontend Merge (`processors.ts`)**:
   - The fragile fuzzy-matching conditions (e.g., `dbName.includes(tNameCn)`) have been removed. The database and 2026 JSONs now share the same English-standardized identification keys, enabling a 1:1 match by `name`.

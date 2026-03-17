# F1 Express Technical Specification (AGENTS)

> **Context ID**: `F1_EXPRESS_INTEGRATED_V1`
> **Primary Objective**: Autonomous intelligence platform for F1 heritage (1950-2025) and real-time (2026+) data management.
> **Status**: Production-Ready | Integrity Level: 62-Point Audit.

---

## 🏗️ 1. Logic Architecture

The system operates as a **Dual-Engine Fusion** model, separating immutable heritage from high-velocity telemetry.

### 1.1 Heritage Engine (Knowledge Base)
- **Primary Store**: `f1.db` (SQLite 3.x), located in `F1_STORAGE_ROOT`.
- **Initialization**: Multi-stage CSV ingestion (`scripts/pipeline/`).
- **Authority**: `scripts/pipeline/recalculate_championships.cjs`.
- **Access**: SQL.js (WASM) + IndexedDB caching. Served via `/data/` proxy to storage.

### 1.2 Acquisition Engine (Real-time)
- **Module**: `collector/`.
- **Target**: 2026+ season dynamic data (results, liveries, rankings).
- **Pipeline**: **GitHub-Driven Stateless Model**. Scraping (GH Actions) occurs on the remote origin, syncing data into `f1_storage/` before image build.
- **Stateless Delivery**: Latest `f1.db` and `schedule_2026.json` are baked directly into the Docker image. Volume mounting is optional (recommended for logs or manual overrides).

---

## 🛠️ 2. Automated Pipeline Specs (`sync_f1_data.py`)

Machines should monitor the following 13-step refinement flow for potential failures:

| Step | Script Path | Action/Machine Logic |
|:---:|:---|:---|
| 1 | `scripts/pipeline/download_csv_assets.py` | Asset localization; MD5 verification. |
| 2 | Internal | Rolling backup of `f1.db` (Max: 5). |
| 3 | `scripts/pipeline/create_normalized_db.py` | Schema reconstruction; index optimization. |
| 4 | `scripts/pipeline/patch_historical_photos.py` | Fuzzy name matching for legacy avatars. |
| 5 | `scripts/pipeline/add_driver_chinese_names.py` | Bilingual injection (CN/EN). |
| 6 | `scripts/pipeline/import_sprint_data.py` | Atomic association for 2021+ Sprints. |
| 7 | `scripts/pipeline/import_fastest_lap.py` | 1950-59 Fastest Lap injection. |
| 8 | `scripts/pipeline/apply_special_events.py` | Permanent DB fixes (DQ, overrides). |
| 9 | `scripts/pipeline/recalculate_championships.cjs` | **Point of Truth** for WDC/WCC titles. |
| 10 | `scripts/pipeline/recalculate_stats.py` | Global aggregation; avoids championship collision. |
| 11 | `scripts/pipeline/update_photo_index.py` | O(1) path mapping for frontend. |
| 12 | Internal Flow | NAS Sync / `syncer.py` execution. |
| 13 | `scripts/tests/test_data_integrity.py` | 62-point audit. **Required for CI pass.** |

---

## 📂 3. Machine-Readable Path Manifest

| Handle | Path | Content/Role |
|:---|:---|:---|
| `DIR_CSV` | `/csv/` | Raw heritage truth (1950-2025). |
| `STORAGE_ROOT` | `/f1_storage/` | **Integrated Data Root** (Contains DB, JSON, Photos). |
| `ENTRY_SERVER` | `/server.cjs` | Admin Controller / Express API. |
| `ENTRY_DOCKER` | `/docker/` | Container definitions (Stateless optimized). |

---

## 📡 4. Admin API Interface
Agents interacting with the server should expect environment-aware behavior:

1.  **Context Recognition**: System identifies `Native Mobile` vs. `NAS Server` vs. `Development`.
2.  **Update Logic (Mobile)**: Calls GitHub API for Release detection and APK provisioning.
3.  **Update Logic (NAS/Docker)**: Calls `/api/check-update` for image layer verification.
4.  **Auto-Reconstruction**: Triggers `/api/self-update` via Watchtower for zero-config container recreation.
5.  **Local Dev Guard**: Hook `useDynamic2026Data` skips remote fetch on `localhost` to protect unsynced changes.

---

## ⚖️ 5. Ranking Logic (Points Calculation)

- **Total Points** = `Historical DB Sum` + `2026 JSON Sum`.
- **Match Priority**: `d2026.id` matched against `driver_id` or composite `firstName|lastName|code`.
- **Tie-breakers**: Most wins/podiums as per FIA standard rules.

---

## 📋 6. Knowledge Sources (KIs)

- **KI: CH_RULES**: detailed point rules for 1950, 1991, 2010 eras.
- **KI: SYNC_FLOW**: Failure handling and rollback procedures for `sync_f1_data`.
- **KI: ASSET_MAN**: Mapping and localization logic for external images.

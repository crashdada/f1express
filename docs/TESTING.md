# F1 Express Testing Guide

This project now uses a single consolidated JavaScript/TypeScript test tree under `tests/`, split by purpose instead of being scattered across `src/`, `test-suite/`, and `tests/`.

## 1. Test Layout

| Layer | Path | Scope |
| :--- | :--- | :--- |
| Unit tests | `tests/unit/` | Pure utilities, hooks, lightweight logic regressions |
| Integration tests | `tests/integration/` | Rendered pages, UI flows, and server API behavior |
| Test support | `tests/support/` | Shared render helpers and test-only utilities |
| Python config/tests | `tests/config/`, `collector/tests/`, `scripts/tests/` | Pipeline and integrity verification |

Current JavaScript test structure:

- `tests/unit/utils/`
- `tests/unit/hooks/`
- `tests/integration/frontend/`
- `tests/integration/server/`

---

## 2. Commands

Use these commands for the frontend/server JavaScript test suite:

```bash
npm run test
npm run test:unit
npm run test:integration
npm run test:coverage
npm run test:ui
```

Useful pipeline commands:

```bash
npm run pipeline:sync
npm run pipeline:sync:full
npm run pipeline:sync:validate
python scripts/tests/test_data_integrity.py --quick
```

Meaning:

- `npm run test`
  Runs the full Vitest suite
- `npm run test:unit`
  Runs tests in `tests/unit/`
- `npm run test:integration`
  Runs tests in `tests/integration/`
- `npm run test:coverage`
  Runs the full suite with coverage output

---

## 3. Unit Test Scope

Unit tests should cover:

- `src/utils/f1Data.ts`
- `src/utils/translations.ts`
- `src/utils/platform.ts`
- `src/hooks/useDynamic2026Data.ts`
- isolated logic regressions and edge-case guards

Rules:

- Prefer deterministic inputs and no real network access
- Mock `fetch`, `indexedDB`, and browser globals when needed
- Keep unit tests focused on public behavior, not internal file-private helpers

---

## 4. Integration Test Scope

Integration tests should cover:

- rendered page behavior
- component composition
- provider wiring
- route-level UI flows
- Express API endpoints

Current integration areas:

- `tests/integration/frontend/`
- `tests/integration/server/`

Current server API coverage focuses on:

- `GET /api/health`
- `GET /api/check-update`
- admin token protection when `ADMIN_API_TOKEN` is configured

The old `/api/upload-csv` route has been retired and is no longer part of runtime or tests.

---

## 5. Release Verification

Before release or Docker publish, run:

```bash
npm run test
npm run build
npm run verify:dist
npm run validate:docker
```

For data rebuild work, the recommended order is:

```bash
npm run pipeline:sync
python scripts/tests/test_data_integrity.py --quick
npm run test
```

`npm run verify:dist` checks that tracked `dist/` output is aligned with the current source tree.

`npm run validate:docker` checks:

- required runtime files exist
- runtime dependencies are present
- health endpoint exists
- Dockerfile has `HEALTHCHECK`
- entrypoint starts `server.cjs`
- Dockerfile copies the modular `server/` directory

---

## 6. Ground Rules

1. New JavaScript tests should go under `tests/unit/` or `tests/integration/`, not back into `src/` or `test-suite/`.
2. Any failing test should block release validation.
3. Network-dependent behavior must be mocked unless the test is explicitly integration-scoped around the server.
4. Historical data correctness still depends on Python-side integrity checks, not only browser-side tests.
5. When architecture changes, update docs, validation scripts, and test placement in the same change.

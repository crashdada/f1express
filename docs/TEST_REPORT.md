# F1 Express Test Status

Last updated: 2026-03-18

This document reflects the current consolidated test architecture after the frontend/server test refactor.

## Current Layout

| Layer | Path | Purpose |
| :--- | :--- | :--- |
| Unit | `tests/unit/` | Utility and hook behavior |
| Integration | `tests/integration/frontend/` | Rendered page and component flows |
| Integration | `tests/integration/server/` | Express API behavior |
| Support | `tests/support/` | Shared render helpers |

Legacy scattered frontend tests under `src/__tests__/`, `src/hooks/*.test.ts`, `src/utils/*.test.ts`, and `test-suite/` have been retired.

## Current Coverage Surface

| Area | Path | Status |
| :--- | :--- | :--- |
| Translation utilities | `tests/unit/utils/translations.test.ts` | Active |
| Platform utilities | `tests/unit/utils/platform.test.ts` | Active |
| F1 data utilities | `tests/unit/utils/f1Data.test.ts` | Active |
| 2026 feature regressions | `tests/unit/utils/f1_2026_features.test.ts` | Active |
| Edge-case regressions | `tests/unit/utils/edgeCases.test.ts` | Active |
| Dynamic 2026 hook | `tests/unit/hooks/useDynamic2026Data.test.ts` | Active |
| Shared frontend components | `tests/integration/frontend/components.test.tsx` | Active |
| Page rendering and interactions | `tests/integration/frontend/pages.test.tsx` | Active |
| 2026 season page | `tests/integration/frontend/newSeasonPage.test.tsx` | Active |
| Server API | `tests/integration/server/api.test.js` | Active |

## Verification Snapshot

Current local verification passed with:

- `npm run test`
- `npm run build`
- `npm run validate:docker`

Latest Vitest result at the time of this update:

- 10 test files passed
- 73 tests passed

## Notes

- `tests/config/` remains reserved for Python-side test configuration and is not part of the Vitest suite.
- Historical pipeline/data integrity checks under `collector/tests/` and `scripts/tests/` remain separate from the browser/server JavaScript test tree.
- If the architecture changes again, update `README.md`, `docs/TESTING.md`, and this file in the same change.

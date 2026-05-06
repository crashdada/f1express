# 更新日志 (Changelog)

记录 `f1express` 的主要版本变更、架构调整与发布说明。

## 2026-05-06: v1.3.7 - Unified identity registry and baseline snapshots
- 统一身份主数据
  - 新增 [src/data/identity/drivers.json](D:\oc\f1express\.worktrees\identity-system\src\data\identity\drivers.json) 和 [src/data/identity/teams.json](D:\oc\f1express\.worktrees\identity-system\src\data\identity\teams.json)，集中管理车手/车队的中英文名、代码、别名、历史连续体与解析键。
  - 新增 [src/utils/identity/resolver.ts](D:\oc\f1express\.worktrees\identity-system\src\utils\identity\resolver.ts)，统一前端 driver/team 的 canonical 解析、展示名称选择与 family 归并能力。
- 前端兼容收口
  - 将 [src/utils/entityMappings.ts](D:\oc\f1express\.worktrees\identity-system\src\utils\entityMappings.ts) 改为统一走 identity resolver，避免页面侧继续维护分散匹配规则。
  - 将 [src/utils/translations.ts](D:\oc\f1express\.worktrees\identity-system\src\utils\translations.ts) 中的 `TEAM_TRANSLATIONS` 与 `DRIVER_TRANSLATIONS` 改为由 registry 派生，保证展示翻译与解析源一致。
- Python / pipeline 统一解析
  - 新增 [scripts/pipeline/lib/identity_loader.py](D:\oc\f1express\.worktrees\identity-system\scripts\pipeline\lib\identity_loader.py)，让 pipeline 与 collector 共享同一份 identity JSON。
  - 重写 [scripts/f1_translations.py](D:\oc\f1express\.worktrees\identity-system\scripts\f1_translations.py) 为 registry 导出层，并更新 [scripts/pipeline/lib/team_mapping.py](D:\oc\f1express\.worktrees\identity-system\scripts\pipeline\lib\team_mapping.py) 与 [collector/processors/calculate_team_stats.py](D:\oc\f1express\.worktrees\identity-system\collector\processors\calculate_team_stats.py) 统一使用 team alias / family 规则。
- 基线快照与发布产物
  - 新增 [scripts/export_identity_baselines.cjs](D:\oc\f1express\.worktrees\identity-system\scripts\export_identity_baselines.cjs)，导出身份系统改造前后的总积分与榜单视图基线。
  - 新增 [docs/baselines/2026-05-06-driver-totals.json](D:\oc\f1express\.worktrees\identity-system\docs\baselines\2026-05-06-driver-totals.json)、[docs/baselines/2026-05-06-team-totals.json](D:\oc\f1express\.worktrees\identity-system\docs\baselines\2026-05-06-team-totals.json)、[docs/baselines/2026-05-06-driver-standings-view.json](D:\oc\f1express\.worktrees\identity-system\docs\baselines\2026-05-06-driver-standings-view.json)、[docs/baselines/2026-05-06-team-standings-view.json](D:\oc\f1express\.worktrees\identity-system\docs\baselines\2026-05-06-team-standings-view.json)，并刷新相关 `storage/dist` 产物。
- 测试与 Windows 兼容
  - 新增 [tests/unit/utils/identityResolver.test.ts](D:\oc\f1express\.worktrees\identity-system\tests\unit\utils\identityResolver.test.ts)、[tests/unit/utils/exportIdentityBaselines.test.ts](D:\oc\f1express\.worktrees\identity-system\tests\unit\utils\exportIdentityBaselines.test.ts)、[scripts/tests/test_identity_loader.py](D:\oc\f1express\.worktrees\identity-system\scripts\tests\test_identity_loader.py)。
  - 更新 [scripts/pipeline/add_driver_chinese_names.py](D:\oc\f1express\.worktrees\identity-system\scripts\pipeline\add_driver_chinese_names.py)，避免 Windows `gbk` 控制台因警告字符导致同步中断。
## 2026-05-05: v1.3.6 - Miami sprint runtime data and fallback hardening
- Runtime 2026 data and fallback source
  - Recollected and exported the Miami weekend into [collector/results_2026/miami_results.json](D:\oc\f1express\collector\results_2026\miami_results.json), [collector/data/results_2026.json](D:\oc\f1express\collector\data\results_2026.json), [storage/results_2026.json](D:\oc\f1express\storage\results_2026.json), and [dist/data/results_2026.json](D:\oc\f1express\dist\data\results_2026.json), restoring the Miami sprint table and standings points in deployed 2026 season pages.
  - Updated [src/utils/f1-data/constants.ts](D:\oc\f1express\src\utils\f1-data\constants.ts) so runtime fallback JSON now reads from this repository's own tracked [storage](D:\oc\f1express\storage) data instead of the stale legacy external feed, keeping fallback rounds aligned with the published site artifacts.
- Sync pipeline reliability
  - Updated [collector/syncer.py](D:\oc\f1express\collector\syncer.py) logging to tolerate Windows `gbk` consoles, fixing the local sync failure that left `collector/data` newer than `storage/dist` after successful race scrapes.
- Release and verification
  - Bumped the project version to `1.3.6`, refreshed tracked `dist/` artifacts, and reran the season-data/runtime verification commands for this push.
## 2026-04-10: v1.3.5 - Android photos asset sync fix
- Android asset packaging
  - Updated [scripts/sync_android_assets.cjs](D:\oc\f1express\scripts\sync_android_assets.cjs) to copy the bundled `storage/photos` tree into Android assets during `npm run android:sync`, so driver avatars and team logos are packaged into the APK alongside `f1.db` and the 2026 JSON datasets.
  - Added validation for `photos/index.json` after sync to fail fast if the Android asset bundle is missing the photos manifest.
- Release and verification
  - Bumped the project version to `1.3.5`, refreshed the tracked Android asset sync path, and prepared the patch release for a new APK build.
## 2026-04-10: v1.3.4 - Legacy team schema compatibility fix
- Database compatibility
  - Updated [src/utils/f1-data/queries.ts](D:\oc\f1express\src\utils\f1-data\queries.ts) to build the teams query dynamically and only apply the `t.is_hidden = 0` filter when the loaded database schema actually includes that column.
  - Updated [src/utils/f1Data.ts](D:\oc\f1express\src\utils\f1Data.ts) to detect available `teams` columns before executing the query, so older cached/runtime databases without `is_hidden` can still load team data instead of failing at startup.
- Tests and release
  - Added legacy-schema coverage in [tests/unit/utils/queries.test.ts](D:\oc\f1express\tests\unit\utils\queries.test.ts) to lock the compatibility path.
  - Bumped the project version to `1.3.4`, refreshed tracked `dist/` artifacts, and reran release validation commands for this push.
## 2026-04-10: v1.3.3 - Native routing/platform hardening and season UI cleanup
- Native runtime and routing behavior
  - Added [src/utils/routing.ts](D:\oc\f1express\src\utils\routing.ts) and wired it in [src/main.tsx](D:\oc\f1express\src\main.tsx) so direct non-hash entry paths are normalized back into the app's hash routes before React mounts.
  - Updated [src/utils/platform.ts](D:\oc\f1express\src\utils\platform.ts), [src/App.tsx](D:\oc\f1express\src\App.tsx), [src/components/BottomNav.tsx](D:\oc\f1express\src\components\BottomNav.tsx), [src/components/Layout.tsx](D:\oc\f1express\src\components\Layout.tsx), [src/components/Navigation.tsx](D:\oc\f1express\src\components\Navigation.tsx), and [src/pages/SettingsPage.tsx](D:\oc\f1express\src\pages\SettingsPage.tsx) to prefer Capacitor core runtime checks with a bridged fallback, keeping Android/native shell behavior consistent across status bar, nav, and settings surfaces.
- Frontend cleanup and state derivation
  - Refactored [src/components/RaceCountdown.tsx](D:\oc\f1express\src\components\RaceCountdown.tsx), [src/pages/DriverDetail2026.tsx](D:\oc\f1express\src\pages\DriverDetail2026.tsx), [src/pages/DriverDetailPage.tsx](D:\oc\f1express\src\pages\DriverDetailPage.tsx), [src/pages/RaceDetailPage.tsx](D:\oc\f1express\src\pages\RaceDetailPage.tsx), and [src/pages/TeamDetail2026.tsx](D:\oc\f1express\src\pages\TeamDetail2026.tsx) to derive view state from memoized data instead of effect-driven local copies, reducing redundant renders and stale state paths.
  - Simplified [src/pages/HomePage.tsx](D:\oc\f1express\src\pages\HomePage.tsx), [src/pages/SettingsPage.tsx](D:\oc\f1express\src\pages\SettingsPage.tsx), [src/pages/NewSeasonPage.tsx](D:\oc\f1express\src\pages\NewSeasonPage.tsx), [src/components/AppUpdater.tsx](D:\oc\f1express\src\components\AppUpdater.tsx), [src/components/TeamCard.tsx](D:\oc\f1express\src\components\TeamCard.tsx), [src/pages/AnalyticsPage.tsx](D:\oc\f1express\src\pages\AnalyticsPage.tsx), and [src/hooks/useCombinedData.ts](D:\oc\f1express\src\hooks\useCombinedData.ts) to tighten Android-facing copy, avoid effect timing issues, fix fallback color handling, remove dead dependencies, and clean up garbled 2026 season labels before release.
- Tooling, tests, and release
  - Expanded lint coverage in [eslint.config.js](D:\oc\f1express\eslint.config.js), added TypeScript ESLint dependencies in [package.json](D:\oc\f1express\package.json) plus [package-lock.json](D:\oc\f1express\package-lock.json), and added/updated [tests/unit/utils/platform.test.ts](D:\oc\f1express\tests\unit\utils\platform.test.ts), [tests/unit/utils/routing.test.ts](D:\oc\f1express\tests\unit\utils\routing.test.ts), and [tests/unit/components/RaceCountdown.test.tsx](D:\oc\f1express\tests\unit\components\RaceCountdown.test.tsx) for the new platform, route normalization, and countdown behavior.
  - Bumped the project version to `1.3.3`, refreshed tracked `dist/` artifacts, and reran release validation commands for this push.
## 2026-03-30: v1.3.2 - Local/runtime 2026 data merge hardening and dev sync entry
- Runtime 2026 data merge behavior
  - Updated [src/utils/f1-data/season2026.ts](D:\oc\f1express\src\utils\f1-data\season2026.ts) so `localhost` now uses the same local-plus-remote 2026 dataset merge path as NAS/runtime deployments instead of staying on local-only storage data.
  - Changed the 2026 schedule/results merge strategy from whole-dataset preference to per-round merging so new remote rounds can be added without wiping existing non-empty local fields such as `sprintResults`, `status`, `dates`, and `sessions`.
- Local development workflow
  - Added `dev:sync` in [package.json](D:\oc\f1express\package.json) and documented it in [README.md](D:\oc\f1express\README.md) so local development can explicitly refresh `storage/` before starting Vite when working on season-data changes.
- Runtime data and deployment
  - Refreshed [storage/f1.db](D:\oc\f1express\storage\f1.db), [dist/f1.db](D:\oc\f1express\dist\f1.db), and [dist/data/results_2026.json](D:\oc\f1express\dist\data\results_2026.json) so the tracked runtime artifacts include the latest 2026 race state now visible in the rebuilt frontend bundle.
  - Updated [docker/compose.yaml](D:\oc\f1express\docker\compose.yaml) to pass through `ADMIN_API_TOKEN` for container deployments that protect update endpoints.
- Frontend standings and race card polish
  - Updated [src/pages/NewSeasonPage.tsx](D:\oc\f1express\src\pages\NewSeasonPage.tsx), [src/components/DriverCard.tsx](D:\oc\f1express\src\components\DriverCard.tsx), and [src/components/TeamCard.tsx](D:\oc\f1express\src\components\TeamCard.tsx) so race cards swap country / Grand Prix typography, constructor cards use logo badges, and second-place rank badges use a brighter silver treatment shared across driver and team standings.
- Regression coverage
  - Expanded [tests/unit/utils/season2026.test.ts](D:\oc\f1express\tests\unit\utils\season2026.test.ts), [tests/integration/frontend/newSeasonPage.test.tsx](D:\oc\f1express\tests\integration\frontend\newSeasonPage.test.tsx), [tests/unit/components/DriverCard.test.tsx](D:\oc\f1express\tests\unit\components\DriverCard.test.tsx), and [tests/unit/components/TeamCard.test.tsx](D:\oc\f1express\tests\unit\components\TeamCard.test.tsx) to cover new-round remote merges, preservation of existing sprint data and cancelled schedule state, race-card typography, logo badge rendering, and the brighter second-place badge styling.

## 2026-03-25: v1.3.1 - Constructor corrections, 2026 roster alignment, and standings UI polish
- Pipeline, data, and validation
  - Updated [scripts/pipeline/create_normalized_db.py](D:\oc\f1express\scripts\pipeline\create_normalized_db.py), [scripts/pipeline/lib/team_stats.py](D:\oc\f1express\scripts\pipeline\lib\team_stats.py), [scripts/pipeline/recalculate_championships.cjs](D:\oc\f1express\scripts\pipeline\recalculate_championships.cjs), and [scripts/pipeline/recalculate_stats.py](D:\oc\f1express\scripts\pipeline\recalculate_stats.py) to tighten driver matching in qualifying imports, keep constructor point totals within the WCC era, and apply round/season penalty handling plus sprint-point carry-through more consistently.
  - Refreshed [storage/f1.db](D:\oc\f1express\storage\f1.db), [storage/schedule_2026.json](D:\oc\f1express\storage\schedule_2026.json), [storage/teams_2026.json](D:\oc\f1express\storage\teams_2026.json), their tracked `dist/` counterparts, and [scripts/pipeline/artifacts/constructor_validation_report.json](D:\oc\f1express\scripts\pipeline\artifacts\constructor_validation_report.json) after the latest pipeline/data sync.
  - Updated [collector/syncer.py](D:\oc\f1express\collector\syncer.py) and [collector/data/teams_2026.json](D:\oc\f1express\collector\data\teams_2026.json) so normalized season assets preserve non-default track artwork base names instead of forcing every event back to the slug-derived filename.
- Frontend standings and roster behavior
  - Updated [src/hooks/useCombinedData.ts](D:\oc\f1express\src\hooks\useCombinedData.ts) so 2026-only drivers are surfaced even when no historical record exists yet, preventing active-grid entries from disappearing from runtime lists.
  - Changed [src/pages/DriversPage.tsx](D:\oc\f1express\src\pages\DriversPage.tsx) and [src/pages/TeamsPage.tsx](D:\oc\f1express\src\pages\TeamsPage.tsx) to default to active-only filtering, and polished [src/components/DriverCard.tsx](D:\oc\f1express\src\components\DriverCard.tsx) plus [src/pages/NewSeasonPage.tsx](D:\oc\f1express\src\pages\NewSeasonPage.tsx) so championship-year chips align cleanly and constructor standings use team logo badges over team-color backgrounds.
- Tests, docs, and release
  - Added/updated [tests/unit/components/DriverCard.test.tsx](D:\oc\f1express\tests\unit\components\DriverCard.test.tsx), [tests/unit/utils/season2026.test.ts](D:\oc\f1express\tests\unit\utils\season2026.test.ts), [tests/integration/frontend/newSeasonPage.test.tsx](D:\oc\f1express\tests\integration\frontend\newSeasonPage.test.tsx), [tests/integration/frontend/dataManagementPage.test.tsx](D:\oc\f1express\tests\integration\frontend\dataManagementPage.test.tsx), [tests/integration/frontend/pages.test.tsx](D:\oc\f1express\tests\integration\frontend\pages.test.tsx), and [tests/integration/server/api.test.js](D:\oc\f1express\tests\integration\server\api.test.js) to cover the new standings UI, season-data fallback logic, update-page token handling, and revised API/frontend expectations.
  - Added [docs/superpowers/specs/2026-03-25-test-quality-core-regression-design.md](D:\oc\f1express\docs\superpowers\specs\2026-03-25-test-quality-core-regression-design.md), bumped the project version to `1.3.1`, refreshed release artifacts, and reran release validation commands for this push.

## 2026-03-22: v1.3.0 - Unified entity mappings, 2026 readiness, and round/event_id normalization
- Pipeline and data normalization
  - Unified the CSV identity contract so `round = season round number` and `event_id = Formula1.com event id`, and updated [scripts/pipeline/create_normalized_db.py](D:\oc\f1express\scripts\pipeline\create_normalized_db.py) plus the tracked CSV sources to follow that rule.
  - Added [scripts/migrate_csv_round_event_id.py](D:\oc\f1express\scripts\migrate_csv_round_event_id.py) to migrate legacy CSV files into the normalized `round + event_id` schema.
  - Fixed qualifying import after the schema transition so full qualifying history lands correctly in the normalized database build.
- 2026 collection and archive readiness
  - Reworked [collector/scrapers/scraper_results.py](D:\oc\f1express\collector\scrapers\scraper_results.py) and [collector/exporters/export_results_json.py](D:\oc\f1express\collector\exporters\export_results_json.py) so 2026 race JSON keeps `eventId`, race `laps/time`, sprint top-8, and qualifying top-3.
  - Added [scripts/validate_2026_json_readiness.py](D:\oc\f1express\scripts\validate_2026_json_readiness.py) to verify future JSON archive completeness without importing 2026 into DB/CSV.
  - Corrected 2025 sprint source rows in [sprint_results.csv](D:\oc\f1express\storage\csv\sprint_results.csv), removing the final constructor point mismatch and leaving constructor validation with rank-only historical differences.
- Frontend identity unification
  - Added [src/utils/entityMappings.ts](D:\oc\f1express\src\utils\entityMappings.ts) as the shared source of truth for driver and team aliases.
  - Updated [src/hooks/useCombinedData.ts](D:\oc\f1express\src\hooks\useCombinedData.ts), [src/utils/f1-data/processors.ts](D:\oc\f1express\src\utils\f1-data\processors.ts), [src/pages/DriverDetail2026.tsx](D:\oc\f1express\src\pages\DriverDetail2026.tsx), and [src/pages/TeamDetail2026.tsx](D:\oc\f1express\src\pages\TeamDetail2026.tsx) to use those mappings, fixing duplicate live/historical team rows such as `Mercedes` vs `Mercedes-AMG`.
  - Tightened [src/components/TeamCard.tsx](D:\oc\f1express\src\components\TeamCard.tsx) so duplicated secondary labels are not rendered when they repeat the visible team name.
- Release
  - Bumped the project version to `1.3.0`, refreshed release artifacts, and reran pipeline plus frontend test coverage for this push.

## 2026-03-19: v1.2.6 - Constructor rules, database rebuild, and Android 2026 bundle
- Constructor data and validation
  - Rebuilt [storage/f1.db](D:\oc\f1express\storage\f1.db) from current CSV sources, restoring corrected historical values such as Ferrari `1984 = 57.5`, Ferrari `2025 = 398.0`, and Ferrari `1958-2025 = 10722.0`.
  - Updated [scripts/pipeline/import_sprint_data.py](D:\oc\f1express\scripts\pipeline\import_sprint_data.py) to persist `race_id`, `round_number`, and `team_id` during sprint import so constructor totals do not depend on fragile post-hoc joins.
  - Updated [scripts/pipeline/lib/team_stats.py](D:\oc\f1express\scripts\pipeline\lib\team_stats.py) so 2021+ sprint points are merged into constructor season totals through the stronger sprint linkage.
  - Updated [scripts/pipeline/validate_constructor_totals.py](D:\oc\f1express\scripts\pipeline\validate_constructor_totals.py) to document the validator rules, prefer `outof` over `points`, and report `point differences` separately from `rank-only differences`.
- WCC championship logic
  - Updated [scripts/pipeline/recalculate_championships.cjs](D:\oc\f1express\scripts\pipeline\recalculate_championships.cjs) to calculate WCC independently from season totals, including 1958-1978 single-car counting, historical Best Results Rule, 1958-1959 fastest-lap exclusion for constructors, 1961 WCC-specific scoring, and Indianapolis 500 exclusion.
  - Rewrote [docs/championship_rules.md](D:\oc\f1express\docs\championship_rules.md) to clearly separate `race_results.points`, `team_season_stats.points`, and `team_championships.points`.
- Android 2026 runtime data
  - Updated [vite.config.js](D:\oc\f1express\vite.config.js) to bundle `schedule_2026.json`, `results_2026.json`, `drivers_2026.json`, and `teams_2026.json` into `dist/data/`.
  - Updated [scripts/sync_android_assets.cjs](D:\oc\f1express\scripts\sync_android_assets.cjs) to copy those 2026 datasets into Android assets alongside `f1.db`, fixing the Android app missing 2026 season data.
- Release
  - Bumped the project version to `1.2.6` and refreshed release artifacts for this push.

## 2026-03-19: v1.2.5 - Android packaging fix and 2026 season card polish
- Android packaging and release pipeline
  - Added post-build database bundling in [vite.config.js](D:\oc\f1express\vite.config.js) so `storage/f1.db` is copied into `dist/f1.db`.
  - Added [scripts/sync_android_assets.cjs](D:\oc\f1express\scripts\sync_android_assets.cjs) to validate and sync the bundled database into Android assets after Capacitor sync.
  - Updated [package.json](D:\oc\f1express\package.json) and [.github/workflows/android-build.yml](D:\oc\f1express\.github\workflows\android-build.yml) to use `npm run android:sync` in CI and release builds.
- 2026 season schedule cards
  - Updated [src/pages/NewSeasonPage.tsx](D:\oc\f1express\src\pages\NewSeasonPage.tsx) to keep SVG flags visible while scaling the artwork down inside the card.
  - Completed the 2026 schedule card Grand Prix name mapping and localized card labels such as `next race`, `called off`, and `grand prix dates`.
- Release
  - Bumped the project version to `1.2.5` and refreshed release artifacts for this push.

## 2026-03-19: v1.2.4 - 主题联动修复、数据加载回退与回归测试补强

- Android / Web 主题体验修复
  - 修复 [src/context/F1Context.tsx](D:\oc\f1express\src\context\F1Context.tsx) 中“跟随系统”主题只在切换当下生效、后续不再跟随系统深浅色变化的问题。
  - 同步更新 [src/App.tsx](D:\oc\f1express\src\App.tsx)、[src/components/ThemeToggle.tsx](D:\oc\f1express\src\components\ThemeToggle.tsx)、[src/pages/AnalyticsPage.tsx](D:\oc\f1express\src\pages\AnalyticsPage.tsx) 与 [src/pages/SettingsPage.tsx](D:\oc\f1express\src\pages\SettingsPage.tsx)，统一使用实际生效主题，避免状态栏、图表和设置页显示不一致。

- 数据加载稳定性修复
  - 在 [src/utils/f1Data.ts](D:\oc\f1express\src\utils\f1Data.ts) 中区分本地开发态与原生 / 非本地环境的数据源优先级，避免网页端误读错误数据库导致 `#/new-season` 打不开。
  - 为数据库加载增加必需表校验与坏缓存清理逻辑，当首选库不兼容时自动回退到候选路径，避免 Android 安装后长期停留在 loading。
  - 修复 [src/hooks/useF1Data.ts](D:\oc\f1express\src\hooks\useF1Data.ts) 在加载失败后的重复自动重试，确保错误态能稳定落地而不是无限 loading。

- 验证与发布
  - 新增 [tests/unit/hooks/useF1Data.test.ts](D:\oc\f1express\tests\unit\hooks\useF1Data.test.ts)，覆盖加载失败后不再无限重试的回归场景。
  - 扩充 [tests/unit/utils/f1Data.test.ts](D:\oc\f1express\tests\unit\utils\f1Data.test.ts)，覆盖数据源选择、坏缓存清理与数据库回退逻辑。
  - 完成 `1.2.4` 版本发布、构建校验与 Git 标签推送。

## 2026-03-19: v1.2.3 - storage 迁移、Collector 工具分区与发布校验

- 存储目录统一
  - 将项目运行数据根目录从 `f1_storage/` 统一迁移为 [storage](D:\oc\f1express\storage)。
  - 同步更新服务端、Vite、本地脚本、Docker、Compose 与文档中的存储路径引用，避免新旧目录名混用。
  - 完成历史资源、图片、JSON 快照与数据库文件的目录迁移，并清理旧目录残留。

- Collector 工具整理
  - 将 [collector/tools](D:\oc\f1express\collector\tools) 拆分为 `debug/`、`inspect/`、`oneoff/` 三类，降低脚本堆积造成的查找成本。
  - 新增 [collector/tools/README.md](D:\oc\f1express\collector\tools\README.md) 作为索引文档，明确分类和运行方式。
  - 新增 [collector/tools/_shared.py](D:\oc\f1express\collector\tools\_shared.py)，统一解析 `f1.db` 与 `schedule_2026.json` 路径，修复脚本对旧仓库绝对路径的依赖。

- 工程校验与发布
  - 调整 ESLint 范围，排除第三方静态产物并补充 Node 全局变量支持，使校验聚焦项目源码与测试代码。
  - 刷新前端构建产物 `dist/`，并确认 `verify:dist` 与 Docker 运行内容校验通过。
  - 完成 `1.2.3` 版本发布、Git 标签更新与远端推送。

## 2026-03-18: v1.2.1 - 流水线收敛、历史统计修正与现役筛选

- 数据流水线与历史统计
  - 将原有同步脚本重构为分阶段 pipeline，总控入口收敛到 [scripts/sync_f1_data.py](D:\oc\f1express\scripts\sync_f1_data.py)。
  - 让 [scripts/pipeline/create_normalized_db.py](D:\oc\f1express\scripts\pipeline\create_normalized_db.py) 只负责基础建库，[scripts/pipeline/recalculate_stats.py](D:\oc\f1express\scripts\pipeline\recalculate_stats.py) 成为赛季统计的统一出口。
  - 接通 [scripts/pipeline/import_fastest_lap.py](D:\oc\f1express\scripts\pipeline\import_fastest_lap.py) 对 `fastest_lap_1950_1959.csv` 的导入，修正 1958-1959 早期积分偏差。
  - 新增 [scripts/pipeline/lib](D:\oc\f1express\scripts\pipeline\lib) 规则模块、[scripts/pipeline/validate_constructor_totals.py](D:\oc\f1express\scripts\pipeline\validate_constructor_totals.py) 对账脚本，以及对应报告产物。

- 历史实体与数据库修正
  - 修复历史车队别名与多实体统计问题，补齐迈凯伦 1966-1968 多引擎实体规则。
  - 将 `Copersucar` 与 `Fittipaldi` 按赛季拆分为不同历史车队实体，避免错误合并。
  - 重新纳入 [scripts/pipeline/add_driver_chinese_names.py](D:\oc\f1express\scripts\pipeline\add_driver_chinese_names.py) 并扩充中文名映射，恢复历史车手中文显示。
  - 刷新 [f1.db](D:\oc\f1express\storage\f1.db) 与相关图片索引、2026 赛程资源。

- 前端数据与交互
  - 修复车手与车队页面对 2026 动态数据的合并逻辑，避免历史实体误继承当前赛季分数。
  - 让 `Audi`、`Cadillac` 等 2026 新车队以独立新车队显示，并只叠加当季实时结果。
  - 在 [src/pages/DriversPage.tsx](D:\oc\f1express\src\pages\DriversPage.tsx) 和 [src/pages/TeamsPage.tsx](D:\oc\f1express\src\pages\TeamsPage.tsx) 新增“现役”开关，基于新赛季采集结果筛选现役车手与车队。
  - 优化现役开关样式与标题区布局，并修复本地缓存导致的旧数据库展示问题。

- 发布与验证
  - 完整跑通全量 pipeline、前端构建与测试。
  - 项目版本提升至 `1.2.1`。

## 2026-03-18: v1.2.0 - 架构收敛、测试统一、发布链路完善

- 架构重构
  - 将服务端拆分为模块化结构，新增 [server/app.cjs](D:\oc\f1express\server\app.cjs)、[server/config.cjs](D:\oc\f1express\server\config.cjs)、[server/routes/health.cjs](D:\oc\f1express\server\routes\health.cjs)、[server/routes/updates.cjs](D:\oc\f1express\server\routes\updates.cjs) 和 [server/middleware/adminAuth.cjs](D:\oc\f1express\server\middleware\adminAuth.cjs)。
  - 将前端历史数据层从单体 [src/utils/f1Data.ts](D:\oc\f1express\src\utils\f1Data.ts) 拆分为 [src/utils/f1-data](D:\oc\f1express\src\utils\f1-data) 下的多个职责模块。

- 安全与运维
  - 为管理接口增加 `ADMIN_API_TOKEN` 鉴权支持。
  - 移除已废弃的 CSV 上传能力，服务端仅保留健康检查与更新接口。
  - 增加 Docker 运行时健康检查与发布前校验脚本。

- 测试体系统一
  - 将分散在 `src/__tests__`、`src/hooks/*.test.ts`、`src/utils/*.test.ts`、`test-suite/` 的测试统一迁移到 [tests/unit](D:\oc\f1express\tests\unit) 与 [tests/integration](D:\oc\f1express\tests\integration)。
  - 新增 [tests/integration/server/api.test.js](D:\oc\f1express\tests\integration\server\api.test.js)，让服务端 API 进入统一集成测试层。
  - 统一 Vitest 配置与测试辅助入口，减少历史编码文案导致的脆弱断言。

- CI/CD 与发布约束
  - 新增 [ci.yml](D:\oc\f1express\.github\workflows\ci.yml)，将单元测试、集成测试、构建和 Docker 校验纳入持续集成。
  - 更新 [docker-build.yml](D:\oc\f1express\.github\workflows\docker-build.yml)，在推送 Docker 镜像前先执行验证步骤。
  - 新增 [scripts/verify_dist_freshness.cjs](D:\oc\f1express\scripts\verify_dist_freshness.cjs) 和 [scripts/validate_docker_bundle.cjs](D:\oc\f1express\scripts\validate_docker_bundle.cjs)，约束 `dist/` 与 Docker 发布内容的一致性。

- 文档同步
  - 更新 [README.md](D:\oc\f1express\README.md)、[docs/AGENTS.md](D:\oc\f1express\docs\AGENTS.md)、[docs/TESTING.md](D:\oc\f1express\docs\TESTING.md)、[docs/TEST_REPORT.md](D:\oc\f1express\docs\TEST_REPORT.md)，与新架构和测试布局保持一致。

- 版本发布
  - 项目版本提升至 `1.2.0`。
  - 已同步刷新前端构建产物 `dist/`。

## 2026-03-17: v1.1.1 - 体验优化与数据修正

- 修复 Hamilton 积分重复计算问题。
- 优化 2026 赛季赛程卡片展示效果。
- 修复并补强 `useDynamic2026Data` 相关测试覆盖。

## 2026-03-16: v1.1.0 - 无状态部署与智能更新

- 推进 GitHub 驱动的数据更新与构建流程。
- 调整 Docker 部署结构，降低 NAS 自部署门槛。
- 引入 Android / NAS 双端更新能力。
- 增强 2026 赛季数据采集与本地开发保护逻辑。

## 2026-03-16: v1.0.0 - 仓库整合与首个正式版本

- 完成历史独立采集仓与前端仓整合，形成统一仓库 `f1express`。
- 建立基础测试体系与文档体系。
- 发布首个正式版本 `v1.0.0`。

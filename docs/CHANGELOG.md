# 更新日志 (Changelog)

记录 `f1express` 的主要版本变更、架构调整与发布说明。

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

- 完成 `f1-collector` 与 `f1-website` 的整合，形成统一仓库 `f1express`。
- 建立基础测试体系与文档体系。
- 发布首个正式版本 `v1.0.0`。

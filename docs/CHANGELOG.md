# 更新日志 (Changelog)

完整记录 f1express 从一体化集成以来的架构改动、功能迭代以及版本记录。

## 2026-03-14: v1.0.0 — f1express 一体化架构正式落地

- **架构重组与合并**：
  - 将 `f1-collector` 与 `f1-website` 深度整合为单一仓库 `f1express`。
  - 采集器整体内聚于根目录 `collector/` 下，核心同步管线已完成路径适配。
- **全量测试体系建立**：
  - 新增 `docs/TESTING.md` 并集成 `pytest` (Backend/Python) 与 `vitest` (Frontend)。
  - 完成 62 项数据完整性自动化测试断言，确保历史数据 100% 对齐官方记录。
- **文档体系刷新**：
  - 全面更新 `AGENTS.md`、`README.md` 及 `docs/` 目录下所有技术手册，移除所有过时的独立仓库引用。
- **环境精简**：
  - 删除了冗余的 `collector_scripts` 目录。
- **版本初始化**：
  - 正式发布 v1.0.0 版本。

---

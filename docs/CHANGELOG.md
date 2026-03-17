# 更新日志 (Changelog)

完整记录 f1express 从一体化集成以来的架构改动、功能迭代以及版本记录。

## 2026-03-17: v1.1.1 — 体验优化与数据纠偏

- **数据准确性修正**:
  - 修复了 Hamilton 积分重复计算的严重 Bug（通过合并 `f1Data.ts` 与 `useCombinedData.ts` 的计算逻辑）。
- **视觉体验提升**:
  - 优化了 2026 赛季赛程卡片中“完赛”旗帜与“国旗”的显示比例，确保在圆圈容器内高清居中显示。
- **全量测试覆盖与修复**:
  - 修复了因 UI 升级导致的 `vitest` 测试用例失败项。
  - 增强了 `useDynamic2026Data` 的模拟环境，确保 GitHub 远端同步逻辑在测试环境中可被覆盖验证。

## 2026-03-16: v1.1.0 — 架构演进：无状态部署与智能更新

- **无状态镜像模型 (Stateless Docker)**:
  - 架构重心转向 **GitHub 驱动**。2026 赛季数据的采集 (Scraper) 环境上移至 GitHub Actions。
  - 数据存储结构收拢至 `f1_storage`，并直接打包进镜像层，实现“开箱即用，无需挂载”。
- **Docker 运维自动化**:
  - 重写了 `docker/Dockerfile` 与 `entrypoint.sh`，大幅精简启动逻辑。
  - `docker-compose.yaml` 默认移除 Volume 挂载，降低 NAS 部署门槛。
- **智能更新体系 (Environment-Aware)**:
  - **Android 端**: 继续维持 GitHub Releases 驱动，提供 APK 自动弹窗提示与下载。
  - **NAS 网页端**: 引入 Docker 自更新逻辑。前端 `Admin Console` 可直接调用后端接口触发镜像拉取与 Watchtower 重启。
- **2026 数据补全与修正**:
  - 增强了 `scraper.py` 的容错能力，自动补全缺失的赛程日期。
  - 处理了 F1 2026 第 4、5 站因特殊原因取消的情形。
  - 修复了“英国站”国旗匹配丢失问题，强化了国家名称映射表 (`mappings.json`)。
- **本地开发保护**:
  - `useDynamic2026Data` 增加 `localhost` 识别，防止本地未推送的修改被远程旧数据覆盖。

---

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

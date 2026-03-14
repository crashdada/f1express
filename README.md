# f1express — F1 数据采集与展示一体化平台

> **v1.0.0** | 集成 `f1-collector` 与 `f1-website` 的一体化 F1 历史数据统计与实时展示系统。

---

## 📋 项目概述

**f1express** 将原本分散的 F1 数据采集工具与前端展示站深度整合，形成了一个从 **爬虫采集 -> 数据清洗 -> 数据库构建 -> 前端可视化 -> 运维管理** 的全链路闭环项目。

### 🌟 核心特性
- ✅ **一体化管线**：一个项目完成 2026 赛季实时采集与 1950-2025 历史重算。
- ✅ **13 步自动化同步**：涵盖 WDC/WCC 冠军重算、中文化、最快圈注入及 62 项严苛的数据完整性检查。
- ✅ **Admin Console**：NAS 部署后支持通过 Web 界面上传 CSV、触发重算、一键更新 Docker 镜像。
- ✅ **高性能前端**：基于 React + WASM SQLite，支持秒级数据查询与 IndexedDB 持久化缓存。
- ✅ **三端同步**：本机开发、GitHub Actions、NAS 生产环境无缝联动。

---

## 📂 目录结构

- `collector/` : **原 f1-collector 核心**。负责 2026 赛季赛程、赛果、车手及车队的实时抓取。
- `scripts/` : **数据精炼管线**。包含 `sync_f1_data.py` 等 13 步核心同步逻辑。
- `csv/` : **数据真理源**。存储所有经人工核验的历史 race/sprint/photo 基础数据。
- `public/data/` : **运行时数据集**。存放 `f1.db` (SQLite) 及生成的各种 JSON 产物。
- `src/` : **前端源码**。基于 Vite + React + TypeScript 的现代化 Web 应用。
- `server.cjs` : **后端管理服务**。Express 驱动，负责静态托管及 Admin API。

---

## 🚀 快速开始

### 1. 环境准备
确保您的系统中已安装 Node.js (v20+) 和 Python 3.9+。

```bash
# 克隆仓库（如果您已在本地，请直接进入目录）
cd f1express

# 安装 Node 依赖
npm install

# 安装 Python 依赖
pip install -r collector/requirements.txt
```

### 2. 本地开发
```bash
# 启动 Vite 开发服务器 (默认 5173 端口)
npm run dev

# 启动管理后台后端 (默认 8001 端口)
node server.cjs
```

### 3. 数据同步与维护
当您修改了 `csv/` 数据或需要采集 2026 最新成绩时：

```bash
# 先行采集 2026 数据并同步至网站
python collector/syncer.py --all

# 运行全量 13 步管线（重建数据库、计算冠军、执行 62 项测试）
python scripts/sync_f1_data.py --force
```

---

## 🐳 Docker 部署 (NAS)

建议使用 `docker-compose` 部署：

```bash
docker compose pull
docker compose up -d
```

详情参阅 [AGENTS.md](AGENTS.md) 查看三端无冲突架构及详细配置说明。

---

## 📚 延伸阅读
- [AGENTS.md](AGENTS.md): **项目深度技术文档**（架构图、数据流、管线细节）。
- [docs/CHANGELOG.md](docs/CHANGELOG.md): 更新日志与版本变动记录。
- [docs/championship_rules.md](docs/championship_rules.md): 各年代积分规则详解。

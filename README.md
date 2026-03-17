# 🏎️ F1 Express: 您的全方位 F1 数据中枢

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/crashdada/f1express)
[![Build](https://img.shields.io/badge/integrity-62--point%20pass-green.svg)](https://github.com/crashdada/f1express)

**F1 Express** 是一款专为 F1 爱好者打造的高性能纵览平台。它不仅是一个网站，更是一个链接了 75 年历史遗产与未来 2026 赛季实时动态的数据引擎。

---

## 🌟 核心亮点

*   **穿越 75 年的历史深度**：完整收录自 1950 年以来的 25,000+ 场赛果，重现每一位冠军的辉煌时刻。
*   **实时驱动的 2026 赛季**：内置自主采集系统，第一时间同步最新的分站成绩、积分榜与车队动态。
*   **秒开的极致体验**：基于 WebAssembly 数据库技术，支持数万条数据的毫秒级搜索与过滤。
*   **双语无缝切换**：全站标准中英文对照，支持中英文全名及车队名搜索。
*   **私有化部署神器**：为 NAS 度身定制，支持 Docker 一键部署、自动更新及 Web 管理后台。

---

## 🚀 快速上手

### 1. 准备环境
您需要安装 **Node.js (v20+)** 和 **Python (3.9+)**。

### 2. 安装与运行
```bash
# 安装依赖
npm install && pip install -r collector/requirements.txt

# 启动展示界面
npm run dev

# 启动管理后台
node server.cjs
```

---

## 📂 目录导航

为了保持项目整洁，我们将代码按照职能进行了严谨的划分：

*   **`src/`**: 华丽的 React 前端界面。
*   **`collector/`**: 负责 2026 赛季情报的“采集雷达”。
*   **`scripts/`**: 负责历史数据洗炼与冠军重算的“核心工厂”。
*   **`public/data/`**: 存储所有处理好的 SQLite 数据库与实时 JSON。
*   **`docker/`**: 方便您在 NAS 上一键部署的各配置文件。
*   **`docs/`**: 存放深度技术文档、历史积分规则及更新日志。

---

## 🐳 NAS 部署方案

如果您想在自己的设备上克隆一个 F1 情报站，只需使用 Docker：

```bash
docker compose -f docker/compose.yaml pull
docker compose -f docker/compose.yaml up -d
```

部署后，访问 `/#/admin-console` 即可体验一键热更新与数据同步的快感。

---

## 📚 延伸阅读

*   [技术蓝图 (AGENTS.md)](docs/AGENTS.md) — 深度了解双引擎架构与数据流逻辑。
*   [更新日志 (CHANGELOG.md)](docs/CHANGELOG.md) — 记录每一次性能起飞与功能迭代。
*   [冠军规则 (championship_rules.md)](docs/championship_rules.md) — 探究自 1950 年来复杂的积分算法。

**状态**: ⚡ 统一历史引擎在线 | ✅ 62 项完整性断言通过。

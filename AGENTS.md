# f1express - 项目完整文档

> F1 数据采集与展示一体化项目 - 从数据处理到前端展示的闭环文档
> **当前版本**：v1.0.0 | **架构版本**：一体化集成架构 v1.0

---

## 📋 项目概述

f1express 是一个将 `f1-collector` 与 `f1-website` 深度整合的 F1 历史数据统计与实时展示项目：
- **核心逻辑**：将原有的采集器（Collector）作为模块内置到网站项目中，实现一站式开发与维护。
- **历史数据库**：SQLite 存储 1950-2025 年完整 F1 历史数据（f1.db）。
- **实时/未来赛季数据**：JSON 格式存储 2026+ 赛季的动态数据（由内部 `collector` 模块自动采集）。
- **前端**：TypeScript + React + Vite + TailwindCSS。
- **部署**：Docker 容器，NAS 本地托管，通过 Admin Console 管理数据与更新。

**核心特性**：
- ✅ F1 历史积分规则完整实现（1950-2025 的全数据库闭环封装）
- ✅ 2026 赛季实时数据本地优先秒开 + 云端动态静默同步机制 (`ghproxy` 节点加速)
- ✅ 中英文双语支持及双向自动转换引擎
- ✅ 自动化工作流：GitHub Actions 定时爬取 2026 数据 + 构建 Docker 镜像
- ✅ Admin Console：NAS 端系统维护、数据重算、热更新镜像全自动化
- ✅ 前端 SQLite WASM 秒级查询 + IndexedDB 缓存持久化加速
- ✅ 完美支持 Android 8.0+ 的自适应多图层桌面图标 (Adaptive Icons)

---

## 🖥️ 三端无冲突架构

### 环境职责一览

| 环境 | 职责 | 读写权限 |
|------|------|---------| 
| **本机 (Dev)** | 代码开发 + 界面构建 + 一体化数据处理 | 读写：源码 / dist / 历史数据库 / Collector |
| **GitHub** | 全球数据权威分发 + Docker 镜像构建仓库 | 写：JSON (f1express/collector) / Public CDN |
| **NAS (Prod)** | 历史数据库后台管理 + 高带宽离线兜底容器 | 读写：CSV / f1.db (Volume) |
| **User (App)** | 前端消费、本地数据秒看与远端静默热重载 | 读：IndexedDB / CDN (`ghproxy.net`) |

### 数据流向

```
┌──────────────────────────────────────────────────────────────────────┐
│ 本机 (Dev)                                                            │
│  修改 csv/ 或源码                                                      │
│  → python scripts/sync_f1_data.py   (全量重算, Steps 0-9)             │
│  → npm run build                    (更新 dist/)                      │
│  → /push 工作流                     (自动 bump patch, git push)        │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ git push → GitHub f1express
                           ▼
             ┌─────────────┴──────────────┐
             │                            │
             ▼                            ▼
   docker-build.yml               f1-collector/scrape.yml
   ① checkout f1-collector        每 3 小时自动触发 (内部判断窗口)
   ② 同步最新 JSON 到 public/data  ① [周期] scraper_results.py (仅赛果)
   ③ npm run build                ② [Push] scraper.py / scraper_drivers.py
   ④ 构建 Docker 镜像              ③ export_results_json.py (合并 JSON)
   ⑤ 推送 dudumin/f1-website      ④ 仅 Push JSON 变动并同步至 website
             │                    ⑤ f1-website 读动态 JSON，不再强制同步
             ▼                            │ 
   Docker Hub: dudumin/f1express:latest   │
             │                            │
             └─────────────┬──────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│ NAS (Production)                                                      │
│  docker compose pull && docker compose up -d                         │
│  entrypoint.sh:                                                       │
│    ├── JSON 从镜像刷新 (collector/ 模块提供权威源)                     │
│    └── f1.db 从 Volume 保留 (NAS 本地修改优先, 首次从镜像初始化)         │
│                                                                       │
│  Admin Console (/#/admin-console):                                    │
│    ├── 上传 CSV → 本地重算 → 热更新 dist/data/ → git push              │
│    └── 检查更新 → 发现新镜像 → 一键重建容器                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构

### f1express 目录全景

一体化项目将原有的采集器作为模块内嵌，目录结构如下：

#### ⚙️ 1. 核心部署与服务层
```text
f1express/
├── 📄 server.cjs              # NAS Express 服务器：静态托管 + CSV上传API + 自更新API
├── 📄 entrypoint.sh           # Docker 启动入口：初始化 Volume 数据
├── 📄 compose.yaml            # NAS 部署配置 (Volume 挂载 + 环境变量)
├── 📄 Dockerfile              # 多模块构建：React + Python 环境整合
├── 📄 package.json            # v1.0.0 (一体化集成版)
└── .github/workflows/
    └── docker-build.yml       # → push main 时触发：构建推送 f1express 镜像
```

#### 🕷️ 2. 数据采集模块 (Collector)
```text
f1express/
└── collector/                 # 🌟 一体化核心采集模块
    ├── scraper.py             # 赛历采集
    ├── scraper_drivers.py     # 车手/车队数据生成
    ├── scraper_results.py     # 分站成绩实时抓取
    ├── refine_with_stats.py   # 历史统计回填 (读 ../public/data/f1.db)
    ├── syncer.py              # 数据内同步 (同步成果至 ../public/data/)
    ├── data/                  # 采集原始 JSON 产物
    └── assets/                # 视觉资产 (Flags/Tracks/Cars)
```

#### 🗄️ 3. 数据处理管线与历史层 (Pipeline)
<details>
<summary>点击展开数据层目录明细</summary>

```text
f1express/
├── csv/                       # 数据源 CSV (1950-2025 历史真理源)
├── scripts/                   # 数据管线脚本
│   ├── sync_f1_data.py        # ⭐ 主入口：13 步同步管线 (自动驱动 collector)
│   ├── pipeline/              # 步骤子逻辑
│   ├── tests/                 # 62 项自动化完整性测试
│   └── update_photo_index.py  # 照片索引生成
└── backups/                   # 数据库备份 (保留最近5份)
```
</details>

#### 🖥️ 4. 前端应用层 (Frontend)
```text
f1express/
├── src/                       # React TypeScript 源码 (Vite 驱动)
│   ├── pages/                 # 管理后台 + 2026 赛季展示页
│   ├── hooks/                 # useDynamic2026Data 数据引擎
│   └── utils/f1Data.ts        # SQL.js WASM 历史查询逻辑
├── public/                    # 静态资产 (无需编译直接输出)
│   ├── data/                  # 运行时 DB & JSON (同步目的地)
│   └── photos/                # 离线照片资产
└── dist/                      # 核心编译产物 (构建后生成)
```

---

## 🔄 13 步数据处理管线 (`sync_f1_data.py`)

为了确保从 1950 年至今的 F1 数据绝对准确，系统采用了一套高度自动化的 13 步精炼管线。整合了历史争议处理、积分规则演变、中文化翻译、跨端同步及**自动化完整性测试**。

| # | 阶段 | 核心脚本/操作 | 功能说明 | 执行模式 |
|:---:|:---|:---|:---|:---:|
| **1** | **资产本地化** | `pipeline/download_csv_assets.py` | 深度扫描 CSV 中的外部图片链接并本地化。 | 全量 |
| **2** | **安全性备份** | *(内置函数)* | 备份 `f1.db`，保留最近 5 份。 | 全量+轻量 |
| **3** | **架构重建** | `pipeline/create_normalized_db.py` | 清除旧表并基于 CSV 重建 SQLite 规范化架构及索引。 | 全量 |
| **4** | **照片补全** | `pipeline/patch_historical_photos.py` | 模糊名称匹配补全历史车手头像。 | 全量 |
| **5** | **中文化引擎** | `pipeline/add_driver_chinese_names.py` | 注入标准中文译名。 | 全量 |
| **6** | **冲刺赛集成** | `pipeline/import_sprint_data.py` | 导入 2021-2025 冲刺赛明细，原子级关联修复。 | 全量 |
| **7** | **最快圈注入** | `pipeline/import_fastest_lap.py` | 注入 1950-59 最快圈速库，用于精准积分计算。 | 全量 |
| **8** | **特殊事件处理**| `pipeline/apply_special_events.py` | 永久性数据修正（ID 合并、积分加成/扣除）。 | 全量 |
| **9** | **冠军权威重算** | `pipeline/recalculate_championships.cjs` | ⭐ **冠军数据唯一权威来源**，精准处理历史积分规则。 | 全量+轻量 |
| **10** | **统计全聚合** | `pipeline/recalculate_stats.py` | 幂等聚合年度统计。**不覆盖冠军数据**。车队 ID **动态查询**。 | 全量+轻量 |
| **11** | **索引生成** | `pipeline/update_photo_index.py` | 生成 `O(1)` 照片路径索引。 | 全量+轻量 |
| **12** | **同步** | `syncer.py` / `hot_update_nas` | 产物热更新同步（NAS 覆盖 dist/data）。 | 全量+轻量 |
| **13** | **完整性测试** | `tests/test_data_integrity.py` | ⭐ **62 项断言**：Schema / 冠军 / 统计 / 引用完整性。 | 全量+轻量 |

### 核心设计原则

- **冠军数据权威分离**：Step 9 是 WDC/WCC 冠军排名的**唯一来源**。Step 10 负责聚合统计但**不覆盖**冠军数据，消除双算法不一致风险。
- **动态 ID 查询**：Step 10 的车队 ID 映射已从硬编码改为 `SELECT team_id FROM teams` 动态查询，防止 ID 漂移。
- **自动化测试门**：Step 13 在每次管线运行后自动执行 62 项断言，覆盖 19 位历史冠军逐年校验、7 位传奇车手生涯统计核对。测试失败会标记管线状态为 FAILED。
- **换车记录合并**：早期 F1（1950-1968）共用赛车在 Step 3 中通过 `groupby` 预聚合处理。
- **NAS 热更新**：`NAS_MODE` 下 Step 12 直接刷新 `dist/data/`。

---

## 🗄️ 数据库结构 (f1.db)

| 表名 | 行数(约) | 说明 |
|------|---------|------|
| `drivers` | 791 | 车手基本信息 + 中文名 |
| `teams` | ~120 | 标准化车队资料 + 品牌色 |
| `races` | 1,150 | 赛事基本信息（赛季/轮次/赛道）|
| `race_results` | 25,289 | 比赛明细（含 event_id）|
| `sprint_races` | ~35 | 冲刺赛赛事（2021-2025，含 round_number）|
| `sprint_results` | 177 | 冲刺赛结果 |
| `driver_season_stats` | 3,058 | 赛季统计（含冲刺赛积分）|
| `team_season_stats` | 1,038 | 赛季统计 |
| `driver_championships` | 3,052 | 预计算年度车手头衔 |
| `team_championships` | ~250 | 预计算年度车队头衔 |
| `driver_photos` / `team_photos` | - | 视觉资源 URL 映射 |
| `qualifying` | - | 杆位记录 |

### 性能索引（8个，Step 2 自动创建）

```sql
idx_rr_driver        → race_results(driver_id)
idx_rr_race          → race_results(race_id)
idx_rr_team          → race_results(team_id)
idx_rr_position      → race_results(position)      -- WHERE position=1 统计冠军场次
idx_races_season     → races(season)               -- 所有统计查询起点
idx_dss_driver       → driver_season_stats(driver_id)
idx_dss_season       → driver_season_stats(season)
idx_dc_driver_rank   → driver_championships(driver_id, rank)
```

---

## ⚡ 前端性能优化 (`src/utils/f1Data.ts`)

### 数据加载链路 (双轨制)

**1. 历史数据轨道 (`useF1`)**
```
页面初始化
  → fetch /data/f1.db (首次，约 20MB) 或读 IndexedDB 缓存 (后续)
  → sql.js WASM 初始化 SQLite
  → 并行 5 个 SQL 查询 (drivers / teams / race_results / raceInfo / seasonStats)
  → 返回经过 processDrivers() 映射好的完整聚合对象
```

**2. 2026 动态数据轨道 (`useDynamic2026Data`)**
```
页面挂载
  → [本地通道] 极速拉取 /data/results_2026.json 等 (约 8KB) → 毫秒级上屏渲染
  → [远端通道] 后台发起静默 fetch (ghproxy → GitHub 原代仓)
  → 远端数据更近则 静默替换 React State → 界面无缝变动为最新赛果
```

### 关键优化点

| 优化项 | 旧方式 | 新方式 |
|--------|--------|--------|
| 车手冠军次数 | 每行相关子查询（791次） | 预聚合 JOIN（1次） |
| 最新队伍颜色 | 每行相关子查询（791次） | 预聚合 JOIN（1次） |
| 照片路径匹配 | `array.find()` O(n×m) | `Map.has()` O(1) |
| 历史数据库缓存 | 每次下载 f1.db | IndexedDB 持久缓存 |
| **2026 动态数据** | 单一依赖本地/NAS拉取 (易受网络影响) | **`useDynamic2026Data` 本地优先兜底 + `ghproxy` 后台静默同步热重载** |

---

## 🐳 Docker 部署 (NAS)

### Volume 策略

| 路径 | Volume | 说明 |
|------|--------|------|
| `/app/dist/data/` | `f1_data` | f1.db + JSON；热更新目标；首次从镜像初始化 |
| `/app/uploads/` | `f1_uploads` | CSV 上传暂存区 |
| `/app/csv/` | ❌ 无 | 镜像层 + 容器可写层；push → 镜像重建固化 |
| `/var/run/docker.sock` | 宿主机 socket | Watchtower 自更新机制所需 |

### Volume 初始化逻辑 (`entrypoint.sh`)

```
容器启动
  ├── JSON 文件：始终从镜像覆盖 (f1-collector 是权威源)
  └── f1.db：
        ├── Volume 已有 → 保留 (NAS 本地修改优先)
        └── Volume 为空 → 从镜像初始化 (首次部署)
```

### 环境变量 (`compose.yaml`)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GIT_TOKEN` | *(在 .env 设置)* | GitHub PAT，NAS push CSV 回 GitHub |
| `NAS_MODE` | `true` | 激活 NAS 专属同步逻辑 |
| `DOCKER_API_VERSION` | `1.43` | 兼容 NAS 旧 Docker Daemon |
| `DOCKER_IMAGE` | `dudumin/f1express:latest` | 自更新目标镜像 |

### NAS 部署命令

```bash
# 首次部署 / 更新镜像
docker compose pull
docker compose up -d

# 查看日志
docker logs f1express -f
```

---

## 🛠️ Admin Console (`/#/admin-console`)

### 6个 CSV 上传槽

| 上传槽 | 目标文件 | 说明 |
|--------|---------|------|
| 历史赛果 | `race_results.csv` | 1950-2025 比赛结果 (核心) |
| 冲刺赛 | `sprint_results.csv` | 2021-2025 冲刺赛 |
| 赛季大纲 | `race_outline.csv` | 赛次映射 |
| 车队名称 | `team_names.csv` | 标准化映射 |
| 车手照片 | `driver_photos.csv` | 头像 URL（`网址`/`原始来源` 双列保留）|
| 车队照片 | `team_photos.csv` | Logo URL |

**上传流程**：选择文件 → 开始更新 → 服务器触发 10步管线 → 热更新 dist/data/ → git push → 镜像重建

### 系统自动更新

检查更新 → 发现新镜像 → 立即更新并重启 → 前端 30s 倒计时 → 自动刷新

---

## ⚡ 开发工作流

### ⚠️ 代码提交与自动构建准则 (CI/CD 触发原则)

> **核心纪律：两端按需受控触发，严禁为强制构建随意提交无关改动。**

当前仓库对自动化构建流水线 (`docker-build.yml` 和 `android-build.yml`) 设计了极其精准的 `paths-ignore` 机制。**务必遵守以下原则**：
1. **各司其职，独立放跑**：修改运维相关（如 `Dockerfile`、`compose.yaml` 等）原本就只会且只应该触发 Web/Docker 构建。同样道理，某些专属于 Web 逻辑的改动也不应该触发构建厚重的 Android APK。
2. **严禁越界强刷**：当你的代码正好处于某个包的忽略路径中时，说明这次业务并没有波及该平台，构建跳过（Skip）是 **完全正确的预期结果**。**绝对禁止**通过增加空提交 (`git commit --allow-empty`) 或者无意义的地去修改 `package.json` 中的版本号，来强制唤醒并骗取另一个未被涉及平台的流水线工作。这会造成资源极度浪费并快速毁掉版本号语义系统。
3. **慎重执行 Push**：在一切本地审查结束且需要多平台/双端确实产生更新时，再合并提交 Push。

### 本机推送 (`/push`)

```bash
# 自动执行以下步骤（// turbo-all）
npm version patch --no-git-tag-version   # +0.0.1
npm run build                            # 更新 dist/
git add .
git commit -m "feat: ..."
git pull --rebase origin main            # 关键：获取 GHA 自动同步的最新 JSON
git push origin main
# → 触发 docker-build.yml → 新镜像推送到 Docker Hub
```

### f1express 数据更新与采集

```bash
# 修改了 collector 脚本或数据
# 直接在根目录下进行同步
python collector/syncer.py --all
# 或者手动运行特定采集脚本
python collector/scraper_results.py
```

### 本机运行命令

```bash
npm run dev                           # 开发服务器
npm run build                         # 生产构建
python scripts/sync_f1_data.py        # 全量数据同步 (无 NAS_MODE)
python scripts/sync_f1_data.py --force # 强制全量重建

# 数据完整性测试 (62项断言)
python scripts/tests/test_data_integrity.py           # 完整测试
python scripts/tests/test_data_integrity.py --verbose  # 详细输出
python scripts/tests/test_data_integrity.py --quick    # 快速冒烟测试
```

---

##  更新日志

> **⚠️ 更新日志已迁移**
> 
> 本项目完整的迭代更新历史记录（从 v1.0 至最新版全量改动、性能优化、管线升级以及 Bug Fixes 系列变更记录）已迁移至独立的 [docs/CHANGELOG.md](docs/CHANGELOG.md) 文件中维护。

---

## 📚 详细文档索引

| 文档 | 说明 |
|------|------|
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | **系统版本更新日志**（新增特性与 Bug Fix 历史记录） |
| [docs/championship_rules.md](docs/championship_rules.md) | 历史积分规则详解 |
| [docs/sprint_import.md](docs/sprint_import.md) | 冲刺赛数据导入逻辑 |

---

## 📝 Known Limitations & TODOs

- **NAS 端 Step 8 热更新**：`collector/refine_with_stats.py` 已集成，NAS 模式下可直接调用内置模块。
- **两端同时操作 CSV**：靠约定不靠技术锁，修改前务必确认对方没有在操作。
- **driver_photos.csv 双列设计**：`网址` 列存本地路径，`原始来源` 列保留原始 HTTP URL，修改时勿删除 `原始来源` 列。

**文档版本**：2026-03-14 (Integrated v1.0.0)
**项目状态**：✅ 一体化平衡架构方案已落地。采集器内聚，管线全量通过。
**数据审计 (2026-03-14)**：✅ 62 项自动化完整性测试全量通过。

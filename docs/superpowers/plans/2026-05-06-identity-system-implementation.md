# Identity System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为车手与车队建立统一身份主数据，并让前端、pipeline、collector、基线快照都读取同一套名称/别名/连续体定义。

**Architecture:** 在 `src/data/identity` 建立统一 JSON registry；前端通过 TypeScript resolver 使用，Python 通过共享 loader 使用；保留旧接口文件作为兼容层导出，逐步把消费者切到统一源；改造前导出积分基线快照，改造后用回归测试和快照校验确保积分与排名不漂。

**Tech Stack:** TypeScript, Node.js, Python, Vitest, SQLite, JSON registry

---

### Task 1: 建立统一 identity registry 与解析器

**Files:**
- Create: `src/data/identity/drivers.json`
- Create: `src/data/identity/teams.json`
- Create: `src/utils/identity/types.ts`
- Create: `src/utils/identity/normalize.ts`
- Create: `src/utils/identity/registry.ts`
- Create: `src/utils/identity/resolver.ts`
- Create: `tests/unit/utils/identityResolver.test.ts`

- [ ] **Step 1: 写 failing tests**
- [ ] **Step 2: 运行 identity resolver tests，确认失败**
- [ ] **Step 3: 写最小 registry 和 resolver**
- [ ] **Step 4: 再跑 identity resolver tests，确认通过**

### Task 2: 收口前端名称系统到统一源

**Files:**
- Modify: `src/utils/entityMappings.ts`
- Modify: `src/utils/translations.ts`
- Modify: `src/hooks/useCombinedData.ts`
- Modify: `src/utils/f1-data/processors.ts`
- Modify: `src/pages/TeamDetail2026.tsx`
- Modify: `src/pages/DriverDetail2026.tsx`
- Modify: `tests/unit/utils/translations.test.ts`
- Modify: `tests/unit/hooks/useCombinedData.test.ts`

- [ ] **Step 1: 先补 failing tests，覆盖统一源驱动的别名/代码/中英文匹配**
- [ ] **Step 2: 跑相关单测，确认红灯**
- [ ] **Step 3: 用 identity resolver 替换散落映射逻辑**
- [ ] **Step 4: 跑相关单测，确认绿灯**

### Task 3: 收口 Python pipeline / collector 名称系统到统一源

**Files:**
- Create: `scripts/pipeline/lib/identity_loader.py`
- Modify: `scripts/f1_translations.py`
- Modify: `scripts/pipeline/lib/team_mapping.py`
- Modify: `scripts/pipeline/add_driver_chinese_names.py`
- Modify: `collector/processors/calculate_team_stats.py`
- Create: `scripts/tests/test_identity_loader.py`

- [ ] **Step 1: 写 failing tests，覆盖 driver 翻译、team alias、family 归属**
- [ ] **Step 2: 跑 Python tests，确认失败**
- [ ] **Step 3: 实现 JSON loader 和兼容导出**
- [ ] **Step 4: 跑 Python tests，确认通过**

### Task 4: 生成基线快照并接入验证

**Files:**
- Create: `scripts/export_identity_baselines.cjs`
- Create: `docs/baselines/2026-05-06-driver-totals.json`
- Create: `docs/baselines/2026-05-06-team-totals.json`
- Create: `docs/baselines/2026-05-06-driver-standings-view.json`
- Create: `docs/baselines/2026-05-06-team-standings-view.json`
- Create: `tests/unit/utils/exportIdentityBaselines.test.ts`

- [ ] **Step 1: 写 failing tests，覆盖快照结构与关键字段**
- [ ] **Step 2: 跑 baseline exporter tests，确认失败**
- [ ] **Step 3: 实现 exporter 并生成基线文件**
- [ ] **Step 4: 跑 baseline exporter tests，确认通过**

### Task 5: 全量回归与收尾

**Files:**
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 1: 运行 targeted unit/integration tests**
- [ ] **Step 2: 运行 `npm run build`**
- [ ] **Step 3: 运行需要的 Python / Node 验证脚本**
- [ ] **Step 4: 更新 changelog**
- [ ] **Step 5: 整理 diff 并准备提交**

﻿# 更新日志 (Changelog)

记录 `f1express` 的主要版本变更、架构调整与发布说明。

## 2026-09-24: v1.4.3 - 2026 Bahrain GP moved to Sepang + season 2026 calendar sync
- 赛历
  - 删除官方已取消的 Round 4 (Bahrain Sakhir) 与 Round 5 (Saudi Arabian Jeddah)，官方赛历移除这两个席位。
  - Round 16 调整为 Bahrain Grand Prix 在马来西亚 Sepang (Kuala Lumpur) 赛道举办；保留 `slug: bahrain` 以兼容已有 raceResults 历史索引。
  - Round 14–23 全部顺移 -2 roundNumber，整体与 formula1.com 官方页一致（23 站）。
- 数据
  - `data/`、`storage/`、`collector/data/` 三处 schedule_2026.json 全部重写为 23 站版本。
  - `storage/results_2026.json` Round 1–13 站点的 roundNumber 已统一映射至新 schedule。
  - 抓取工具
    - 新增 `collector/spider.py`：从 formula1.com race-result 页面解析正赛成绩表（pos / no / driver / team / laps / time / points），输出至 `collector/results_2026/<slug>_results.json`。同时解析 driver 字符串末尾 3 字符写入 `code` 字段供 exporter 优先使用。
    - `collector/exporters/export_results_json.py` lookup 逻辑改为「code 优先、car number 兜底」，并兼容 substitute slug → carNumber 映射。
  - Round 14 Spain 18 名完整成绩已 spider 抓取并 export 落库；TSU（#22）作为 Reserve 替补登记到 `scripts/f1_substitutions_2026.json`。
- 资源
  - 新增 Round 16 占位资源：`storage/photos/seasons/2026/tracks/malaysia_outline.svg`、`malaysia_detailed.webp`、`flags/Malaysia.svg`（占位复制自 Spain 视觉，后续从 formula1.com 下载 Sepang 官方素材替换）。
  - `vite.config.js` `closeBundle` 阶段递归复制 `storage/photos/` 至 `dist/photos/`，确保生产构建下 `/photos/*` 路径仍可命中（避免静态托管时 404）。
- 代码
  - `src/pages/NewSeasonPage.tsx` `SEASON_2026_GP_TRANSLATIONS` 新增 `'Bahrain Grand Prix': '巴林大奖赛（马来西亚站）'`，移除旧的 `'[CANCELLED] Bahrain Grand Prix'` 条目。
  - `src/utils/f1-data/constants.ts`：`DB_NAME` 自 `F1DatabaseStore_v41` → `F1DatabaseStore_v42`、`DB_VERSION` 自 `1` → `2`，强制升级浏览器 IndexedDB 重建以清除旧赛季残留。
- 验证
  - `scripts/validate_2026_json_readiness.py`：race count=14，all checks passed。
  - `npx vitest run tests/unit tests/integration` — 22/22 通过（包含 `useDynamic2026Data`、`season2026`、`newSeasonPage`）。
  - `npm run pipeline:sync:release` 完整数据重建通过；`npm run verify:dist` 通过；`npm run validate:docker` 通过。
- 备注
  - `npm run validate:team-totals` 失败属既有逻辑偏差（脚本对比 `teams_2026.json::stats.points` 而该字段不包含 2026 live 累加），与本 release 无关，需另立 issue 处理。

## 2026-09-08: v1.4.2 - Driver identity collision fix
- 修复历史车手复用 HAM、RUS、HUL 等代码时，与现役车手发生身份串线的问题。
- 历史车手与 2026 车手关联改为按姓名匹配，避免中文名、车队、头像及积分错误继承。
- 已验证车手积分合并及身份解析回归场景。

## 2026-09-08: v1.4.1 - DB-backed substitute identity resolution
- 语义校准
  - 字段语义统一：`被替换者）退役为可选；新增 `实际驾车人）作为替补行的首要身份标识。` 加入 ` 取值。
  - 替补车手身份解析改为三段查表：substitutes_2026 → drivers_2026 → storage/f1.db 历史（按 code / number 双键）。
- 数据
  - scripts/f1_substitutions_2026.json 新增 team / teamCn 字段（DB 历史表无 team），并补登 Italy R15 #22 与 Netherlands R14 #22 两站（皆为 TSU 顶替）。
  - collector/data/substitutes_2026.json 当前为空（占位 UNK 已退役，由 actualCode + DB 历史直接解析）。
  - Italy P10 与 Netherlands P11 现在显示真实姓名 Yuki Tsunoda (角田裕毅) / Red Bull，并保持 amber 替补角标。
- 代码
  - collector/exporters/export_results_json.py 新增 build_history_driver_index() 从 f1.db 索引 by_code / by_number；resolve_driver() 走三段查表；enrich_result() 优先 actualCode + 注入 replaceReason。
  - src/types/index.ts SubstituteReason 加入 reserve；IRaceResult2026 字段调整为 actualCode 优先。
  - src/pages/RaceDetailPage.tsx Driver 单元格直接渲染 actualCode 解析的真名，角标文案简化为「替补」+ hover 展示 replaceReason。
  - scripts/validate_2026_json_readiness.py actualCode 视为替补车手合法身份标识；replaceReason 接受 reserve。
- 测试
  - tests/integration/frontend/raceDetailPage.test.tsx 更新 mock 至 TSU 真名 + 补一条「渲染真实姓名」断言。118/118 通过。



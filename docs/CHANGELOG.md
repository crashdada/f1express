# 更新日志 (Changelog)

记录 `f1express` 的主要版本变更、架构调整与发布说明。

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



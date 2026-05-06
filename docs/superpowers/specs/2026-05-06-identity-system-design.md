# 统一身份系统设计

日期：2026-05-06

## 目标

为 `f1express` 建立统一的车手、车队身份系统，收口当前分散在前端、pipeline、collector、校验脚本中的名称、代码、别名、翻译与连续体归属规则。

本次设计解决的问题：

- 同一实体在多处维护多份映射，容易漂移
- 中英文名、代码、别名、历史名称缺少单一真源
- 页面展示、运行时合并、历史统计和校验脚本口径不完全一致
- 名称系统改造时，缺少可追溯的积分/排名基线

本次设计明确不做的事：

- 不用 `storage/csv/constructors_full.csv` 覆盖生产统计数据
- 不改变 `/teams` 的产品口径
- 不在第一阶段重写所有历史统计逻辑

## 当前现状

当前身份相关规则分散在以下位置：

- 前端匹配：[src/utils/entityMappings.ts](/D:/oc/f1express/src/utils/entityMappings.ts)
- 前端翻译：[src/utils/translations.ts](/D:/oc/f1express/src/utils/translations.ts)
- pipeline 翻译源：[scripts/f1_translations.py](/D:/oc/f1express/scripts/f1_translations.py)
- pipeline 车队映射：[scripts/pipeline/lib/team_mapping.py](/D:/oc/f1express/scripts/pipeline/lib/team_mapping.py)
- 若干页面、hook、processor 内部的局部匹配与名称兜底

问题不是“缺映射”，而是“同一身份存在多份半重叠定义”。一旦某处新增 alias、修正中文名、调整车队连续体归属，其他消费者不会自动同步。

## 设计原则

1. 单一真源：车手、车队身份只允许有一份主数据源。
2. 展示与统计解耦：展示名称、匹配别名、统计归属必须是不同字段，不允许混用。
3. 连续体显式建模：车队需要显式 `family_id`，不能依赖名字推断历史连续体。
4. 兼容迁移：先建立统一源和兼容层，再逐步替换消费者，不做一次性大爆改。
5. 基线先行：改动前先保存积分与排名快照，作为回归对照。

## 方案选择

### 方案 A：统一身份注册表

新增仓库级身份主数据，前端、pipeline、collector、校验全部读取同一份定义。

优点：

- 结构最干净
- 长期维护成本最低
- 能统一展示、匹配、统计口径

缺点：

- 首轮迁移工作量较大

### 方案 B：保留现有多文件，增加生成器

保留 `translations.ts`、`f1_translations.py`、`team_mapping.py`，用生成器从一个源生成这些文件。

优点：

- 对现有调用点冲击较小

缺点：

- 旧接口层会长期存在
- 仍需约束不得手改生成产物

### 方案 C：车手、车队各自独立系统

分别设计两套主数据和解析逻辑。

优点：

- 初期实现简单

缺点：

- 重复设计
- 同类问题会在两套系统里重复出现

### 结论

采用方案 A。实现上会保留短期兼容层，达到“逻辑统一、迁移渐进”的效果。

## 目标架构

新增身份主数据目录：

- `data/identity/drivers.json`
- `data/identity/teams.json`

新增共享身份解析层：

- `src/utils/identity/`
- `scripts/pipeline/lib/identity/`

运行形态：

1. 主数据文件定义 canonical 实体
2. 共享 resolver 负责名称标准化、别名命中、连续体归属
3. 前端、pipeline、collector、校验通过 resolver 使用身份系统
4. 旧映射文件先变成兼容层，最终删除

## 数据模型

### 车手模型

每条车手记录至少包含：

- `canonical_id`
- `name.en.first`
- `name.en.last`
- `name.zh.first`
- `name.zh.last`
- `display.short`
- `codes`
- `numbers`
- `aliases`
- `nationality`
- `active_ranges`
- `source_keys`

字段职责：

- `display.*`：页面默认展示
- `aliases`：匹配输入名、历史名、重音差异、缩写、常见错误
- `codes`：职业代码，不作为唯一身份键
- `source_keys`：外部源对接键，避免再用展示名做 join

### 车队模型

每条车队记录至少包含：

- `canonical_id`
- `family_id`
- `name.en`
- `name.zh`
- `display.short`
- `aliases`
- `active_ranges`
- `source_keys`

字段职责：

- `canonical_id`：当前品牌/时期实体
- `family_id`：历史连续体统计归属
- `aliases`：历史品牌名、简称、当前品牌变体
- `active_ranges`：处理赛季差异与时期别名

### 关键约束

- 任一 alias 只能命中一个 `canonical_id`
- 任一统计归属只能命中一个 `family_id`
- `code`、中英文名都不能替代 `canonical_id`

## 解析与消费接口

新增统一能力：

- `resolveDriver(input) -> driver`
- `resolveTeam(input, season?) -> team`
- `getDriverMatchKeys(driver) -> string[]`
- `getTeamMatchKeys(team, season?) -> string[]`
- `getDriverDisplay(driver, locale) -> string`
- `getTeamDisplay(team, locale) -> string`
- `getTeamFamily(team, season?) -> family_id`

说明：

- `season` 是一等输入，因为车队历史别名与归属存在赛季依赖
- 解析层负责 normalize、去重音、大小写归一、符号去除、常见 alias 映射
- 消费方不再自行维护 alias 规则

## 基线快照

在改造前，先保存以下只读基线：

- `docs/baselines/2026-05-06-driver-totals.json`
- `docs/baselines/2026-05-06-team-totals.json`
- `docs/baselines/2026-05-06-driver-standings-view.json`
- `docs/baselines/2026-05-06-team-standings-view.json`

快照内容分两层：

1. 统计口径
   - `historical_points`
   - `live_2026_points`
   - `total_points`
2. 页面口径
   - 排名
   - 展示名
   - 代码
   - 当前页面实际输出字段

作用：

- 对比改造前后积分是否漂移
- 定位漂移来自历史值、2026 值，还是名称归并变化
- 作为后续回归测试的固定输入

## 迁移策略

### 阶段 A：建立统一源，不替换生产逻辑

- 建 identity registry
- 建 shared resolver
- 生成基线快照
- 增加唯一性与一致性校验
- 保留旧逻辑作为现网路径

目标：

- 把主数据结构和校验规则先立起来
- 不影响当前页面与统计结果

### 阶段 B：逐个替换消费者

替换顺序：

1. 前端 `entityMappings` / `translations`
2. 前端页面与 hooks 中的临时匹配
3. pipeline `team_mapping` / driver translation 逻辑
4. collector 与运行时结果合并逻辑
5. 校验脚本与发布链路

目标：

- 每一步都可回归验证
- 一旦出现历史别名归并错误，可快速定位到具体阶段

### 阶段 C：删除旧副本

- 删除重复 alias 常量
- 删除散落翻译表
- 删除已被替代的兼容映射

目标：

- 仓库内只剩一套身份源

## 治理规则

后续必须遵守以下规则：

1. 新增或修改车手/车队身份，只改主数据源。
2. 旧兼容层不允许继续手写新增映射。
3. 任一 PR 若新增第二套身份映射源，应视为设计违规。
4. 任一 alias 若发生多实体命中，CI 直接失败。
5. 发布前必须对比基线快照和当前运行结果。

## 错误处理与边界

### 无法唯一命中

若输入同时命中多个实体：

- 运行时展示层使用保守降级，不自动猜测归属
- pipeline / 校验脚本直接失败

### 缺少翻译

若缺少中文名：

- 不阻断 identity 建模
- 允许英文回退
- 但作为主数据完整性告警输出

### 历史同名/近似名

对于重名、父子同名、同姓不同代际：

- 依赖 `canonical_id`、`codes`、时期范围与 `source_keys`
- 禁止只靠展示名唯一识别

## 验证策略

必须新增并长期保留以下验证：

1. 主数据唯一性测试
   - alias 唯一命中
   - canonical/family 唯一性

2. 页面回归测试
   - `/teams`
   - `/drivers`
   - `/new-season`
   - 车手/车队详情页

3. 统计回归测试
   - 车手总积分对比基线
   - 车队总积分对比基线
   - 2026 正赛与冲刺赛归属不变

4. 发布校验
   - identity 数据完整性
   - 当前构建结果与基线快照差异检查

## 完成标准

满足以下条件才算完成：

- 车手、车队统一身份系统已建立
- 前端、pipeline、collector、校验已切到统一源
- 基线快照对比无非预期积分/排名漂移
- `/teams` 继续保持“历史值 + 正确 2026 数据”的产品逻辑
- `constructors_full.csv` 只作为验证，不参与生产覆盖
- 仓库中不再新增第二套手写身份映射

## 风险

1. 历史别名覆盖不完整
   - 影响历史页面、详情页命中率

2. 车队连续体归属争议
   - 不同口径下 `family_id` 可能存在产品定义争议

3. 迁移期兼容层过长
   - 若长期不删除旧接口，会重新产生双源问题

## 建议的下一步

1. 先写基线快照生成器
2. 建立 identity registry 草案
3. 写唯一性校验
4. 再进入实现计划，按阶段替换消费者

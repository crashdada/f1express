# F1 历史冠军与积分规则说明

这份文档只说明项目内当前采用的三套不同口径，避免再把它们混在一起：

1. `race_results.points`
   - 单场比赛结果层的积分。
   - 会保留历史半分、特殊加分等原始赛果口径。
   - 早年某些赛季里，这个字段可能包含只给车手的最快圈奖励。

2. `team_season_stats.points`
   - 车队赛季积分口径。
   - 用于历史展示，以及和 `constructors_full.csv` 做积分对账。
   - 对账时，验证表必须优先取 `outof`，为空时才回退 `points`。

3. `team_championships.points`
   - 车队冠军积分（WCC championship points）口径。
   - 用于决定每年制造商冠军归属。
   - 这套规则和 `team_season_stats.points` 不完全相同。

---

## 车手冠军（WDC）

WDC 使用每年的历史点阵和 Best Results Rule。

- `1950-1959`：前 5 名计分，且有最快圈奖励。
- `1960-2002`：逐步扩展到前 6 名，1960 起无最快圈。
- `2003-2009`：前 8 名计分。
- `2010-2024`：前 10 名计分。
- `2025+`：前 10 名计分，不再有最快圈奖励。

Best Results Rule 只影响“冠军积分”，不改写单场赛果。

---

## 车队赛季积分（team_season_stats）

这是项目里用于历史展示和 CSV 对账的车队积分。

核心约定：

- 数据来源是正式库 `team_season_stats`。
- 正式库必须通过完整流水线重建：
  - `create_normalized_db.py`
  - `import_sprint_data.py`
  - `apply_special_events.py`
  - `recalculate_stats.py`
- 不能拿旧库做局部补丁后就直接视为最新。

验证口径：

- 验证表是 `storage/csv/constructors_full.csv`
- 读取验证表时必须：
  - 优先使用 `outof`
  - `outof` 为空时再使用 `points`

当前项目已确认：

- Ferrari `1958-2025` 的正确验证口径是 `10722.0`
- Ferrari `1984` 应为 `57.5`
- Ferrari `2025` 应为 `398.0`

---

## 车队冠军（WCC）

WCC 不是简单复用 `team_season_stats.points`，必须按冠军规则单独计算。

### 1. 设立时间

- `1950-1957`：没有 WCC
- `1958+`：开始计算 WCC

### 2. 每站计入规则

- `1958-1978`
  - 每场只取该车队表现最好的一台车
- `1979+`
  - 该车队所有可计分赛车都计入

### 3. Best Results Rule

- `1958-1978`
  - WCC 也适用 Best Results Rule
- `1979+`
  - WCC 按全年有效成绩累计，不再套历史最佳场次截断

### 4. 与 WDC 不同的地方

- `1958-1959`
  - 最快圈积分只给车手，不给车队
- `1961`
  - WDC 点阵：`9-6-4-3-2-1`
  - WCC 点阵：`8-6-4-3-2-1`
- `Indianapolis 500`
  - 只给车手积分，不计入 WCC

### 5. 例子：1958 Ferrari

- 车队赛季积分：`57`
- WCC 冠军积分：`40`

原因：

- 单站只取最好一台车
- 最快圈不给车队
- 只取最佳 6 个结果

同年 Vanwall：

- 车队赛季积分：`57`
- WCC 冠军积分：`48`

因此 `1958` 的制造商冠军应是 `Vanwall`，不是 Ferrari。

---

## 当前排错顺序

以后遇到 constructor 问题，统一按这个顺序查：

1. 先确认是 `team_season_stats` 问题，还是 `team_championships` 问题
2. 如果是积分对账，先看 `constructors_full.csv`，并优先取 `outof`
3. 如果是冠军归属，按 WCC 规则单独计算，不直接拿赛季积分替代
4. 先清积分差异，再看排名差异

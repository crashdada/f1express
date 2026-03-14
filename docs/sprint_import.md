# 冲刺赛数据导入文档

## 1. 背景与目的

- **文件**: `csv/sprint_results.csv`
- **数据范围**: 2021-2025年（F1冲刺赛自2021赛季引入）

### 1.2 数据规模
| 指标 | 数值 |
|------|------|
| 总记录数 | 177 条 |
| 年份范围 | 2021-2025 |
| 涉及车手 | 27 人（去重后20人） |
| 涉及赛道 | 11 个 |
| 总积分 | 774.0 分 |

### 1.3 导入目标
将冲刺赛数据导入数据库，与现有正赛数据分离但可关联，用于计算车手累计总积分（正赛+冲刺赛）。

---

## 2. 数据结构分析

### 2.1 冲刺赛表结构
```
冲刺赛表 (177行 × 5列)
├── 年份 (int)        # 2021-2025
├── 赛道 (str)        # 中文赛道名，如"英国 (银石)"
├── 人员列表 (str)     # 车手中文名，可能包含车队信息
├── 真实排名 (int)     # 1-8名（冲刺赛前8名得分）
└── 得分 (int)        # 8-1分（旧规则）或8-1分（新规则）
```

### 2.2 数据样本
| 年份 | 赛道 | 人员列表 | 真实排名 | 得分 |
|------|------|----------|----------|------|
| 2021 | 英国 (银石) | 维斯塔潘 (红牛) | 1 | 3 |
| 2021 | 英国 (银石) | 汉密尔顿 (梅赛德斯) | 2 | 2 |
| 2021 | 英国 (银石) | 博塔斯 (梅赛德斯) | 3 | 1 |

---

## 3. 关联方案设计

### 3.1 关联挑战
1. **无场次ID**: 冲刺赛表缺少`场次`字段，无法通过event_id关联
2. **名称差异**: 使用中文名，数据库使用英文名
3. **独立比赛**: 冲刺赛是独立比赛，非正赛子集

### 3.2 关联策略

#### 3.2.1 年份关联 (100%成功)
```python
# 直接匹配
sprint_season = df_sprint['年份']  # 2021-2025
```

#### 3.2.2 赛道关联 (100%成功)
建立中文名到英文名的映射表：
```python
track_mapping = {
    '英国 (银石)': 'Silverstone',
    '意大利 (蒙扎)': 'Monza',
    '意大利 (伊莫拉)': 'Imola',  # 通过关键词匹配
    '巴西 (圣保罗)': 'São Paulo',
    '比利时 (斯帕)': 'Spa',
    '奥地利 (红牛环)': 'Spielberg',
    '美国 (奥斯汀)': 'Austin',
    '美国 (迈阿密)': 'Miami',
    '阿塞拜疆 (巴库)': 'Baku',
    '卡塔尔 (卢赛尔)': 'Lusail',
    '中国 (上海)': 'Shanghai',
}
```

通过SQL模糊匹配：
```sql
SELECT circuit_id FROM circuits WHERE name LIKE '%Silverstone%';
```

#### 3.2.3 车手关联 (100%成功)
建立中文名到英文名的映射表：
```python
driver_mapping = {
    # 中文名映射 (26个车手)
    '维斯塔潘': ('Max', 'Verstappen'),
    '汉密尔顿': ('Lewis', 'Hamilton'),
    '博塔斯': ('Valtteri', 'Bottas'),
    '里卡多': ('Daniel', 'Ricciardo'),
    '赛恩斯': ('Carlos', 'Sainz'),
    '勒克莱尔': ('Charles', 'Leclerc'),
    '佩雷兹': ('Sergio', 'Perez'),
    '诺里斯': ('Lando', 'Norris'),
    '马格努森': ('Kevin', 'Magnussen'),
    '拉塞尔': ('George', 'Russell'),
    '奥康': ('Esteban', 'Ocon'),
    '阿隆索': ('Fernando', 'Alonso'),
    '斯特罗尔': ('Lance', 'Stroll'),
    '胡肯伯格': ('Nico', 'Hulkenberg'),
    '皮亚斯特里': ('Oscar', 'Piastri'),
    '阿尔本': ('Alexander', 'Albon'),
    '加斯利': ('Pierre', 'Gasly'),
    '周冠宇': ('Guanyu', 'Zhou'),
    '角田': ('Yuki', 'Tsunoda'),
    '角田裕毅': ('Yuki', 'Tsunoda'),
    '德弗里斯': ('Nyck', 'De Vries'),
    '劳森': ('Liam', 'Lawson'),
    '科拉平托': ('Franco', 'Colapinto'),
    '杜汉': ('Jack', 'Doohan'),
    '安东内利': ('Kimi', 'Antonelli'),
    '哈贾尔': ('Isack', 'Hadjar'),
    '贝尔曼': ('Oliver', 'Bearman'),
    '博托莱托': ('Gabriel', 'Bortoleto'),
    '斯托尔': ('Lance', 'Stroll'),
    # 英文名映射 (特殊情况)
    'Bearman': ('Oliver', 'Bearman'),
    'Hadjar': ('Isack', 'Hadjar'),
}
```

**注意**: Excel中有2条记录使用了英文名（Bearman、Hadjar）而非中文名，需要同时支持中英文映射。

通过SQL精确匹配：
```sql
SELECT driver_id FROM drivers 
WHERE first_name = 'Lewis' AND last_name = 'Hamilton';
```

---

## 4. 数据库设计

### 4.1 新建表结构

#### sprint_races 表
```sql
CREATE TABLE sprint_races (
    sprint_race_id INTEGER PRIMARY KEY AUTOINCREMENT,
    season INTEGER NOT NULL,
    round_number INTEGER,           -- 可选：对应正赛轮次
    circuit_id INTEGER,             -- 外键：关联 circuits 表
    race_date TEXT,                 -- 可选：比赛日期
    track_name_cn TEXT,             -- 中文赛道名（用于调试）
    FOREIGN KEY (circuit_id) REFERENCES circuits(circuit_id)
);
```

#### sprint_results 表
```sql
CREATE TABLE sprint_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_race_id INTEGER NOT NULL, -- 外键：关联 sprint_races 表
    driver_id INTEGER NOT NULL,      -- 外键：关联 drivers 表
    team_id INTEGER,                 -- 可选：关联 teams 表
    position INTEGER,                -- 排名
    points REAL,                     -- 得分
    driver_name_cn TEXT,             -- 中文车手名（用于调试）
    FOREIGN KEY (sprint_race_id) REFERENCES sprint_races(sprint_race_id),
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
    FOREIGN KEY (team_id) REFERENCES teams(team_id)
);
```

### 4.2 表关系图
```
circuits ←—— sprint_races ←—— sprint_results ——→ drivers
              ↑                    ↑
              └—— season           └—— points
```

---

## 5. 导入脚本

### 5.1 脚本位置
```
scripts/import_sprint_data.py
```

### 5.2 核心逻辑

#### 步骤1: 创建表
```python
def create_sprint_tables(conn):
    cursor = conn.cursor()
    
    # 删除旧表
    cursor.execute("DROP TABLE IF EXISTS sprint_results")
    cursor.execute("DROP TABLE IF EXISTS sprint_races")
    
    # 创建新表
    cursor.execute('''CREATE TABLE sprint_races (...)''')
    cursor.execute('''CREATE TABLE sprint_results (...)''')
    
    conn.commit()
```

#### 步骤2: 读取并处理数据
```python
def import_sprint_data(conn):
    # 读取CSV
    df_sprint = pd.read_csv('csv/sprint_results.csv')
    
    # 按年份和赛道分组
    grouped = df_sprint.groupby(['年份', '赛道'])
    
    for (season, track_cn), group in grouped:
        # 查找赛道ID
        track_en = track_mapping[track_cn]
        cursor.execute("SELECT circuit_id FROM circuits WHERE name LIKE ?", 
                      (f'%{track_en}%',))
        circuit_id = cursor.fetchone()[0]
        
        # 创建 sprint_race 记录（round_number 自动关联同赛季同赛道的正赛轮次）
        cursor.execute('''
            INSERT INTO sprint_races (season, round_number, circuit_id, track_name_cn)
            VALUES (?, ?, ?, ?)
        ''', (int(season), round_number, circuit_id, track_cn))
        sprint_race_id = cursor.lastrowid
        
        # 处理该场比赛的所有车手
        for _, row in group.iterrows():
            driver_cn = normalize_name(row['人员列表'])
            first_name, last_name = driver_mapping[driver_cn]
            
            # 查找车手ID
            cursor.execute('''
                SELECT driver_id FROM drivers 
                WHERE first_name = ? AND last_name = ?
            ''', (first_name, last_name))
            driver_id = cursor.fetchone()[0]
            
            # 插入结果
            cursor.execute('''
                INSERT INTO sprint_results 
                (sprint_race_id, driver_id, position, points, driver_name_cn)
                VALUES (?, ?, ?, ?, ?)
            ''', (sprint_race_id, driver_id, int(row['真实排名']), 
                  float(row['得分']), driver_cn))
    
    conn.commit()
```

#### 步骤3: 验证导入
```python
def verify_import(conn):
    # 统计比赛场数
    cursor.execute("SELECT COUNT(*) FROM sprint_races")
    race_count = cursor.fetchone()[0]
    
    # 统计结果记录
    cursor.execute("SELECT COUNT(*) FROM sprint_results")
    result_count = cursor.fetchone()[0]
    
    # 按年份统计
    cursor.execute('''
        SELECT season, COUNT(*) as count 
        FROM sprint_races 
        GROUP BY season 
        ORDER BY season
    ''')
```

### 5.3 运行脚本
```bash
python scripts/import_sprint_data.py
```

---

## 6. 导入结果

### 6.1 关联验证结果
| 验证项 | 成功率 | 状态 |
|--------|--------|------|
| 车手关联 | 177/177 (100%) | ✅ |
| 赛道关联 | 24/24 (100%) | ✅ |
| 年份关联 | 24/24 (100%) | ✅ |

### 6.2 各年份分布
| 年份 | 冲刺赛场次 | 记录数 |
|------|------------|--------|
| 2021 | 3 | 9 |
| 2022 | 3 | 24 |
| 2023 | 6 | 48 |
| 2024 | 6 | 48 |
| 2025 | 6 | 48 |

### 6.3 车手冲刺赛积分Top 10
| 排名 | 车手 | 冲刺赛积分 | 参赛场次 |
|------|------|------------|----------|
| 1 | Max Verstappen | 140.0 | 22 |
| 2 | Carlos Sainz | 94.0 | 21 |
| 3 | Lando Norris | 93.0 | 16 |
| 4 | Charles Leclerc | 89.0 | 19 |
| 5 | George Russell | 79.0 | 19 |
| 6 | Lewis Hamilton | 71.0 | 18 |
| 7 | Oscar Piastri | 67.0 | 12 |
| 8 | Sergio Perez | 55.0 | 12 |
| 9 | Pierre Gasly | 12.0 | 4 |
| 10 | Fernando Alonso | 10.0 | 4 |

---

## 7. 总积分计算

### 7.1 查询方法

#### 单个车手总积分
```sql
SELECT 
    d.first_name,
    d.last_name,
    COALESCE((SELECT SUM(points) FROM race_results WHERE driver_id = d.driver_id), 0) as race_points,
    COALESCE((SELECT SUM(points) FROM sprint_results WHERE driver_id = d.driver_id), 0) as sprint_points,
    COALESCE((SELECT SUM(points) FROM race_results WHERE driver_id = d.driver_id), 0) +
    COALESCE((SELECT SUM(points) FROM sprint_results WHERE driver_id = d.driver_id), 0) as total_points
FROM drivers d
WHERE d.driver_id = 28;  -- Lewis Hamilton
```

#### 所有车手排行榜
```sql
SELECT 
    d.first_name,
    d.last_name,
    COALESCE(r.race_pts, 0) as race_points,
    COALESCE(s.sprint_pts, 0) as sprint_points,
    COALESCE(r.race_pts, 0) + COALESCE(s.sprint_pts, 0) as total_points
FROM drivers d
LEFT JOIN (
    SELECT driver_id, SUM(points) as race_pts 
    FROM race_results 
    GROUP BY driver_id
) r ON d.driver_id = r.driver_id
LEFT JOIN (
    SELECT driver_id, SUM(points) as sprint_pts 
    FROM sprint_results 
    GROUP BY driver_id
) s ON d.driver_id = s.driver_id
WHERE r.race_pts IS NOT NULL
ORDER BY total_points DESC;
```

### 7.2 汉密尔顿积分对比

| 赛季 | 正赛积分 | 冲刺赛积分 | 总计 | 变化 |
|------|----------|------------|------|------|
| 2021 | 385.5 | 2.0 | 387.5 | +2.0 |
| 2022 | 233.0 | 7.0 | 240.0 | +7.0 |
| 2023 | 217.0 | 17.0 | 234.0 | +17.0 |
| 2024 | 207.0 | 17.0 | 224.0 | +17.0 |
| 2025 | 135.0 | 28.0 | 163.0 | +28.0 |
| **总计** | **4955.5** | **71.0** | **5026.5** | **+71.0** |

---

## 8. 注意事项

### 8.1 数据完整性
- 所有177条记录均已完整导入，无数据丢失
- 所有记录均成功关联到车手和赛道
- 冲刺赛表中的`人员列表`字段可能包含车队信息，已通过正则表达式解析

### 8.2 特殊情况处理
1. **周冠宇**: 在映射表中特别处理为`('Guanyu', 'Zhou')`
2. **车手名变体**: 
   - `角田`和`角田裕毅`均映射到`('Yuki', 'Tsunoda')`
   - `斯特罗尔`和`斯托尔`均映射到`('Lance', 'Stroll')`

### 8.3 积分规则
- 2021年：前3名得分（3-2-1）
- 2022年起：前8名得分（8-7-6-5-4-3-2-1）
- 数据已按原始Excel中的得分记录，无需额外计算

### 8.4 数据格式注意事项

#### 车手名格式不一致
**问题**: Excel中部分记录使用英文名而非中文名  
**实例**: 2025年比利时站有2条记录使用"Bearman"和"Hadjar"而非"贝尔曼"和"哈贾尔"  
**解决**: 导入脚本同时支持中英文映射，确保所有177条记录都能正确导入

#### 验证记录完整性
导入后务必验证记录数：
```python
# Excel记录数
excel_count = len(df_sprint)  # 应为177

# 数据库记录数
cursor.execute("SELECT COUNT(*) FROM sprint_results")
db_count = cursor.fetchone()[0]  # 应为177

assert db_count == excel_count, f"记录数不匹配: {db_count} vs {excel_count}"
```

### 8.5 与正赛的关系
- 冲刺赛独立存储，不修改现有`race_results`表
- 计算总积分时需要JOIN两个表
- 赛季统计时需分别计算后相加

---

## 9. 后续维护

### 9.1 新增赛季数据
当获得 2026 年及以后的冲刺赛数据时：
1. 在 `csv/sprint_results.csv` 中添加新记录
2. 重新运行全量同步（推荐）：
   ```bash
   python scripts/sync_f1_data.py
   ```
   或仅重跑 Step 4：
   ```bash
   python scripts/import_sprint_data.py
   ```
3. 脚本会自动清空旧表并重新导入所有数据

### 9.2 修正数据
如需修正特定记录：
1. 修改Excel源文件
2. 重新运行导入脚本
3. 或使用SQL直接更新数据库

---

## 10. 文件清单

| 文件 | 说明 |
|------|------|
| `csv/sprint_results.csv` | 源数据文件 |
| `scripts/import_sprint_data.py` | 导入脚本，包含完整的导入逻辑 |
| `public/data/f1.db` | SQLite数据库，含 `sprint_races` 和 `sprint_results` 表 |
| `docs/sprint_import.md` | 本文档 |

---

**创建时间**: 2026年2月
**最后更新**: 2026年3月14日
**状态**: ✅ 已完成并验证（已集成至 f1express 统一架构）

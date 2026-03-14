#!/usr/bin/env python3
"""
规范化 F1 数据库设计
从 Excel 导入数据到规范化的 SQLite 数据库
"""
import pandas as pd
import sqlite3
import os
import json
from datetime import datetime

def normalize_team_name(name):
    """标准化车队名称，对接数据库中的中文主键"""
    if not name or str(name).lower() == 'nan':
        return 'Unknown'
    
    name = str(name).strip()
    lower_name = name.lower()
    
    # 映射到数据库中实际存在的 (中文) 车队名
    if 'red bull' in lower_name:
        return '红牛'
    if 'aston martin' in lower_name or '阿斯顿马丁' in lower_name:
        return '阿斯顿马丁'
    if 'mclaren' in lower_name:
        return '迈凯伦'
    if 'mercedes' in lower_name:
        return '梅赛德斯'
    if 'ferrari' in lower_name:
        return '法拉利'
    if 'alpine' in lower_name:
        return '阿尔派'
    if 'williams' in lower_name:
        return '威廉姆斯'
    if 'sauber' in lower_name and 'bmw' in lower_name:
        return 'BMW Sauber'
    if 'alfa romeo' in lower_name or 'sauber' in lower_name or 'kick sauber' in lower_name:
        return name # Now keep as is
    if 'haas' in lower_name:
        return '哈斯'
    
    return name

def calculate_season_stats(cursor):
    """计算每个赛季的统计数据（包含冲刺赛积分）"""
    print("  计算赛季统计表...")
    
    # 获取所有赛季
    cursor.execute('SELECT season FROM seasons')
    seasons = [row[0] for row in cursor.fetchall()]
    
    # 检查是否存在冲刺赛表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_results'")
    has_sprint = cursor.fetchone() is not None
    
    for season in seasons:
        # 计算车手统计（全赛季聚合）
        # 使用子查询来为每个车手选择该赛季获得积分最多的车队作为代表车队
        if has_sprint and season >= 2021:
            cursor.execute('''
                SELECT 
                    t1.driver_id,
                    (SELECT team_id FROM race_results rr2 JOIN races r2 ON rr2.race_id = r2.race_id 
                     WHERE rr2.driver_id = t1.driver_id AND r2.season = ? 
                     GROUP BY team_id ORDER BY SUM(points) DESC LIMIT 1) as main_team_id,
                    COUNT(*) as races,
                    SUM(CASE WHEN t1.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN t1.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    SUM(t1.points) + COALESCE(sprint.sprint_points, 0) as total_points
                FROM race_results t1
                LEFT JOIN qualifying q ON t1.race_id = q.race_id AND t1.driver_id = q.driver_id
                JOIN races ra ON t1.race_id = ra.race_id
                LEFT JOIN (
                    SELECT spr.driver_id, SUM(spr.points) as sprint_points
                    FROM sprint_results spr
                    JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                    WHERE sr.season = ?
                    GROUP BY spr.driver_id
                ) sprint ON t1.driver_id = sprint.driver_id
                WHERE ra.season = ?
                GROUP BY t1.driver_id
                ORDER BY total_points DESC
            ''', (season, season, season))
        else:
            cursor.execute('''
                SELECT 
                    t1.driver_id,
                    (SELECT team_id FROM race_results rr2 JOIN races r2 ON rr2.race_id = r2.race_id 
                     WHERE rr2.driver_id = t1.driver_id AND r2.season = ? 
                     GROUP BY team_id ORDER BY SUM(points) DESC LIMIT 1) as main_team_id,
                    COUNT(*) as races,
                    SUM(CASE WHEN t1.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN t1.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    SUM(t1.points) as total_points
                FROM race_results t1
                LEFT JOIN qualifying q ON t1.race_id = q.race_id AND t1.driver_id = q.driver_id
                JOIN races ra ON t1.race_id = ra.race_id
                WHERE ra.season = ?
                GROUP BY t1.driver_id
                ORDER BY total_points DESC
            ''', (season, season))
        
        driver_stats = cursor.fetchall()
        for position, stat in enumerate(driver_stats, 1):
            driver_id, team_id, races, wins, podiums, poles, points = stat
            cursor.execute('''
                INSERT OR REPLACE INTO driver_season_stats
                (driver_id, season, team_id, races, wins, podiums, poles, points, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (driver_id, season, team_id, races, wins, podiums, poles, points, position))
        
        # 计算车队统计（正赛 + 冲刺赛）
        if has_sprint and season >= 2021:
            # 包含冲刺赛积分
            cursor.execute('''
                SELECT 
                    r.team_id,
                    COUNT(DISTINCT r.race_id) as races,
                    SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN r.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    SUM(r.points) + COALESCE(sprint.sprint_points, 0) as points
                FROM race_results r
                LEFT JOIN qualifying q ON r.race_id = q.race_id AND r.driver_id = q.driver_id
                JOIN races ra ON r.race_id = ra.race_id
                LEFT JOIN (
                    SELECT d.driver_id, SUM(spr.points) as sprint_points
                    FROM sprint_results spr
                    JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                    JOIN drivers d ON spr.driver_id = d.driver_id
                    WHERE sr.season = ?
                    GROUP BY d.driver_id
                ) sprint ON r.driver_id = sprint.driver_id
                WHERE ra.season = ? AND r.team_id IS NOT NULL
                GROUP BY r.team_id
                ORDER BY points DESC
            ''', (season, season))
        else:
            # 仅正赛积分
            cursor.execute('''
                SELECT 
                    r.team_id,
                    COUNT(DISTINCT r.race_id) as races,
                    SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN r.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    SUM(r.points) as points
                FROM race_results r
                LEFT JOIN qualifying q ON r.race_id = q.race_id AND r.driver_id = q.driver_id
                JOIN races ra ON r.race_id = ra.race_id
                WHERE ra.season = ? AND r.team_id IS NOT NULL
                GROUP BY r.team_id
                ORDER BY points DESC
            ''', (season,))
        
        team_stats = cursor.fetchall()
        for position, stat in enumerate(team_stats, 1):
            team_id, races, wins, podiums, poles, points = stat
            cursor.execute('''
                INSERT OR REPLACE INTO team_season_stats
                (team_id, season, races, wins, podiums, poles, points, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (team_id, season, races, wins, podiums, poles, points, position))
        
        # 更新赛季冠军
        if driver_stats:
            champion_driver_id = driver_stats[0][0]
            cursor.execute('UPDATE seasons SET champion_driver_id = ? WHERE season = ?', (champion_driver_id, season))
        
        if team_stats:
            champion_team_id = team_stats[0][0]
            cursor.execute('UPDATE seasons SET champion_team_id = ? WHERE season = ?', (champion_team_id, season))

def create_normalized_database(csv_dir, db_path):
    """从 CSV 文件创建规范化的 F1 数据库"""
    
    print(f"1. 初始化数据库...")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('PRAGMA foreign_keys = OFF') # Turn off for dropping
    
    # 获取现有表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = [row[0] for row in cursor.fetchall()]
    
    # 仅删除本脚本管理的表，保留其他表（如 fastest_lap_historical）
    managed_tables = [
        'drivers', 'teams', 'circuits', 'seasons', 'races', 'qualifying', 
        'race_results', 'driver_season_stats', 'team_season_stats', 
        'driver_championships', 'team_championships', 'driver_photos', 'team_photos'
    ]
    
    for table in managed_tables:
        if table in existing_tables:
            cursor.execute(f"DROP TABLE {table}")
    
    cursor.execute('PRAGMA foreign_keys = ON')
    
    # 创建所有表
    cursor.executescript('''
        CREATE TABLE drivers (
            driver_id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            first_name_cn TEXT,
            last_name_cn TEXT,
            code TEXT,
            number TEXT,
            nationality TEXT,
            birth_date TEXT,
            birth_place TEXT,
            age INTEGER,
            UNIQUE(first_name, last_name)
        );
        CREATE TABLE teams (
            team_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            name_cn TEXT,
            full_name TEXT,
            team_group TEXT,
            color TEXT,
            UNIQUE(name)
        );
        CREATE TABLE circuits (
            circuit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT,
            UNIQUE(name, country)
        );
        CREATE TABLE seasons (
            season INTEGER PRIMARY KEY,
            champion_driver_id INTEGER,
            champion_team_id INTEGER,
            FOREIGN KEY (champion_driver_id) REFERENCES drivers(driver_id),
            FOREIGN KEY (champion_team_id) REFERENCES teams(team_id)
        );
        CREATE TABLE races (
            race_id INTEGER PRIMARY KEY AUTOINCREMENT,
            season INTEGER NOT NULL,
            round_number INTEGER NOT NULL,
            circuit_id INTEGER,
            race_date TEXT,
            event_id INTEGER,
            url TEXT,
            FOREIGN KEY (season) REFERENCES seasons(season),
            FOREIGN KEY (circuit_id) REFERENCES circuits(circuit_id),
            UNIQUE(season, round_number)
        );
        CREATE TABLE qualifying (
            qualifying_id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            position INTEGER,
            pole_time TEXT,
            FOREIGN KEY (race_id) REFERENCES races(race_id),
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            UNIQUE(race_id, driver_id)
        );
        CREATE TABLE race_results (
            result_id INTEGER PRIMARY KEY AUTOINCREMENT,
            race_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            team_id INTEGER,
            position INTEGER,
            laps INTEGER,
            time TEXT,
            status TEXT,
            points REAL,
            event_id INTEGER,
            FOREIGN KEY (race_id) REFERENCES races(race_id),
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            FOREIGN KEY (team_id) REFERENCES teams(team_id),
            UNIQUE(race_id, driver_id)
        );
        CREATE TABLE driver_season_stats (
            stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            season INTEGER NOT NULL,
            team_id INTEGER,
            races INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            podiums INTEGER DEFAULT 0,
            poles INTEGER DEFAULT 0,
            points REAL DEFAULT 0,
            position INTEGER,
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            FOREIGN KEY (season) REFERENCES seasons(season),
            UNIQUE(driver_id, season)
        );
        CREATE TABLE team_season_stats (
            stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL,
            season INTEGER NOT NULL,
            races INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            podiums INTEGER DEFAULT 0,
            poles INTEGER DEFAULT 0,
            points REAL DEFAULT 0,
            position INTEGER,
            FOREIGN KEY (team_id) REFERENCES teams(team_id),
            FOREIGN KEY (season) REFERENCES seasons(season),
            UNIQUE(team_id, season)
        );
        CREATE TABLE driver_championships (
            championship_id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            season INTEGER NOT NULL,
            points REAL NOT NULL,
            team_id INTEGER,
            rank INTEGER NOT NULL,
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            UNIQUE(driver_id, season)
        );
        CREATE TABLE team_championships (
            championship_id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL,
            season INTEGER NOT NULL,
            points REAL NOT NULL,
            rank INTEGER NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams(team_id),
            UNIQUE(team_id, season)
        );
        CREATE TABLE driver_photos (
            driver_id INTEGER PRIMARY KEY,
            url TEXT,
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
        );
        CREATE TABLE team_photos (
            team_id INTEGER PRIMARY KEY,
            url TEXT,
            FOREIGN KEY (team_id) REFERENCES teams(team_id)
        );

        -- ── 性能索引 ──────────────────────────────────────────────
        -- race_results: 最大表(25k行)，前端全量JOIN的核心路径
        CREATE INDEX idx_rr_driver   ON race_results(driver_id);
        CREATE INDEX idx_rr_race     ON race_results(race_id);
        CREATE INDEX idx_rr_team     ON race_results(team_id);
        CREATE INDEX idx_rr_position ON race_results(position);

        -- races: 按赛季筛选是所有统计查询的起点
        CREATE INDEX idx_races_season ON races(season);

        -- driver_season_stats: driver_id 聚合、season 筛选
        CREATE INDEX idx_dss_driver ON driver_season_stats(driver_id);
        CREATE INDEX idx_dss_season ON driver_season_stats(season);

        -- driver_championships: 冠军排名查找
        CREATE INDEX idx_dc_driver_rank ON driver_championships(driver_id, rank);
    ''')
    
    # 2. 读取 CSV 数据
    print(f"2. 从 {csv_dir} 读取数据...")
    results_path = os.path.join(csv_dir, "race_results.csv")
    outline_path = os.path.join(csv_dir, "race_outline.csv")
    team_mapping_path = os.path.join(csv_dir, "team_names.csv")
    
    df_results_raw = pd.read_csv(results_path)
    df_outline = pd.read_csv(outline_path)

    # --- 预聚合：合并同一车手同一场次的重复行 ---
    # 背景：早期 F1（1950-1968）存在「换车」历史，同一车手同一场次有多行记录
    #   类型A（积分分配型）：两行积分不同（需累加，如 Fangio 1956）
    #   类型B（冗余行型）：两行积分相同为0（重复数据，取一行即可）
    # 处理：先按名次升序排序（保证 first 取到最好名次），再 groupby 累加积分
    def _parse_pos(p):
        try: return int(p)
        except: return 9999
    df_results_raw['_pos_num'] = df_results_raw['名次'].apply(_parse_pos)
    df_results_raw = df_results_raw.sort_values(['年份', '场次', '名', '姓', '_pos_num'])
    df_results = df_results_raw.groupby(['年份', '场次', '名', '姓'], sort=False).agg(
        得分=('得分', 'sum'),       # 累加积分（处理换车共享积分场景）
        名次=('名次', 'first'),     # 已排序，first = 最好名次
        车队=('车队', 'first'),
        圈数=('圈数', 'max'),
        完成时间=('完成时间', 'first'),
        缩写=('缩写', 'first'),
        NO=('NO', 'first'),
    ).reset_index()
    _raw_rows = len(df_results_raw)
    _dedup_rows = len(df_results)
    if _raw_rows != _dedup_rows:
        print(f"   [去重] CSV 原始 {_raw_rows} 行 -> 预聚合后 {_dedup_rows} 行 (合并了 {_raw_rows - _dedup_rows} 条重复记录)")
    # -----------------------------------------------
    
    # 3. 读取车队映射
    print(f"3. 读取车队映射: {team_mapping_path}")
    df_team_mapping = pd.read_csv(team_mapping_path)
    team_name_map = {}
    for idx, row in df_team_mapping.iterrows():
        cols = df_team_mapping.columns
        orig = str(row[cols[0]]).strip() if pd.notna(row[cols[0]]) else ''
        std = str(row[cols[1]]).strip() if pd.notna(row[cols[1]]) else ''
        if orig and std: team_name_map[orig] = std

    # 4. 导入车手
    print("4. 导入车手...")
    drivers_dict = {}
    for _, row in df_results[['名', '姓', '缩写', 'NO']].drop_duplicates().iterrows():
        f, l = str(row['名']).strip(), str(row['姓']).strip()
        c = str(row['缩写']).strip() if pd.notna(row['缩写']) else None
        n = int(row['NO']) if pd.notna(row['NO']) else None
        if f and l:
            cursor.execute('INSERT OR IGNORE INTO drivers (first_name, last_name, code, number) VALUES (?, ?, ?, ?)', (f, l, c, n))
            cursor.execute('SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?', (f, l))
            drivers_dict[(f, l)] = cursor.fetchone()[0]

    print("4.5. 导入车手详细资料...")
    drivers_full_path = os.path.join(csv_dir, "drivers_full.csv")
    if os.path.exists(drivers_full_path):
        df_full = pd.read_csv(drivers_full_path)
        
        # Create mapping from lowercase "first last" to driver_id
        driver_name_map = {}
        cursor.execute("SELECT driver_id, first_name, last_name FROM drivers")
        db_drivers = cursor.fetchall()
        for d_id, f_db, l_db in db_drivers:
            full_db_name = f"{str(f_db).strip()} {str(l_db).strip()}".lower()
            driver_name_map[full_db_name] = d_id
            
        for _, row in df_full.iterrows():
            name_val = str(row.get('name', '')).strip().lower()
            if name_val in driver_name_map:
                d_id = driver_name_map[name_val]
                birth_date = str(row.get('birth_date', '')) if pd.notna(row.get('birth_date')) and str(row.get('birth_date')).lower() != 'nan' else None
                birth_place = str(row.get('birth_place', '')) if pd.notna(row.get('birth_place')) and str(row.get('birth_place')).lower() != 'nan' else None
                age_val = row.get('age')
                age = int(age_val) if pd.notna(age_val) and str(age_val).isdigit() else None
                nation = str(row.get('nation', '')) if pd.notna(row.get('nation')) and str(row.get('nation')).lower() != 'nan' else None
                num_val = row.get('number')
                number = str(num_val).strip() if pd.notna(num_val) and str(num_val).lower() != 'nan' else None
                
                cursor.execute('''
                    UPDATE drivers 
                    SET birth_date = COALESCE(?, birth_date), 
                        birth_place = COALESCE(?, birth_place), 
                        age = COALESCE(?, age), 
                        nationality = COALESCE(nationality, ?), 
                        number = COALESCE(number, ?)
                    WHERE driver_id = ?
                ''', (birth_date, birth_place, age, nation, number, d_id))

    # 5. 导入车队
    print("5. 导入车队...")
    teams_dict = {}
    team_colors = {
        '迈凯伦': '#FF8000',      # rgb(255, 128, 0)
        '红牛': '#3671C1',        # rgb(54, 113, 193)
        '梅赛德斯': '#27F4D2',    # rgb(39, 244, 210)
        '法拉利': '#ED1131',      # rgb(237, 17, 49)
        '阿斯顿马丁': '#229971',  # rgb(34, 153, 113)
        '阿尔派': '#0093CC',      # rgb(0, 147, 204)
        '威廉姆斯': '#1868DB',    # rgb(24, 104, 219)
        '红牛二队': '#6692FF',    # rgb(102, 146, 255)
        '阿尔法托利': '#2B4562',  # AlphaTauri navy blue
        'RB': '#6692FF',
        'Racing Bulls': '#6692FF',
        '索伯': '#52E252',        # rgb(82, 226, 82)
        'Alfa Romeo': '#900000',
        'BMW Sauber': '#00008B',
        'Kick Sauber': '#52E252',
        '哈斯': '#B6BABD',        # rgb(182, 186, 189)
        'Alpine': '#0093CC',
        'McLaren': '#FF8000',
        'Williams': '#1868DB',
        'Ferrari': '#ED1131',
        'Red Bull': '#3671C1',
        '奔驰': '#27F4D2',
        '莲花': '#c5a059',
        'Lotus': '#c5a059',
        '雷诺': '#fff000',
        'Renault': '#fff000',
        '印度力量': '#f596c8',
        'Force India': '#f596c8'
    }
    for raw_team in df_results['车队'].drop_duplicates():
        if pd.isna(raw_team): continue
        std_name = team_name_map.get(str(raw_team), str(raw_team))
        if std_name not in teams_dict:
            color = team_colors.get(std_name, '#e10600')
            cursor.execute('INSERT OR IGNORE INTO teams (name, name_cn, color) VALUES (?, ?, ?)', (std_name, std_name, color))
            cursor.execute('SELECT team_id FROM teams WHERE name = ?', (std_name,))
            teams_dict[std_name] = cursor.fetchone()[0]

    # 6. 导入赛道与赛季
    print("6. 导入赛道与赛季...")
    circuits_dict = {}
    for _, row in df_outline.iterrows():
        cn, co = str(row['赛道']).strip(), str(row['国家地区']).strip()
        if cn:
            cursor.execute('INSERT OR IGNORE INTO circuits (name, country) VALUES (?, ?)', (cn, co))
            cursor.execute('SELECT circuit_id FROM circuits WHERE name = ? AND country = ?', (cn, co))
            circuits_dict[(cn, co)] = cursor.fetchone()[0]
    
    for season in df_results['年份'].unique():
        if pd.notna(season): cursor.execute('INSERT OR IGNORE INTO seasons (season) VALUES (?)', (int(season),))

    # 7. 导入比赛
    print("7. 导入比赛...")
    races_dict = {} 
    global_to_round = {}
    for season in sorted(df_results['年份'].dropna().unique()):
        season_races = df_results[df_results['年份'] == season][['年份', '场次']].drop_duplicates().sort_values('场次')
        for i, (_, row) in enumerate(season_races.iterrows(), 1):
            s, eid = int(row['年份']), int(row['场次'])
            global_to_round[(s, eid)] = i
            url = f"https://www.formula1.com/en/results/{s}/races/{i}"
            
            # 赛道信息
            cid = None
            out_row = df_outline[(df_outline['年份'] == s) & (df_outline['场次'] == eid)]
            if not out_row.empty:
                cid = circuits_dict.get((str(out_row.iloc[0]['赛道']).strip(), str(out_row.iloc[0]['国家地区']).strip()))
            
            cursor.execute('INSERT OR IGNORE INTO races (season, round_number, circuit_id, event_id, url) VALUES (?, ?, ?, ?, ?)', (s, i, cid, eid, url))
            cursor.execute('SELECT race_id FROM races WHERE season = ? AND round_number = ?', (s, i))
            races_dict[(s, i)] = cursor.fetchone()[0]

    # 8. 导入比赛结果
    print("8. 导入比赛结果...")
    for _, row in df_results.iterrows():
        s, eid = int(row['年份']), int(row['场次'])
        f, l = str(row['名']).strip(), str(row['姓']).strip()
        rid = races_dict.get((s, global_to_round.get((s, eid))))
        did = drivers_dict.get((f, l))
        tid = teams_dict.get(team_name_map.get(str(row['车队']), str(row['车队'])))
        
        # 2010年Sauber特殊处理: StatsF1将其记为BMW Sauber (为了平滑过渡及符合参赛商名义)
        if s == 2010 and str(row['车队']) == 'Sauber Ferrari':
            tid = teams_dict.get('BMW Sauber')
        
        if rid and did:
            pos_str = str(row['名次']).strip()
            pos = int(pos_str) if pos_str.isdigit() else None
            status = 'Finished' if pos else ('DSQ' if pos_str == 'DQ' else 'DNF')
            pts = float(row['得分']) if pd.notna(row['得分']) else 0
            laps = int(row['圈数']) if pd.notna(row['圈数']) else 0
            time = str(row['完成时间']).strip() if pd.notna(row['完成时间']) else None
            
            cursor.execute(
                'INSERT OR IGNORE INTO race_results '
                '(race_id, driver_id, team_id, position, laps, time, status, points, event_id) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                (rid, did, tid, pos, laps, time, status, pts, eid)
            )


    # 9. 导入杆位 (从大纲)
    print("9. 导入杆位记录...")
    for _, row in df_outline.iterrows():
        s, eid = int(row['年份']), int(row['场次'])
        f, l = str(row['名']).strip(), str(row['姓']).strip()
        rid = races_dict.get((s, global_to_round.get((s, eid))))
        did = drivers_dict.get((f, l))
        if rid and did:
            cursor.execute('INSERT OR REPLACE INTO qualifying (race_id, driver_id, position, pole_time) VALUES (?, ?, 1, ?)', (rid, did, str(row['Time'])))

    # 10. 导入照片 (从 CSV)
    print("10. 导入照片数据...")
    photo_drivers_path = os.path.join(csv_dir, "driver_photos.csv")
    photo_teams_path = os.path.join(csv_dir, "team_photos.csv")
    
    if os.path.exists(photo_drivers_path):
        df_p_d = pd.read_csv(photo_drivers_path)
        for _, row in df_p_d.iterrows():
            f, l = str(row.get('名', '')).strip(), str(row.get('姓', '')).strip()
            code = str(row.get('缩写', '')).strip()
            url = str(row.get('网址', '')).strip()
            if url and url != 'nan':
                if f and l:
                    cursor.execute('SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?', (f, l))
                else:
                    cursor.execute('SELECT driver_id FROM drivers WHERE code = ?', (code,))
                
                res = cursor.fetchone()
                if res:
                    cursor.execute('INSERT OR REPLACE INTO driver_photos (driver_id, url) VALUES (?, ?)', (res[0], url))
                    
    if os.path.exists(photo_teams_path):
        df_p_t = pd.read_csv(photo_teams_path)
        for _, row in df_p_t.iterrows():
            tn, url = str(row.get('车队', '')).strip(), str(row.get('网址', '')).strip()
            if url and url != 'nan':
                std_tn = normalize_team_name(tn)
                cursor.execute('SELECT team_id FROM teams WHERE name = ?', (std_tn,))
                res = cursor.fetchone()
                if res: cursor.execute('INSERT OR REPLACE INTO team_photos (team_id, url) VALUES (?, ?)', (res[0], url))

    # 11. 计算赛季统计 (初步同步)
    print("11. 计算聚合统计 (Initial Schema Validation)...")
    calculate_season_stats(cursor)
    
    conn.commit()
    conn.close()
    print(f"DONE 基础数据库(纯CSV)构建成功: {db_path}")

if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    create_normalized_database(
        csv_dir=os.path.join(BASE_DIR, "csv"),
        db_path=os.path.join(BASE_DIR, "public", "data", "f1.db")
    )

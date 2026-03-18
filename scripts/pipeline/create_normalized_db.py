#!/usr/bin/env python3
"""
Build the normalized F1 SQLite database from raw CSV source files.

This script creates and populates normalized base tables only.
Season standings and aggregate statistics are derived later by the
recalculation stage.
"""
import pandas as pd
import sqlite3
import os
import json
import sys
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs
from lib.team_mapping import load_team_name_map, resolve_team_name


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
    team_name_map = load_team_name_map(Path(csv_dir))

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
    team_pairs = df_results[['年份', '车队']].dropna().drop_duplicates().sort_values(['年份', '车队'])
    for _, team_row in team_pairs.iterrows():
        raw_team = team_row['车队']
        season = int(team_row['年份'])
        if pd.isna(raw_team):
            continue
        std_name = resolve_team_name(raw_team, team_name_map, season=season)
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
        tid = teams_dict.get(resolve_team_name(row['车队'], team_name_map, teams_dict.keys(), season=s))
        
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
        team_lookup_names = set(teams_dict.keys())
        for _, row in df_p_t.iterrows():
            tn, url = str(row.get('车队', '')).strip(), str(row.get('网址', '')).strip()
            if url and url != 'nan':
                std_tn = resolve_team_name(tn, team_name_map, team_lookup_names)
                cursor.execute('SELECT team_id FROM teams WHERE name = ?', (std_tn,))
                res = cursor.fetchone()
                if res: cursor.execute('INSERT OR REPLACE INTO team_photos (team_id, url) VALUES (?, ?)', (res[0], url))

    # 11. 聚合统计由后续 derive 阶段统一重算，避免和最终规则重复
    print("11. 跳过聚合统计生成，后续 derive 阶段会统一重算...")
    
    conn.commit()
    conn.close()
    print(f"DONE 基础数据库(纯CSV)构建成功: {db_path}")

if __name__ == "__main__":
    ensure_dirs()
    create_normalized_database(
        csv_dir=get_path('csv'),
        db_path=get_path('db')
    )

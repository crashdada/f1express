#!/usr/bin/env python3
"""
将 scraper_results.py 采集的 JSON 成绩导入到 f1.db 数据库。

流程:
  1. 在 races 表创建 2026 R1 记录（如果不存在）
  2. 根据车号匹配 drivers 表中的 driver_id
  3. 根据车手所在车队匹配 team_id
  4. 将成绩写入 race_results 表
"""
import sqlite3
import json
import os
import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(CURRENT_DIR, 'data', 'f1.db')
WEBSITE_DB_PATH = os.path.join(os.path.dirname(CURRENT_DIR), 'public', 'data', 'f1.db')
RESULTS_DIR = os.path.join(CURRENT_DIR, 'results_2026')
DRIVERS_JSON = os.path.join(CURRENT_DIR, 'data', 'drivers_2026.json')
SCHEDULE_JSON = os.path.join(CURRENT_DIR, 'data', 'schedule_2026.json')

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def import_results(db_path, result_file, drivers_json, schedule_json):
    """将单个比赛结果导入数据库"""
    results_data = load_json(result_file)
    drivers_2026 = load_json(drivers_json)
    schedule = load_json(schedule_json)
    
    slug = results_data['slug']
    round_text = results_data['round']
    country = results_data['country']
    
    # 从 schedule 获取 round number 和赛道信息
    race_info = None
    for r in schedule:
        if r.get('slug') == slug:
            race_info = r
            break
    
    if not race_info:
        print(f"[!] 赛历中找不到 slug={slug}")
        return False
    
    round_number = race_info.get('roundNumber', 1)
    
    # 构建 车号 -> 车手信息 映射（从 drivers_2026.json）
    no_to_driver = {}
    for d in drivers_2026:
        num = str(d.get('number', ''))
        no_to_driver[num] = d
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # ============================================
    # Step 1: 确保 circuit 存在
    # ============================================
    location = race_info.get('location', country)
    cur.execute("SELECT circuit_id FROM circuits WHERE country = ?", (location,))
    row = cur.fetchone()
    if row:
        circuit_id = row[0]
    else:
        # 尝试模糊匹配
        cur.execute("SELECT circuit_id, country FROM circuits WHERE country LIKE ?", (f'%{location}%',))
        row = cur.fetchone()
        if row:
            circuit_id = row[0]
            print(f"  赛道模糊匹配: {location} -> {row[1]} (id={circuit_id})")
        else:
            # 创建新赛道
            cur.execute("INSERT INTO circuits (name, country) VALUES (?, ?)",
                       (race_info.get('gpName', f'{country} GP'), location))
            circuit_id = cur.lastrowid
            print(f"  新建赛道: {location} (id={circuit_id})")
    
    # ============================================
    # Step 2: 确保 race 记录存在
    # ============================================
    cur.execute("SELECT race_id FROM races WHERE season = 2026 AND round_number = ?", (round_number,))
    row = cur.fetchone()
    if row:
        race_id = row[0]
        print(f"  已存在 race: season=2026, round={round_number}, race_id={race_id}")
    else:
        # 创建 race 记录
        result_url = results_data.get('url', '')
        cur.execute("""
            INSERT INTO races (season, round_number, circuit_id, race_date, url)
            VALUES (2026, ?, ?, ?, ?)
        """, (round_number, circuit_id, None, result_url))
        race_id = cur.lastrowid
        print(f"  新建 race: season=2026, round={round_number}, race_id={race_id}")
    
    # ============================================
    # Step 3: 删除该 race 已有的 results（防止重复导入）
    # ============================================
    cur.execute("DELETE FROM race_results WHERE race_id = ?", (race_id,))
    deleted = cur.rowcount
    if deleted:
        print(f"  清除旧结果: {deleted} 条")
    
    # ============================================
    # Step 4: 导入成绩
    # ============================================
    imported = 0
    for r in results_data['results']:
        no = str(r['no'])
        pos_str = r['pos']
        points = r['points']
        
        # 从 drivers_2026.json 获取车手信息
        driver_info = no_to_driver.get(no)
        if not driver_info:
            print(f"  [!] 未找到 #{no} 的车手信息")
            continue
        
        first_name = driver_info.get('firstName', '')
        last_name = driver_info.get('lastName', '')
        team_name = driver_info.get('team', '')
        
        # 匹配 driver_id
        cur.execute("SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?",
                    (first_name, last_name))
        row = cur.fetchone()
        if row:
            driver_id = row[0]
        else:
            # 模糊匹配
            cur.execute("SELECT driver_id FROM drivers WHERE first_name LIKE ? AND last_name LIKE ?",
                       (first_name, last_name))
            row = cur.fetchone()
            if row:
                driver_id = row[0]
            else:
                # 新车手，插入
                cur.execute("INSERT INTO drivers (first_name, last_name, number) VALUES (?, ?, ?)",
                           (first_name, last_name, int(no) if no.isdigit() else None))
                driver_id = cur.lastrowid
                print(f"  新建车手: {first_name} {last_name} #{no} (id={driver_id})")
        
        # 匹配 team_id（使用 teams 表中的 name）
        team_id = None
        if team_name:
            # 定义 2026 JSON team name → 数据库 teams.name 映射
            team_db_map = {
                'Mercedes': 'Mercedes',
                'Ferrari': 'Ferrari',
                'Red Bull': 'Red Bull Racing',
                'McLaren': 'McLaren',
                'Aston Martin': 'Aston Martin',
                'Alpine': 'Alpine',
                'Williams': 'Williams',
                'Haas': 'Haas F1 Team',
                'Racing Bulls': 'RB',
                'Audi': 'Sauber',
                'Cadillac': None,  # 新车队
            }
            db_team_name = team_db_map.get(team_name, team_name)
            if db_team_name:
                cur.execute("SELECT team_id FROM teams WHERE name = ?", (db_team_name,))
                row = cur.fetchone()
                if row:
                    team_id = row[0]
                else:
                    cur.execute("SELECT team_id FROM teams WHERE name LIKE ?", (f'%{team_name}%',))
                    row = cur.fetchone()
                    if row:
                        team_id = row[0]
        
        # 解析位置
        if pos_str == 'NC':
            position = None
        else:
            try:
                position = int(pos_str)
            except ValueError:
                position = None
        
        # 解析状态
        if pos_str == 'NC':
            status = 'DNF'
        else:
            status = 'Finished'
        
        # 插入 race_results
        cur.execute("""
            INSERT INTO race_results (race_id, driver_id, team_id, position, laps, time, status, points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (race_id, driver_id, team_id, position, None, None, status, float(points)))
        imported += 1
    
    conn.commit()
    print(f"\n  ✅ 导入完成: {imported} 条成绩 -> race_id={race_id}")
    
    # ============================================
    # Step 5: 验证
    # ============================================
    cur.execute("""
        SELECT rr.position, d.first_name, d.last_name, t.name, rr.points
        FROM race_results rr
        JOIN drivers d ON rr.driver_id = d.driver_id
        LEFT JOIN teams t ON rr.team_id = t.team_id
        WHERE rr.race_id = ?
        ORDER BY CASE WHEN rr.position IS NULL THEN 999 ELSE rr.position END
    """, (race_id,))
    
    print(f"\n  验证 - 2026 R{round_number} {country}:")
    print(f"  {'Pos':>4} | {'Driver':<25} | {'Team':<20} | {'Pts':>3}")
    print(f"  {'-'*60}")
    for row in cur.fetchall():
        pos = row[0] if row[0] else 'NC'
        print(f"  {str(pos):>4} | {row[1]+' '+row[2]:<25} | {(row[3] or '???'):<20} | {row[4]:>5}")
    
    conn.close()
    return True


if __name__ == '__main__':
    result_file = os.path.join(RESULTS_DIR, 'australia_results.json')
    
    if not os.path.exists(result_file):
        print(f"[!] 结果文件不存在: {result_file}")
        exit(1)
    
    print("=" * 60)
    print("F1 Results -> Database Importer")
    print("=" * 60)
    
    # 选择目标数据库（优先用 website 的 db）
    target_db = WEBSITE_DB_PATH if os.path.exists(WEBSITE_DB_PATH) else DB_PATH
    print(f"\n目标数据库: {target_db}")
    
    success = import_results(target_db, result_file, DRIVERS_JSON, SCHEDULE_JSON)
    
    if success:
        # 如果目标是 website db，也同步到 collector 的 db
        if target_db == WEBSITE_DB_PATH and os.path.exists(DB_PATH) and DB_PATH != WEBSITE_DB_PATH:
            print(f"\n同步到 collector db: {DB_PATH}")
            import_results(DB_PATH, result_file, DRIVERS_JSON, SCHEDULE_JSON)
        
        print("\n✅ 全部完成！刷新网页即可看到新的比赛结果。")
    else:
        print("\n❌ 导入失败")

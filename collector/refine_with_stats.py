import sqlite3
import json
import os

import datetime

# 路径配置
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# CI 环境通过 F1_DB_PATH 环境变量覆盖，本地开发回落到相对路径
default_db_path = os.path.join(os.path.dirname(CURRENT_DIR), 'public', 'data', 'f1.db')
DB_PATH = os.environ.get('F1_DB_PATH', default_db_path)
season = datetime.datetime.now().year
SCRAPER_PATH = os.path.join(CURRENT_DIR, 'scraper_drivers.py')
JSON_OUT_PATH = os.path.join(CURRENT_DIR, 'data', f'drivers_{season}.json')
TEAM_JSON_PATH = os.path.join(CURRENT_DIR, 'data', f'teams_{season}.json')

def get_accurate_stats(drivers_list):
    authoritative = {}
    if not os.path.exists(DB_PATH):
        print(f"⚠️ Warning: Database not found at {DB_PATH}. Historical stats will be empty.")
        return {}, {}
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # -------------------------------------------------------------------------
    # 动态数据注入优化 (Dynamic Injection)
    # 不再依赖硬编码列表，而是直接遍历 JSON 中的所有车手进行数据库查询修正
    # -------------------------------------------------------------------------
    
    print(f"Refining stats for {len(drivers_list)} drivers found in JSON...")
    
    for driver in drivers_list:
        code = driver.get('code', 'UNK')
        first = driver.get('firstName', '')
        last = driver.get('lastName', '')
        
        # 尝试通过名字匹配数据库
        rows = []
        
        # 1. 精确匹配
        cur.execute("SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?", (first, last))
        rows = cur.fetchall()
        
        # 2. 如果没找到，尝试模糊匹配 (Case Insensitive)
        if not rows:
             cur.execute("SELECT driver_id FROM drivers WHERE first_name LIKE ? AND last_name LIKE ?", (first, last))
             rows = cur.fetchall()

        if not rows:
            print(f"  [Skip] No DB record for {first} {last} ({code})")
            continue
            
        did = rows[0][0]
        
        # Get championships
        cur.execute("SELECT COUNT(*) FROM driver_championships WHERE driver_id = ? AND rank = 1", (did,))
        championships = cur.fetchone()[0]
        
        # Get aggregate stats
        cur.execute("""
            SELECT SUM(wins), SUM(podiums), SUM(poles), SUM(points), SUM(races), MIN(season)
            FROM driver_season_stats 
            WHERE driver_id = ?
        """, (did,))
        wins, podiums, poles, points, entries, first_year = cur.fetchone()
        
        wins = int(wins or 0)
        podiums = int(podiums or 0)
        poles = int(poles or 0)
        points = round(float(points or 0), 1)
        entries = int(entries or 0)
        first_year = first_year or season
        
        # Peak position
        cur.execute("SELECT MIN(position) FROM driver_season_stats WHERE driver_id = ?", (did,))
        peak_pos = cur.fetchone()[0]
        peak_str = f"P{peak_pos}" if peak_pos and peak_pos > 1 else "世界冠军" if championships > 0 else "Rookie"
        
        avg_points = round(points / entries, 2) if entries > 0 else 0
        win_rate = f"{round((wins / entries) * 100, 1)}%" if entries > 0 else "0%"
        
        # 存入 updates 字典
        authoritative[code] = {
            "wins": wins,
            "podiums": podiums,
            "poles": poles,
            "points": int(points) if points == int(points) else points,
            "entries": entries,
            "championships": championships,
            "signature": {
                "debut": int(first_year),
                "avgPoints": avg_points,
                "peak": peak_str,
                "winRate": win_rate
            }
        }
        
    print(f"  -> Successfully refined stats for {len(authoritative)} drivers.")
    
    # Team stats calculation
    try:
        from calculate_team_stats import get_stats
        teams_authoritative = get_stats()
        print("Team stats calculated from database successfully.")
    except Exception as e:
        print(f"Warning: Failed to calculate team stats from DB ({e}). Falling back to static.")
        teams_authoritative = {}
    
    conn.close()
    return authoritative, teams_authoritative

def update_collector_scraper():
    # 这个脚本将读取 scraper 并注入数据
    # 实际上由于 scraper 是个 python 文件，直接字符串替换比较危险。
    # 我们改为更新生成后的 JSON，并建议用户以后在采集端维护这些“静态”属性。
    pass

if __name__ == "__main__":
    # 1. 运行原有的 scraper
    os.system(f"python {SCRAPER_PATH}")
    
    # 2. 读取生成的 JSON 并回填精准数据
    with open(JSON_OUT_PATH, 'r', encoding='utf-8') as f:
        drivers = json.load(f)
        
    stats, team_stats = get_accurate_stats(drivers)
    
    for d in drivers:
        code = d['code']
        if code in stats:
            s = stats[code]
            d['careerStats'] = {k: v for k, v in s.items() if k != 'signature'}
            d['signatureStats'] = s['signature']
        
    with open(TEAM_JSON_PATH, 'r', encoding='utf-8') as f:
        teams = json.load(f)
        
    for t in teams:
        tid = t['id']
        if tid in team_stats:
            ts = team_stats[tid]
            t['history'] = ts['history']
            t['stats'] = ts['stats']
            
    with open(TEAM_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(teams, f, indent=4, ensure_ascii=False)
        
    # 5. 写回 collector 的 JSON
    with open(JSON_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(drivers, f, indent=4, ensure_ascii=False)
        
    print("Collector's drivers & teams JSON updated with accurate stats and signatures.")

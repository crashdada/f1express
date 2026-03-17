import sqlite3
import json
import os
import sys
import datetime
from pathlib import Path

# Import central config
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "scripts"))
from f1_config import get_path, ensure_dirs

# 路径配置
DB_PATH = str(get_path('db'))
season = datetime.datetime.now().year
SCRAPER_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scraper_drivers.py')

# 获取 JSON 路径
COLLECTOR_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
# Priority: 1. ENV, 2. Storage Root, 3. Collector Local
JSON_BASE = os.environ.get('F1_LIVE_DATA_DIR', str(get_path('live')))
if not JSON_BASE or not os.path.exists(JSON_BASE):
    # Fallback to storage root directly
    JSON_BASE = str(get_path('root')) # Homepage often looks here

JSON_OUT_PATH = os.path.join(JSON_BASE, f'drivers_{season}.json')
TEAM_JSON_PATH = os.path.join(JSON_BASE, f'teams_{season}.json')

def get_accurate_stats(drivers_list):
    authoritative = {}
    if not os.path.exists(DB_PATH):
        print(f"⚠️ Warning: Database not found at {DB_PATH}. Historical stats will be empty.")
        return {}, {}
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    print(f"Refining stats for {len(drivers_list)} drivers found in JSON...")
    
    for driver in drivers_list:
        code = driver.get('code', 'UNK')
        first = driver.get('firstName', '')
        last = driver.get('lastName', '')
        
        cur.execute("SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?", (first, last))
        rows = cur.fetchall()
        if not rows:
             cur.execute("SELECT driver_id FROM drivers WHERE first_name LIKE ? AND last_name LIKE ?", (first, last))
             rows = cur.fetchall()

        if not rows:
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
        
        cur.execute("SELECT MIN(position) FROM driver_season_stats WHERE driver_id = ?", (did,))
        peak_pos = cur.fetchone()[0]
        peak_str = f"P{peak_pos}" if peak_pos and peak_pos > 1 else "世界冠军" if championships > 0 else "Rookie"
        
        avg_points = round(points / entries, 2) if entries > 0 else 0
        win_rate = f"{round((wins / entries) * 100, 1)}%" if entries > 0 else "0%"
        
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
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from calculate_team_stats import get_stats
        teams_authoritative = get_stats()
        print("Team stats calculated from database successfully.")
    except Exception as e:
        print(f"Warning: Failed to calculate team stats from DB ({e}). Falling back to static.")
        teams_authoritative = {}
    
    conn.close()
    return authoritative, teams_authoritative

if __name__ == "__main__":
    if not os.path.exists(JSON_OUT_PATH):
        print(f"JSON not found at {JSON_OUT_PATH}, running scraper first...")
        os.system(f"python {SCRAPER_PATH}")
    
    if not os.path.exists(JSON_OUT_PATH):
        print(f"Error: JSON still not found.")
        sys.exit(1)

    with open(JSON_OUT_PATH, 'r', encoding='utf-8') as f:
        drivers = json.load(f)
        
    stats, team_stats = get_accurate_stats(drivers)
    
    for d in drivers:
        code = d.get('code')
        if code in stats:
            s = stats[code]
            d['careerStats'] = {k: v for k, v in s.items() if k != 'signature'}
            d['signatureStats'] = s['signature']
        
    with open(TEAM_JSON_PATH, 'r', encoding='utf-8') as f:
        teams = json.load(f)
        
    for t in teams:
        tid = t.get('id')
        if tid in team_stats:
            ts = team_stats[tid]
            t['history'] = ts['history']
            t['stats'] = ts['stats']
            
    # Write to target base
    with open(TEAM_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(teams, f, indent=4, ensure_ascii=False)
        
    with open(JSON_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(drivers, f, indent=4, ensure_ascii=False)

    # ALSO write to collector local data for persistence and syncer backup
    try:
        if JSON_BASE != COLLECTOR_DATA_DIR:
            c_drivers_path = os.path.join(COLLECTOR_DATA_DIR, f'drivers_{season}.json')
            c_teams_path = os.path.join(COLLECTOR_DATA_DIR, f'teams_{season}.json')
            with open(c_drivers_path, 'w', encoding='utf-8') as f:
                json.dump(drivers, f, indent=4, ensure_ascii=False)
            with open(c_teams_path, 'w', encoding='utf-8') as f:
                json.dump(teams, f, indent=4, ensure_ascii=False)
            print(f"  -> Also updated collector/data copies.")
    except:
        pass
        
    print(f"Update complete. Written to: {JSON_BASE}")

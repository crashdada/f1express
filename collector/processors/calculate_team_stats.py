import sqlite3
import json
import os
import sys
from pathlib import Path

# Import central config
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "scripts"))
from f1_config import get_path

DB_PATH = str(get_path('db'))

def get_stats():
    # 1. 加载 2026 实时数据用于累加 (复用现有的 JSON 数据)
    live_results_path = os.path.join(os.path.dirname(DB_PATH), "results_2026.json")
    live_points = {} # {team_id: points}
    
    if os.path.exists(live_results_path):
        try:
            with open(live_results_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for race in data:
                    for res in race.get('results', []):
                        team_id = res.get('team', '').lower().replace(' ', '_')
                        # 兼容处理
                        if team_id == 'mercedes': team_id = 'mercedes'
                        elif 'ferrari' in team_id: team_id = 'ferrari'
                        elif 'red_bull' in team_id: team_id = 'red_bull'
                        elif 'mclaren' in team_id: team_id = 'mclaren'
                        elif 'williams' in team_id: team_id = 'williams'
                        elif 'audi' in team_id: team_id = 'audi'
                        elif 'haas' in team_id: team_id = 'haas'
                        elif 'alpine' in team_id: team_id = 'alpine'
                        elif 'aston_martin' in team_id: team_id = 'aston_martin'
                        elif 'racing_bulls' in team_id or 'rb' == team_id: team_id = 'rb'
                        
                        live_points[team_id] = live_points.get(team_id, 0) + res.get('points', 0)
                    
                    # 别忘了冲刺赛
                    for res in race.get('sprintResults', []):
                        team_id = res.get('team', '').lower().replace(' ', '_')
                        if 'racing_bulls' in team_id or 'rb' == team_id: team_id = 'rb'
                        live_points[team_id] = live_points.get(team_id, 0) + res.get('points', 0)
        except Exception as e:
            print(f"Warning: Failed to parse 2026 live results for stats ({e})")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Mapping of 2026 IDs
    mapping = {
        "ferrari": ["Ferrari", "法拉利"],
        "red_bull": ["Red Bull Racing", "Red Bull", "红牛", "红牛车队"],
        "mercedes": ["Mercedes", "Mercedes-AMG", "梅赛德斯", "梅赛德斯-奔驰"],
        "mclaren": ["McLaren", "迈凯伦"],
        "aston_martin": ["Aston Martin", "Racing Point", "Force India", "Jordan", "Spyker", "Midland", "阿斯顿马丁", "阿斯顿·马丁"],
        "audi": ["Sauber", "Alfa Romeo", "BMW Sauber", "索伯", "阿尔法·罗密欧", "阿尔法罗密欧"],
        "williams": ["Williams", "威廉姆斯"],
        "alpine": ["Alpine", "Renault", "Lotus F1", "Benetton", "Toleman", "阿尔派", "雷诺"],
        "haas": ["Haas F1 Team", "Haas", "哈斯"],
        "rb": ["RB", "AlphaTauri", "Toro Rosso", "Minardi", "维萨RB", "Racing Bulls"],
        "cadillac": ["Cadillac"]
    }
    
    results = {}
    
    for team_id, names in mapping.items():
        if not names:
            results[team_id] = {
                "history": {"championships": 0, "wins": 0, "podiums": 0, "poles": 0, "entries": 0, "firstEntry": "2026"},
                "stats": {"points": live_points.get(team_id, 0), "rank": 0, "wins": 0, "podiums": 0}
            }
            continue
            
        placeholders = ', '.join(['?' for _ in names])
        cur.execute(f"SELECT team_id FROM teams WHERE name IN ({placeholders})", names)
        team_ids = [row[0] for row in cur.fetchall()]
        
        if not team_ids:
            results[team_id] = {
                "history": {"championships": 0, "wins": 0, "podiums": 0, "poles": 0, "entries": 0, "firstEntry": "2026"},
                "stats": {"points": live_points.get(team_id, 0), "rank": 0, "wins": 0, "podiums": 0}
            }
            continue

        id_placeholders = ', '.join(['?' for _ in team_ids])

        # Historical Championships
        cur.execute(f"SELECT COUNT(*) FROM team_championships WHERE team_id IN ({id_placeholders}) AND rank = 1", team_ids)
        championships = cur.fetchone()[0] or 0
            
        # Historical Stats
        cur.execute(f"SELECT SUM(wins), SUM(podiums), SUM(poles), SUM(races), SUM(points) FROM team_season_stats WHERE team_id IN ({id_placeholders})", team_ids)
        row = cur.fetchone()
        wins, podiums, poles, entries, hist_points = row if row and row[0] is not None else (0, 0, 0, 0, 0)
        
        # First entry year
        cur.execute(f"SELECT MIN(season) FROM team_season_stats WHERE team_id IN ({id_placeholders})", team_ids)
        first_year = cur.fetchone()[0] or 2026
        
        # COMBINED TOTAL (Historical + Live 2026)
        total_pts = float(hist_points or 0) + float(live_points.get(team_id, 0))
        
        results[team_id] = {
            "history": {
                "championships": int(championships),
                "wins": int(wins),
                "podiums": int(podiums),
                "poles": int(poles),
                "entries": int(entries),
                "firstEntry": str(first_year)
            },
            "stats": {"points": round(total_pts, 1), "rank": 0, "wins": int(wins), "podiums": int(podiums)}
        }
    
    conn.close()
    return results

if __name__ == "__main__":
    res = get_stats()
    print(json.dumps(res, indent=4, ensure_ascii=False))

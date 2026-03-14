import sqlite3
import json
import os

# 路径配置
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(os.path.dirname(CURRENT_DIR), 'public', 'data', 'f1.db')

def get_stats():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Mapping of 2026 IDs to historical names in database (name column in teams table)
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
        "rb": ["RB", "AlphaTauri", "Toro Rosso", "Minardi", "维萨RB"],
        "cadillac": []
    }
    
    results = {}
    
    for team_id, names in mapping.items():
        if not names:
            results[team_id] = {
                "history": {"championships": 0, "wins": 0, "podiums": 0, "poles": 0, "entries": 0, "firstEntry": "2026"},
                "stats": {"points": 0, "rank": 0, "wins": 0, "podiums": 0}
            }
            continue
            
        placeholders = ', '.join(['?' for _ in names])
        
        # Get team_ids for these names
        cur.execute(f"SELECT team_id FROM teams WHERE name IN ({placeholders})", names)
        team_ids = [row[0] for row in cur.fetchall()]
        
        if not team_ids:
            results[team_id] = {
                "history": {"championships": 0, "wins": 0, "podiums": 0, "poles": 0, "entries": 0, "firstEntry": "2026"},
                "stats": {"points": 0, "rank": 0, "wins": 0, "podiums": 0}
            }
            continue

        id_placeholders = ', '.join(['?' for _ in team_ids])

        # Championship Count
        try:
            cur.execute(f"""
                SELECT COUNT(*) FROM team_championships
                WHERE team_id IN ({id_placeholders}) AND rank = 1
            """, team_ids)
            championships = cur.fetchone()[0]
        except:
            championships = 0
            
        # Stats from season_stats for accuracy (includes my sprint/2021 corrections)
        cur.execute(f"""
            SELECT SUM(wins), SUM(podiums), SUM(poles), SUM(races)
            FROM team_season_stats
            WHERE team_id IN ({id_placeholders})
        """, team_ids)
        row = cur.fetchone()
        wins, podiums, poles, entries = row if row and row[0] is not None else (0, 0, 0, 0)
        
        # First entry year
        cur.execute(f"""
            SELECT MIN(season) FROM team_season_stats
            WHERE team_id IN ({id_placeholders})
        """, team_ids)
        first_year = cur.fetchone()[0] or 2026
        
        results[team_id] = {
            "history": {
                "championships": championships,
                "wins": int(wins),
                "podiums": int(podiums),
                "poles": int(poles),
                "entries": int(entries),
                "firstEntry": str(first_year)
            },
            "stats": {"points": 0, "rank": 0, "wins": 0, "podiums": 0}
        }
    
    conn.close()
    return results

if __name__ == "__main__":
    res = get_stats()
    print(json.dumps(res, indent=4))

import pandas as pd
import json
import os
import re
from pathlib import Path

# Mapping from import_sprint_data.py
TRACK_MAPPING = {
    "英国 (银石)": "Silverstone",
    "意大利 (蒙扎)": "Monza",
    "意大利 (伊莫拉)": "Enzo",
    "巴西 (圣保罗)": "Carlos Pace",
    "比利时 (斯帕)": "Spa",
    "奥地利 (红牛环)": "Spielberg",
    "美国 (奥斯汀)": "Austin",
    "美国 (迈阿密)": "Miami",
    "阿塞拜疆 (巴库)": "Baku",
    "卡塔尔 (卢赛尔)": "Lusail",
    "中国 (上海)": "Shanghai",
}

DRIVER_MAPPING = {
    "维斯塔潘": ("Max", "Verstappen"),
    "汉密尔顿": ("Lewis", "Hamilton"),
    "博塔斯": ("Valtteri", "Bottas"),
    "里卡多": ("Daniel", "Ricciardo"),
    "赛恩斯": ("Carlos", "Sainz"),
    "勒克莱尔": ("Charles", "Leclerc"),
    "佩雷兹": ("Sergio", "Perez"),
    "诺里斯": ("Lando", "Norris"),
    "马格努森": ("Kevin", "Magnussen"),
    "拉塞尔": ("George", "Russell"),
    "奥康": ("Esteban", "Ocon"),
    "阿隆索": ("Fernando", "Alonso"),
    "斯特罗尔": ("Lance", "Stroll"),
    "斯托尔": ("Lance", "Stroll"),
    "霍肯伯格": ("Nico", "Hulkenberg"),
    "胡肯伯格": ("Nico", "Hulkenberg"),
    "皮亚斯特里": ("Oscar", "Piastri"),
    "阿尔本": ("Alexander", "Albon"),
    "加斯利": ("Pierre", "Gasly"),
    "周冠宇": ("Guanyu", "Zhou"),
    "角田": ("Yuki", "Tsunoda"),
    "角田裕毅": ("Yuki", "Tsunoda"),
    "德弗里斯": ("Nyck", "De Vries"),
    "劳森": ("Liam", "Lawson"),
    "科拉平托": ("Franco", "Colapinto"),
}

def migrate_sprint():
    csv_dir = Path('storage/csv')
    sprint_path = csv_dir / 'sprint_results.csv'
    meta_path = csv_dir / 'races_meta.csv'
    results_json_path = Path('storage/results_2026.json')
    
    if not sprint_path.exists() or not meta_path.exists():
        print("Missing required CSV files")
        return

    # 1. Load data
    df_sprint = pd.read_csv(sprint_path)
    df_meta = pd.read_csv(meta_path)
    
    # Precompute track to round mapping
    meta_map = {}
    for _, m in df_meta.iterrows():
        # Match using the country or common name part of the track string
        # Historical sprint use things like "英国 (银石)"
        meta_map[(int(m['year']), m['country'].lower())] = int(m['round'])
    
    # 2. Extract and refine historical
    new_rows = []
    
    for _, row in df_sprint.iterrows():
        year = int(row['year'])
        track_cn = row['track']
        raw_driver = str(row['driver']).strip()
        
        # Parse driver name (handle "Name (Team)")
        driver_match = re.match(r"(.+?)(?:\s*\((.+?)\))?$", raw_driver)
        driver_cn = driver_match.group(1).strip() if driver_match else raw_driver
        
        d_tuple = DRIVER_MAPPING.get(driver_cn)
        f_name = d_tuple[0] if d_tuple else driver_cn
        l_name = d_tuple[1] if d_tuple else ""
        
        # Round mapping logic
        # Simple heuristic: find by country name if track_cn has it
        target_round = None
        for cn_pattern, en_keyword in TRACK_MAPPING.items():
            if en_keyword in track_cn or (hasattr(track_cn, '__contains__') and cn_pattern.split(' ')[0] in track_cn):
                # Try to find meta entry
                # (This is imprecise, but better than nothing for a one-time migration)
                pass

        # Since we have races_meta, we should ideally use that. 
        # But for historical, let's just keep the year and try to find the round.
        # Actually, it's easier to use a manual map for historical sprint locations
        hist_loc_to_round = {
            (2021, "英国 (银石)"): 10,
            (2021, "意大利 (蒙扎)"): 14,
            (2021, "巴西 (圣保罗)"): 19,
            (2022, "意大利 (伊莫拉)"): 4,
            (2022, "奥地利 (红牛环)"): 11,
            (2022, "巴西 (圣保罗)"): 21,
            (2023, "阿塞拜疆 (巴库)"): 4,
            (2023, "奥地利 (红牛环)"): 10,
            (2023, "比利时 (斯帕)"): 13,
            (2023, "卡塔尔 (卢赛尔)"): 18,
            (2023, "美国 (奥斯汀)"): 19,
            (2023, "巴西 (圣保罗)"): 21,
            (2024, "中国 (上海)"): 5,
            (2024, "美国 (迈阿密)"): 6,
            (2024, "奥地利 (红牛环)"): 11,
            (2024, "美国 (奥斯汀)"): 19,
            (2024, "巴西 (圣保罗)"): 21,
            (2024, "卡塔尔 (卢赛尔)"): 23,
            (2025, "中国 (上海)"): 3,
            (2025, "美国 (迈阿密)"): 5,
            (2025, "比利时 (斯帕)"): 12,
            (2025, "美国 (奥斯汀)"): 19,
            (2025, "巴西 (圣保罗)"): 21,
            (2025, "卡塔尔 (卢赛尔)"): 23,
        }
        
        target_round = hist_loc_to_round.get((year, track_cn))
        
        new_rows.append({
            'year': year,
            'round': target_round,
            'position': row['position'],
            'number': None,
            'first_name': f_name,
            'last_name': l_name,
            'code': None,
            'team': None,
            'points': row['points'],
            'status': 'Finished'
        })
    
    # 3. Add 2026 from JSON
    if results_json_path.exists():
        with open(results_json_path, 'r', encoding='utf-8') as f:
            res_2026 = json.load(f)
            
        for event in res_2026:
            sprint_res = event.get('sprintResults')
            if sprint_res:
                for r in sprint_res:
                    new_rows.append({
                        'year': 2026,
                        'round': event.get('round'),
                        'position': r.get('pos'),
                        'number': r.get('number'),
                        'first_name': r.get('firstName'),
                        'last_name': r.get('lastName'),
                        'code': r.get('code'),
                        'team': r.get('team'),
                        'points': r.get('points'),
                        'status': r.get('status', 'Finished')
                    })
                    
    # 4. Save
    df_new = pd.DataFrame(new_rows)
    df_new.to_csv(csv_dir / 'sprint_results.csv', index=False, encoding='utf-8')
    print(f"Refactor to {len(df_new)} rows complete.")

if __name__ == "__main__":
    migrate_sprint()

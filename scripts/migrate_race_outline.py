import pandas as pd
import json
import os
from pathlib import Path

def migrate():
    csv_dir = Path('storage/csv')
    outline_path = csv_dir / 'race_outline.csv'
    schedule_json_path = Path('storage/schedule_2026.json')
    
    if not outline_path.exists():
        print("Error: race_outline.csv not found")
        return

    # 1. Load existing outline
    df_outline = pd.read_csv(outline_path)
    
    # 2. Extract meta data for historical races
    # Columns: year,round,circuit,pole_time,first_name,last_name,code,country,start_date,end_date
    meta_rows = []
    quali_rows = []
    
    for _, row in df_outline.iterrows():
        # Meta
        meta_rows.append({
            'year': row['year'],
            'round': row['round'],
            'circuit': row['circuit'],
            'gp_name': f"{row['country']} Grand Prix",  # Fallback for historical
            'country': row['country'],
            'location': None,
            'dates': f"{row['start_date']} - {row['end_date']}" if pd.notna(row['start_date']) else None,
            'slug': None,
            'url': None,
            'status': 'Finished'
        })
        
        # Quali (Historical only has Pole for now)
        quali_rows.append({
            'year': row['year'],
            'round': row['round'],
            'position': 1,
            'first_name': row['first_name'],
            'last_name': row['last_name'],
            'code': row['code'],
            'pole_time': row['pole_time']
        })

    # 3. Load 2026 Schedule JSON if exists
    if schedule_json_path.exists():
        with open(schedule_json_path, 'r', encoding='utf-8') as f:
            schedule_2026 = json.load(f)
        
        for event in schedule_2026:
            meta_rows.append({
                'year': 2026,
                'round': event.get('roundNumber'),
                'circuit': event.get('slug', '').replace('-', ' ').title(), # Approximation
                'gp_name': event.get('gpName'),
                'country': event.get('country'),
                'location': event.get('location'),
                'dates': event.get('dates'),
                'slug': event.get('slug'),
                'url': event.get('url'),
                'status': event.get('status', 'Planned')
            })

    # 4. Save to new CSVs
    df_meta = pd.DataFrame(meta_rows).drop_duplicates(['year', 'round'])
    df_quali = pd.DataFrame(quali_rows)
    
    df_meta.to_csv(csv_dir / 'races_meta.csv', index=False, encoding='utf-8')
    df_quali.to_csv(csv_dir / 'qualifying_results.csv', index=False, encoding='utf-8')
    
    print(f"Created races_meta.csv ({len(df_meta)} rows)")
    print(f"Created qualifying_results.csv ({len(df_quali)} rows)")

if __name__ == "__main__":
    migrate()

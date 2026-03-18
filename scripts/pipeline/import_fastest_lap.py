#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 csv/fastest_lap_historical.csv 导入 DB，建立 fastest_lap_historical 表
"""
import sqlite3
import csv
import os
import sys
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs


def resolve_fastest_lap_csv():
    csv_dir = get_path('csv')
    candidates = [
        csv_dir / "fastest_lap_historical.csv",
        csv_dir / "fastest_lap_1950_1959.csv",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]

def import_fastest_laps(csv_path, db_path):
    if not os.path.exists(csv_path):
        print(f"  [Error] {csv_path} 不存在。")
        return False

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='fastest_lap_historical'")
    table_exists = cur.fetchone()
    if table_exists:
        cur.execute("SELECT COUNT(*) FROM fastest_lap_historical")
        count = cur.fetchone()[0]
        if count > 0:
            print(f"[SKIP] fastest_lap_historical 表已存在且已有 {count} 条数据，跳过导入。")
            conn.close()
            return True

    # 建表 (仅在不存在或为空时)
    cur.execute("DROP TABLE IF EXISTS fastest_lap_historical")
    cur.execute("""
        CREATE TABLE fastest_lap_historical (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            season INTEGER NOT NULL,
            round_number INTEGER NOT NULL,
            race_id INTEGER,
            driver_id INTEGER NOT NULL,
            fl_points REAL NOT NULL DEFAULT 1.0,
            notes TEXT,
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            FOREIGN KEY (race_id) REFERENCES races(race_id)
        )
    """)
    print("[OK] 创建 fastest_lap_historical 表")

    success = 0
    failed = 0

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            season = int(row['season'])
            round_num = int(row['round'])
            driver_id = row['driver_id']
            fl_points = float(row['fl_points']) if row['fl_points'] else 0
            note = row['note']
            
            if not driver_id:
                failed += 1
                continue
            
            if fl_points <= 0:
                continue
            
            driver_id = int(driver_id)
            
            # 查找 race_id
            cur.execute(
                "SELECT race_id FROM races WHERE season = ? AND round_number = ?",
                (season, round_num)
            )
            race_row = cur.fetchone()
            race_id = race_row[0] if race_row else None
            
            cur.execute("""
                INSERT INTO fastest_lap_historical (season, round_number, race_id, driver_id, fl_points, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (season, round_num, race_id, driver_id, fl_points, note))
            success += 1

    conn.commit()
    print(f"\n[OK] 导入完成: 成功 {success} 条, 条数失败 {failed}")
    conn.close()
    return True

if __name__ == "__main__":
    ensure_dirs()
    import_fastest_laps(
        csv_path=resolve_fastest_lap_csv(),
        db_path=get_path('db')
    )
